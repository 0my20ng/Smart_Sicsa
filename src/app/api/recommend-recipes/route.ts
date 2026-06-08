import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import * as cheerio from "cheerio";
import { RecommendRequest, RecipeItem, RecipeListResponse } from "./types";
import { SEARCH_PROMPT, buildRecipeAnalysisPrompt } from "./prompts";

export const maxDuration = 60; // 서버리스 환경 최대 실행 시간 허용

const API_KEY = process.env.GOOGLE_API_KEY || "";
// 최신 @google/genai SDK 사용 (Python google-genai와 동일 버전)
const ai = new GoogleGenAI({ apiKey: API_KEY });

function runMockFallback(reason: string, query: string, ingredients: string[]): RecipeListResponse {
  console.warn(`Mock Fallback 실행 이유: ${reason}`);
  const mockItems: RecipeItem[] = [
    {
      title: `[예시] ${query || "김치찌개"} 황금레시피 (검색 연결 확인 필요)`,
      ingredients,
      missingIngredients: ["돼지고기", "대파"],
      description: `검색 과정 중 오류가 발생하여 임시 예시를 노출합니다. (${reason})`,
      link: "https://www.10000recipe.com/",
      imageUrl: undefined,
    },
  ];
  return { recipes: mockItems, count: 1, recommendedMenus: [query || "김치찌개"] };
}

export async function POST(req: Request) {
  let effectiveIngredients: string[] = [];
  let queryPart = "";

  try {
    if (!API_KEY) {
      throw new Error("GOOGLE_API_KEY 환경 변수가 설정되어 있지 않습니다.");
    }

    const body: RecommendRequest = await req.json();
    effectiveIngredients = body.ingredients || [];

    if (effectiveIngredients.length === 0) {
      return NextResponse.json(
        { detail: "재료를 먼저 입력해주세요. 냉장고 재료를 추가한 후 검색해 보세요." },
        { status: 400 }
      );
    }

    const ingredientsStr = effectiveIngredients.join(", ");
    queryPart = body.query ? body.query.trim() : "";

    console.log(`[Recommend API] Step 1: Gemini 구글 검색 호출 | 재료: [${ingredientsStr}] | 키워드: '${queryPart}'`);

    const searchPrompt = SEARCH_PROMPT(ingredientsStr, queryPart);

    // 최신 SDK: google_search 도구 설정 (Python과 동일 방식)
    const searchResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: searchPrompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // groundingMetadata에서 진짜 소스 추출 (최신 SDK 경로)
    const googleSources: { title: string; link: string }[] = [];
    try {
      const candidates = searchResponse.candidates;
      if (candidates && candidates.length > 0) {
        const metadata = candidates[0].groundingMetadata;
        if (metadata && metadata.groundingChunks) {
          for (const chunk of metadata.groundingChunks) {
            if (chunk.web) {
              googleSources.push({
                title: chunk.web.title || "제목 없음",
                link: chunk.web.uri || "",
              });
            }
          }
        }
      }
      console.log(`[Recommend API] Google Grounding에서 진짜 소스 ${googleSources.length}개 추출 성공`);
    } catch (ex) {
      console.error(`[Recommend API] Metadata 소스 추출 실패: ${ex}`);
    }

    if (googleSources.length === 0) {
      return NextResponse.json(runMockFallback("구글 검색 결과 소스를 가져오지 못했습니다. (Grounding 실패)", queryPart, effectiveIngredients));
    }

    const recipes: RecipeItem[] = [];
    const recommendedMenus: string[] = [];
    let has429Error = false;

    // 최대 5개의 구글 검색 결과 순차 스크래핑
    for (let i = 0; i < Math.min(5, googleSources.length); i++) {
      const src = googleSources[i];
      console.log(`[${i + 1}/5] 스크래핑 시도: ${src.link}`);

      let bodyText = "";
      let finalUrl = src.link;
      let thumbnail: string | undefined = undefined;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const pageRes = await fetch(src.link, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (pageRes.ok) {
          finalUrl = pageRes.url;
          const html = await pageRes.text();
          const $ = cheerio.load(html);

          // 불필요 태그 제거
          $("script, style, iframe, header, footer, nav, noscript").remove();

          if (finalUrl.includes("blog.naver.com")) {
            const target = $(".se-main-container, .se-viewer");
            bodyText = target.length > 0 ? target.text() : $("body").text();
          } else if (finalUrl.includes("10000recipe.com")) {
            const target = $("#contents_area, .view2_summary");
            bodyText = target.length > 0 ? target.text() : $("body").text();
          } else {
            bodyText = $("body").text();
          }

          bodyText = bodyText.replace(/\s+/g, " ").trim().substring(0, 2500);

          const ogImage = $('meta[property="og:image"]').attr("content");
          if (ogImage) thumbnail = ogImage;
        }
      } catch (ex) {
        console.warn(`스크래핑 실패 (${src.link}): ${ex}`);
        bodyText = "본문 추출 실패";
      }

      try {
        const analysisPrompt = buildRecipeAnalysisPrompt(ingredientsStr, bodyText, src.title);
        // 최신 SDK: 분석 단계에서도 동일한 ai.models.generateContent 사용
        const analysisRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: analysisPrompt,
        });
        const analysisText = analysisRes.text || "";

        const cleanJson = analysisText.replace(/```json/g, "").replace(/```/g, "").trim();
        const startIdx = cleanJson.indexOf("{");
        const endIdx = cleanJson.lastIndexOf("}") + 1;

        const parsedData = JSON.parse(cleanJson.substring(startIdx, endIdx));

        const recipeTitle = parsedData.title || src.title;
        const description = parsedData.description || "조리 과정 요약이 없습니다.";

        recommendedMenus.push(recipeTitle);
        recipes.push({
          title: recipeTitle,
          ingredients: effectiveIngredients,
          missingIngredients: parsedData.actualMissingIngredients || [],
          description,
          link: finalUrl,
          imageUrl: thumbnail,
        });
      } catch (itemEx: any) {
        console.error(`아이템 분석 중 에러 (${src.title}): ${itemEx.message}`);
        if (itemEx.message && (itemEx.message.includes("429") || itemEx.message.includes("RESOURCE_EXHAUSTED"))) {
          has429Error = true;
        }
      }
    }

    if (recipes.length === 0) {
      if (has429Error) {
        return NextResponse.json({ detail: "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
      }
      return NextResponse.json(runMockFallback("추천 레시피 생성 실패", queryPart, effectiveIngredients));
    }

    console.log(`[Recommend API] 최종 ${recipes.length}개 RAG 기반 레시피 카드 생성 완료!`);
    return NextResponse.json({ recipes, count: recipes.length, recommendedMenus });

  } catch (error: any) {
    console.error("서버 에러 발생:", error);
    if (error.message && (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED"))) {
      return NextResponse.json({ detail: "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
    }
    if (error.message && error.message.includes("503")) {
      return NextResponse.json(runMockFallback("AI 서버 일시적 과부하 (503 에러)", queryPart || "", effectiveIngredients || []));
    }
    return NextResponse.json({ detail: `추천 처리 중 알 수 없는 에러가 발생했습니다: ${error.message}` }, { status: 500 });
  }
}
