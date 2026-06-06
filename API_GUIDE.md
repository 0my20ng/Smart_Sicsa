# Smart Sicsa API 연동 가이드

이 프로젝트는 **Google Gemini API**, **Google Custom Search API**, **카카오 Maps API**를 사용합니다.

---

## 1. 환경 변수 설정 (`.env.local`)

프로젝트 루트 디렉토리의 `.env.local` 파일에 아래 키들을 설정하세요.

```bash
# ── Google API ────────────────────────────────────────────
# 발급처: https://aistudio.google.com/
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY

# Google Custom Search API 키
# 발급처: https://console.cloud.google.com/apis/credentials
GOOGLE_SEARCH_API_KEY=YOUR_SEARCH_API_KEY

# Google Custom Search Engine ID (CX)
# 발급처: https://programmablesearchengine.google.com/
GOOGLE_SEARCH_CX=YOUR_SEARCH_CX_ID

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

### A. Gemini API (레시피 생성)
- **사용 모델**: `gemini-2.0-flash-lite` (또는 최신 지원 모델)
- **역할**: 사용자의 식재료를 분석하여 요리 추천, 부족한 재료 파악, 검색 쿼리 생성.
- **파일 위치**: `src/app/api/recommendation/route.ts`

### B. Google Custom Search API (블로그 검색)
- **역할**: Gemini가 생성한 쿼리를 바탕으로 네이버/구글 블로그 레시피 링크와 썸네일을 가져옴.
- **매개변수**: `num=1` (가장 관련성 높은 결과 1개 호출)

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
