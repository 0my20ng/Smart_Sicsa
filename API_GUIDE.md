# Smart Sicsa API 연동 가이드

이 프로젝트는 **Google Gemini API** (Grounding 기반 RAG), **카카오 Maps API**를 사용합니다.

---

## 1. 환경 변수 설정 (`.env.local`)

프로젝트 루트 디렉토리의 `.env.local` 파일에 아래 키들을 설정하세요.

```bash
# ── Google API ────────────────────────────────────────────
# 발급처: https://aistudio.google.com/
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY

# (선택) Google Custom Search API 키 — 현재 미사용 (Gemini Grounding으로 대체됨)
# GOOGLE_SEARCH_API_KEY=YOUR_SEARCH_API_KEY
# GOOGLE_SEARCH_CX=YOUR_SEARCH_CX_ID

# ── 카카오 Maps API ────────────────────────────────────────
# 발급처: https://developers.kakao.com → 내 앱 → 앱 키

# 지도 표시용 JavaScript 키 (브라우저 노출, NEXT_PUBLIC_ 필수)
NEXT_PUBLIC_KAKAO_MAP_API_KEY=YOUR_JAVASCRIPT_KEY

# 장소 검색(로컬 API)용 REST API 키 (서버 전용, NEXT_PUBLIC_ 불필요)
# /api/restaurants 프록시 라우트에서 사용됨
KAKAO_REST_API_KEY=YOUR_REST_API_KEY
```

---

## 2. API 상세 정보

### A. Gemini API (레시피 추천 + Grounding 검색)
- **사용 SDK**: `@google/genai` v2.8.0 (최신 통합 SDK)
- **사용 모델**: `gemini-2.5-flash`
- **역할**: Google Grounding(`googleSearch` 도구)으로 실제 레시피 웹 소스를 검색하고, 해당 페이지를 스크래핑하여 조리 과정을 AI가 요약하는 RAG 파이프라인.
- **파일 위치**: `src/app/api/recommend-recipes/route.ts`
- **⚠️ 주의**: `contents`는 반드시 `[{ role: "user", parts: [{ text: prompt }] }]` 구조화 객체로 전달해야 Next.js 서버리스 환경에서 Grounding이 트리거됩니다.

### B. Google Custom Search API
- **현재 상태**: ❌ 미사용 (Gemini Grounding으로 완전 대체됨)
- `.env.local`에 키가 있어도 실제 코드에서 호출하지 않습니다.

### C. 카카오 Maps JS API (지도 표시)
- **역할**: `/restaurant` 페이지에서 인터랙티브 지도를 렌더링.
- **로드 방식**: `autoload=false` + `kakao.maps.load()` 수동 초기화
- **라이브러리**: `services` (장소 검색, Geocoder)
- **파일 위치**: `src/app/layout.tsx`

### D. 카카오 로컬 REST API (장소 검색)
- **역할**: 현재 위치 기반 주변 음식점 검색 (카테고리, 반경 필터)
- **엔드포인트**: `GET https://dapi.kakao.com/v2/local/search/keyword.json`
- **⚠️ 보안**: REST API 키를 클라이언트에 노출하지 않도록 **Next.js API 라우트 프록시**를 통해 호출
- **프록시 위치**: `src/app/api/restaurants/route.ts`

---

## 3. 카카오 디벨로퍼스 앱 설정

1. [카카오 디벨로퍼스](https://developers.kakao.com) 접속 → 내 앱 선택
2. **플랫폼** → **Web** 탭 → **사이트 도메인** 등록
   - 개발: `http://localhost:3000`
   - 배포: `https://your-domain.com`
3. 사이트 도메인 미등록 시 지도 SDK 로드 실패 발생

---

## 4. 주의사항

- **API 할당량**: Gemini 무료 티어는 분당 요청 제한(RPM)이 있으므로 짧은 시간에 반복적인 요청은 지연될 수 있습니다.
- **카카오 로컬 무료 할당량**: 일 300,000건 / 초 30건 (초과 시 429 오류)
- **보안**: `.env.local` 파일은 절대 GitHub 등 공개 저장소에 업로드하지 마세요. (`.gitignore` 포함 확인)
- **모델 버전**: 존재하지 않는 Gemini 모델명 사용 시 404 오류 발생 — 반드시 지원되는 모델명 사용
