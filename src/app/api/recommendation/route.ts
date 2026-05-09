import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { ingredients } = await req.json();

    if (!ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json({ error: "Ingredients are required" }, { status: 400 });
    }

    // 단일 단계로 통합하여 API 호출 횟수 절약 (하루 20회 한도 최적화)
    // 사용자 환경에서 작동이 확인된 gemini-3-flash-preview 사용
    const model = genAI.getGenerativeModel({
      model: "gemini-3-flash-preview",
      tools: [{ googleSearch: {} } as any]
    });

    const prompt = `
      당신은 전문 요리사입니다. 사용자가 가진 식재료 [${ingredients.join(", ")}]를 바탕으로 다음 작업을 수행하세요.
      
      작업:
      1. 이 식재료들로 만들 수 있는 가장 인기 있는 레시피 3가지를 구글 검색을 통해 찾으세요.
      2. 각 레시피에 대해 실제 블로그 URL, 이미지 주소, 요리 설명을 수집하세요.
      3. 반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 생략하세요.

      출력 형식:
      {
        "recipes": [
          {
            "title": "요리 이름",
            "ingredients": ["보유 재료"],
            "missingIngredients": ["부족한 재료"],
            "description": "상세한 레시피 설명",
            "link": "실제 블로그 주소",
            "imageUrl": "대표 이미지 주소"
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("AI response did not contain valid JSON");
    }

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ recipes: data.recipes || [] });

  } catch (error: any) {
    console.error("Recipe API Error:", error);
    // 429 에러(한도 초과)인 경우 사용자에게 더 명확한 메시지 전달 가능
    if (error.message?.includes("429")) {
      return NextResponse.json({ error: "오늘의 무료 이용 한도(20회)를 모두 사용하셨습니다. 내일 다시 시도해 주세요." }, { status: 429 });
    }
    return NextResponse.json({ error: "추천 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
