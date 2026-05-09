# Smart Sicsa API 연동 가이드

이 프로젝트는 **Google Gemini API**와 **Google Custom Search API**를 사용하여 지능형 레시피 추천 및 검색 기능을 제공합니다.

---

## 1. 환경 변수 설정 (.env.local)

프로젝트 루트 디렉토리에 `.env.local` 파일을 생성하고 아래의 키들을 설정해야 합니다.

```bash
# 1. Google Gemini API 키
# 발급처: https://aistudio.google.com/
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY

# 2. Google Custom Search API 키
# 발급처: https://console.cloud.google.com/apis/credentials
GOOGLE_SEARCH_API_KEY=YOUR_SEARCH_API_KEY

# 3. Google Custom Search Engine ID (CX)
# 발급처: https://programmablesearchengine.google.com/
GOOGLE_SEARCH_CX=YOUR_SEARCH_CX_ID
```

---

## 2. API 상세 정보

### A. Gemini API (레시피 생성)
- **사용 모델**: `gemini-3-flash`
- **역할**: 사용자의 식재료를 분석하여 요리 추천, 부족한 재료 파악, 검색 쿼리 생성.
- **파일 위치**: `src/app/api/recommendation/route.ts`

### B. Google Custom Search API (블로그 검색)
- **역할**: Gemini가 생성한 쿼리를 바탕으로 네이버/구글 블로그 레시피 링크와 썸네일을 가져옴.
- **매개변수**: `num=1` (가장 관련성 높은 결과 1개 호출)

---

## 3. 주의사항
- **API 할당량**: Gemini 무료 티어는 분당 요청 제한(RPM)이 있으므로 짧은 시간에 반복적인 요청은 지연될 수 있습니다.
- **보안**: `.env.local` 파일은 절대 GitHub 등 공개 저장소에 업로드하지 마십시오. (.gitignore에 포함 확인)
- **모델 버전**: `gemini-3.0-flash` 등 존재하지 않는 모델명을 사용하면 404 에러가 발생하므로 반드시 지원되는 모델명을 사용하십시오.
