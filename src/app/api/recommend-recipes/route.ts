import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import * as cheerio from "cheerio";
import { RecommendRequest, RecipeItem, RecipeListResponse } from "./types";
import { SEARCH_PROMPT, buildRecipeAnalysisPrompt, buildDirectRecipePrompt } from "./prompts";

export const maxDuration = 60; // 서버리스 환경 최대 실행 시간 허용

const API_KEY = process.env.GOOGLE_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

// ─── 유틸: 텍스트에서 URL 패턴 파싱 (Grounding 폴백용) ───────────────────────
function extractUrlsFromText(text: string): { title: string; link: string }[] {
  const results: { title: string; link: string }[] = [];

  // JSON 배열 파싱 시도 (SEARCH_PROMPT의 JSON 출력 형식)
  try {
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const startIdx = cleanText.indexOf("[");
    const endIdx = cleanText.lastIndexOf("]") + 1;
    if (startIdx !== -1 && endIdx > startIdx) {
      const jsonArr = JSON.parse(cleanText.substring(startIdx, endIdx));
      if (Array.isArray(jsonArr)) {
        for (const item of jsonArr) {
          if (item.url && item.url.startsWith("http")) {
            results.push({ title: item.title || "레시피", link: item.url });
          }
        }
      }
    }
  } catch {
    // JSON 파싱 실패 시 정규식으로 URL 추출
  }

  // JSON 파싱에 실패하거나 결과 없을 경우 정규식으로 URL 추출
  if (results.length === 0) {
    const urlRegex = /https?:\/\/[^\s"'\]>)]+/g;
    const matches = text.match(urlRegex) || [];
    for (const url of matches) {
      const cleanUrl = url.replace(/[.,;)]+$/, "");
      if (
        cleanUrl.includes("recipe") ||
        cleanUrl.includes("naver.com") ||
        cleanUrl.includes("10000recipe") ||
        cleanUrl.includes("wtable") ||
        cleanUrl.includes("mangae") ||
        cleanUrl.includes("cook")
      ) {
        results.push({ title: "검색된 레시피", link: cleanUrl });
      }
    }
  }

  return results.slice(0, 5);
}

// ─── Grounding Metadata에서 소스 추출 (다중 경로 탐색) ─────────────────────
function extractGroundingSources(searchResponse: any): { title: string; link: string }[] {
  const sources: { title: string; link: string }[] = [];

  try {
    const candidates = searchResponse.candidates;
    if (!candidates || candidates.length === 0) return sources;

    const candidate = candidates[0];
    const metadata = candidate.groundingMetadata;

    if (!metadata) {
      console.log("[Grounding] groundingMetadata 없음");
      return sources;
    }

    // 경로 1: groundingChunks (표준 경로)
    if (metadata.groundingChunks && metadata.groundingChunks.length > 0) {
      for (const chunk of metadata.groundingChunks) {
        if (chunk.web?.uri) {
          sources.push({
            title: chunk.web.title || "레시피",
            link: chunk.web.uri,
          });
        }
      }
      console.log(`[Grounding] groundingChunks에서 ${sources.length}개 추출`);
    }

    // 경로 2: groundingSupports → retrievedContext
    if (sources.length === 0 && metadata.groundingSupports) {
      for (const support of metadata.groundingSupports) {
        if (support.groundingChunkIndices && metadata.groundingChunks) {
          for (const idx of support.groundingChunkIndices) {
            const chunk = metadata.groundingChunks[idx];
            if (chunk?.web?.uri) {
              sources.push({ title: chunk.web.title || "레시피", link: chunk.web.uri });
            }
          }
        }
      }
      console.log(`[Grounding] groundingSupports에서 ${sources.length}개 추출`);
    }

    // 경로 3: searchEntryPoint (Google Search 진입점)
    if (sources.length === 0 && metadata.searchEntryPoint?.renderedContent) {
      console.log("[Grounding] searchEntryPoint만 존재, 텍스트 응답에서 URL 추출 시도");
    }

    // 중복 URL 제거
    const seen = new Set<string>();
    return sources.filter((s) => {
      if (seen.has(s.link)) return false;
      seen.add(s.link);
      return true;
    });
  } catch (ex) {
    console.error(`[Grounding] 소스 추출 중 예외: ${ex}`);
    return sources;
  }
}

// ─── Gemini 자체 지식으로 레시피 직접 생성 (최후 폴백) ─────────────────────
async function generateDirectRecipes(
  ingredientsStr: string,
  queryPart: string,
  effectiveIngredients: string[]
): Promise<RecipeListResponse> {
  console.log("[Recommend API] Gemini 직접 레시피 생성 폴백 실행");
  try {
    const directPrompt = buildDirectRecipePrompt(ingredientsStr, queryPart);
    const directRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: directPrompt }] }],
    });

    const rawText = directRes.text || "";
    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    const startIdx = cleanJson.indexOf("[");
    const endIdx = cleanJson.lastIndexOf("]") + 1;

    const parsedArr = JSON.parse(cleanJson.substring(startIdx, endIdx));
    const recipes: RecipeItem[] = [];
    const recommendedMenus: string[] = [];

    for (const item of parsedArr) {
      if (item.title) {
        recommendedMenus.push(item.title);
        recipes.push({
          title: item.title,
          ingredients: effectiveIngredients,
          missingIngredients: item.actualMissingIngredients || [],
          description: item.description || "조리 과정 정보 없음",
          link: item.referenceUrl || "https://www.10000recipe.com/",
          imageUrl: undefined,
        });
      }
    }

    if (recipes.length > 0) {
      console.log(`[Recommend API] Gemini 직접 생성 성공: ${recipes.length}개`);
      return { recipes, count: recipes.length, recommendedMenus };
    }
  } catch (ex) {
    console.error(`[Recommend API] Gemini 직접 생성 실패: ${ex}`);
  }

  // 완전 최후 수단: Mock 데이터
  return runMockFallback("Gemini 직접 생성도 실패", queryPart, effectiveIngredients);
}

function runMockFallback(reason: string, query: string, ingredients: string[]): RecipeListResponse {
  console.warn(`Mock Fallback 실행 이유: ${reason}`);
  const mockItems: RecipeItem[] = [
    {
      title: `[예시] ${query || "계란볶음밥"} 황금레시피 (검색 연결 확인 필요)`,
      ingredients,
      missingIngredients: [],
      description: `검색 과정 중 오류가 발생하여 임시 예시를 노출합니다. (${reason})\n잠시 후 다시 시도해 주세요.`,
      link: "https://www.10000recipe.com/",
      imageUrl: undefined,
    },
  ];
  return { recipes: mockItems, count: 1, recommendedMenus: [query || "계란볶음밥"] };
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

    console.log(`[Recommend API] Step 1: Gemini Google Search 호출 | 재료: [${ingredientsStr}] | 키워드: '${queryPart}'`);

    const searchPrompt = SEARCH_PROMPT(ingredientsStr, queryPart);

    // ── Step 1: Gemini Google Search (Grounding) 호출 ─────────────────────
    const searchResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: searchPrompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    // ── Step 2: Grounding Metadata에서 소스 추출 ──────────────────────────
    let googleSources = extractGroundingSources(searchResponse);
    console.log(`[Recommend API] Grounding 소스 ${googleSources.length}개 추출`);

    // ── Step 3: Grounding 실패 시 → 텍스트 응답에서 URL 파싱 ─────────────
    if (googleSources.length === 0) {
      console.warn("[Recommend API] Grounding 소스 없음 → 텍스트 응답에서 URL 파싱 시도");
      const responseText = searchResponse.text || "";
      console.log(`[Recommend API] Gemini 응답 텍스트 (앞 500자): ${responseText.substring(0, 500)}`);
      googleSources = extractUrlsFromText(responseText);
      console.log(`[Recommend API] 텍스트 파싱으로 ${googleSources.length}개 URL 추출`);
    }

    // ── Step 4: URL 소스가 전혀 없으면 → Gemini 직접 레시피 생성 ──────────
    if (googleSources.length === 0) {
      console.warn("[Recommend API] URL 소스 확보 실패 → Gemini 직접 레시피 생성으로 전환");
      const directResult = await generateDirectRecipes(ingredientsStr, queryPart, effectiveIngredients);
      return NextResponse.json(directResult);
    }

    // ── Step 5: 각 URL 스크래핑 + Gemini 분석 ────────────────────────────
    const recipes: RecipeItem[] = [];
    const recommendedMenus: string[] = [];
    let has429Error = false;

    for (let i = 0; i < Math.min(5, googleSources.length); i++) {
      const src = googleSources[i];
      console.log(`[${i + 1}/${Math.min(5, googleSources.length)}] 스크래핑 시도: ${src.link}`);

      let bodyText = "";
      let finalUrl = src.link;
      let thumbnail: string | undefined = undefined;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const pageRes = await fetch(src.link, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "ko-KR,ko;q=0.9",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (pageRes.ok) {
          finalUrl = pageRes.url;
          const html = await pageRes.text();
          const $ = cheerio.load(html);

          // 불필요 태그 제거
          $("script, style, iframe, header, footer, nav, noscript, aside").remove();

          if (finalUrl.includes("blog.naver.com")) {
            const target = $(".se-main-container, .se-viewer, #postViewArea");
            bodyText = target.length > 0 ? target.text() : $("body").text();
          } else if (finalUrl.includes("10000recipe.com")) {
            const target = $("#contents_area, .view2_summary, .cont_ingre, .view2_step");
            bodyText = target.length > 0 ? target.text() : $("body").text();
          } else if (finalUrl.includes("wtable.co.kr") || finalUrl.includes("mangae.net")) {
            const target = $(".recipe-content, .step-list, .ingredient-list, main");
            bodyText = target.length > 0 ? target.text() : $("body").text();
          } else {
            bodyText = $("body").text();
          }

          bodyText = bodyText.replace(/\s+/g, " ").trim().substring(0, 2500);

          const ogImage = $('meta[property="og:image"]').attr("content");
          if (ogImage) thumbnail = ogImage;
        } else {
          console.warn(`[스크래핑] HTTP ${pageRes.status} 응답: ${src.link}`);
          bodyText = "본문 추출 실패 (HTTP 오류)";
        }
      } catch (ex) {
        console.warn(`[스크래핑] 실패 (${src.link}): ${ex}`);
        bodyText = "본문 추출 실패";
      }

      try {
        const analysisPrompt = buildRecipeAnalysisPrompt(ingredientsStr, bodyText, src.title);
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
        console.error(`[분석] 에러 (${src.title}): ${itemEx.message}`);
        if (itemEx.message && (itemEx.message.includes("429") || itemEx.message.includes("RESOURCE_EXHAUSTED"))) {
          has429Error = true;
        }
      }
    }

    // ── Step 6: 스크래핑/분석 모두 실패한 경우 처리 ──────────────────────
    if (recipes.length === 0) {
      if (has429Error) {
        return NextResponse.json(
          { detail: "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." },
          { status: 429 }
        );
      }
      // URL은 있었으나 분석에 실패 → Gemini 직접 생성
      console.warn("[Recommend API] 스크래핑/분석 모두 실패 → Gemini 직접 레시피 생성");
      const directResult = await generateDirectRecipes(ingredientsStr, queryPart, effectiveIngredients);
      return NextResponse.json(directResult);
    }

    console.log(`[Recommend API] 최종 ${recipes.length}개 RAG 기반 레시피 카드 생성 완료!`);
    return NextResponse.json({ recipes, count: recipes.length, recommendedMenus });

  } catch (error: any) {
    console.error("서버 에러 발생:", error);
    if (error.message && (error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED"))) {
      return NextResponse.json(
        { detail: "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 }
      );
    }
    if (error.message && error.message.includes("503")) {
      return NextResponse.json(
        runMockFallback("AI 서버 일시적 과부하 (503 에러)", queryPart || "", effectiveIngredients || [])
      );
    }
    return NextResponse.json(
      { detail: `추천 처리 중 알 수 없는 에러가 발생했습니다: ${error.message}` },
      { status: 500 }
    );
  }
}
