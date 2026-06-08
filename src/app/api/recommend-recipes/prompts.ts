// 1단계: 구글 검색을 통해 레시피 URL 수집 프롬프트
// Grounding이 작동할 때 실제 URL이 metadata에 포함됨
export const SEARCH_PROMPT = (ingredientsStr: string, queryPart: string) => `
사용자 보유 식재료: [${ingredientsStr}]
추가 요청사항: [${queryPart || "없음"}]

역할: 당신은 냉장고 파먹기 요리 전문가입니다.

태스크:
반드시 google_search 도구를 사용하여 위 식재료로 만들 수 있는 한국 요리 레시피 5가지를 검색해 주세요.
각 요리별로 실제 레시피 블로그/웹사이트 URL을 1개씩 찾아서 아래 JSON 형식으로 출력해 주세요.

검색 예시: "${ingredientsStr} 레시피 만드는법 site:10000recipe.com OR site:blog.naver.com OR site:wtable.co.kr"

반드시 아래 JSON 배열 형식으로만 출력하세요. 마크다운이나 설명 텍스트는 절대 포함하지 마세요.

[출력 형식]
[
  {"title": "요리명1", "url": "https://실제URL1"},
  {"title": "요리명2", "url": "https://실제URL2"},
  {"title": "요리명3", "url": "https://실제URL3"},
  {"title": "요리명4", "url": "https://실제URL4"},
  {"title": "요리명5", "url": "https://실제URL5"}
]

주의사항:
1. 제공된 모든 식재료를 전부 활용해야만 하는 것은 아닙니다.
2. URL은 반드시 실제로 존재하는 실제 레시피 페이지 URL이어야 합니다.
3. JSON 배열 외 다른 텍스트를 출력하면 시스템 오류가 발생합니다.
`;

// 2단계: 스크래핑된 본문을 분석하여 레시피 정보 추출
export const buildRecipeAnalysisPrompt = (ingredientsStr: string, bodyText: string, sourceTitle: string) => `
사용자 보유 식재료: [${ingredientsStr}]
검색된 레시피 출처 제목: [${sourceTitle}]
레시피 본문 텍스트: [${bodyText}]

역할: 당신은 레시피를 분석하여 핵심 조리 과정을 요약하고, 사용자가 가지고 있지 않은 부족한 재료를 정확하게 가려내는 요리 비서 AI입니다.

태스크:
1. 제공된 '레시피 본문 텍스트'를 분석하여 이 요리의 실제 공식 한국어 이름(title)을 요약하여 추출해 주세요. (예: "백종원 돼지고기 김치찌개")
2. 제공된 '레시피 본문 텍스트'를 분석하여, 이 요리를 완성하기 위해 사용자가 보유한 식재료 외에 추가적으로 꼭 필요한 부족 재료들을 추출해 주세요.
3. 레시피 본문 텍스트에서 가장 핵심적인 조리 과정을 3~4단계로 직관적으로 요약해 주세요.

주의사항: 
1. 동의어(예: 계란과 달걀, 양파와 다진양파, 대파와 파 등)는 사용자가 보유하고 있는 것으로 취급해 부족 재료에서 제외해 주세요.
2. 양념류(식용유, 소금, 설탕, 간장, 깨, 참기름 등 일반적으로 집에 있는 기본 조미료)는 부족 재료에서 제외해 주세요.
3. 조리 과정 요약(description)은 반드시 줄바꿈 문자('\\n')를 포함하여 각 단계를 구분해 주세요. (예: "1. 재료를 썬다.\\n2. 볶는다.\\n3. 끓인다.")

반드시 아래 JSON 포맷으로만 출력하세요. 마크다운 형식 등 불필요한 텍스트는 절대 포함하지 마세요.

[출력 형식]
{
  "title": "요리 이름",
  "actualMissingIngredients": ["부족한 재료1", "부족한 재료2"],
  "description": "1. 첫번째 조리 단계 요약\\n2. 두번째 조리 단계 요약\\n3. 세번째 조리 단계 요약"
}
`;

// Grounding 완전 실패 시: Gemini 자체 지식으로 레시피 직접 생성
export const buildDirectRecipePrompt = (ingredientsStr: string, queryPart: string) => `
사용자 보유 식재료: [${ingredientsStr}]
추가 요청사항: [${queryPart || "없음"}]

역할: 당신은 냉장고 파먹기 요리 전문가입니다.

태스크:
위 식재료를 활용하여 만들 수 있는 한국 요리 레시피 3가지를 당신의 요리 지식을 바탕으로 직접 만들어 주세요.
외부 검색 없이, 당신이 알고 있는 정확한 레시피 정보를 제공해 주세요.

주의사항:
1. 제공된 모든 식재료를 전부 활용해야만 하는 것은 아닙니다.
2. 동의어(계란=달걀, 양파=다진양파 등)는 동일 재료로 취급해 부족 재료에서 제외하세요.
3. 소금, 설탕, 간장, 식용유, 참기름 등 기본 양념류는 부족 재료에서 제외하세요.
4. description은 줄바꿈(\\n)으로 3~4단계를 구분하세요.

반드시 아래 JSON 배열 형식으로만 출력하세요. 마크다운이나 설명 텍스트는 절대 포함하지 마세요.

[출력 형식]
[
  {
    "title": "요리명1",
    "actualMissingIngredients": ["부족재료1", "부족재료2"],
    "description": "1. 첫번째 단계\\n2. 두번째 단계\\n3. 세번째 단계",
    "referenceUrl": "https://www.10000recipe.com/"
  }
]
`;
