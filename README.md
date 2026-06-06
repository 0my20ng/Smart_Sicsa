# 🎓 Smart Sicsa (대학생 식사 가이드)

> **"오늘 뭐 먹지?" 고민하는 대학생들을 위한 스마트한 식사 솔루션**
>
> 냉장고 속 남은 재료로 만드는 AI 레시피부터 학교 주변 가성비 맛집 추천까지, 대학생의 식생활을 책임집니다.

---

## ✨ 주요 기능 (Key Features)

### 🌟 오늘의 레시피 (`/daily`)
- 오늘 날짜를 기반으로 **하루 한 가지 음식**을 추천
- 돌림판 스핀 애니메이션으로 결과 공개
- "오늘 이 음식이 좋은 이유"를 함께 제시

### 🍱 AI 기반 레시피 추천 (`/main`)
- 보유한 식재료를 태그로 입력하면 **Google Gemini AI**가 실제 블로그 레시피를 검색하여 추천
- 보유 재료 / 부족한 재료를 구분하여 표시
- 레시피 클릭 시 상세 뷰 전환 → 원본 블로그 바로 이동 가능

### 📍 학교 주변 식당 탐색 (`/restaurant`)
- **카카오 Maps** 기반 실시간 지도 표시
- 현재 위치 감지 후 반경 내 음식점 마커 표시
- 음식 종류(한식/중식/일식 등), 검색 반경(500m~5km) 필터링
- 마커 클릭 시 상세 정보 팝업 (이름, 주소, 전화번호, 카카오맵 링크)

### 📱 사용자 친화적 UI/UX
- 현대적이고 싱그러운 그린 테마 인터페이스 (형광 초록 포인트 컬러)
- 모든 기기에서 사용 가능한 반응형 사이드바 드로어 시스템
- 직관적인 아이콘과 애니메이션을 통한 부드러운 사용자 경험

---

## 🏗️ 아키텍처 (Architecture)

이 프로젝트는 **두 개의 서버**로 구성됩니다.

```
[브라우저]
   │
   ├─▶ [Next.js 프론트엔드] :3000
   │       │
   │       ├─▶ /api/restaurants ──▶ [카카오 로컬 REST API] (서버 프록시)
   │       └─▶ /api/recommendation ──▶ [Google Gemini API]
   │
   └─▶ [Python FastAPI 백엔드] :8000
           ├─▶ GET  /ingredients   (재료 목록 조회)
           ├─▶ POST /ingredients   (재료 추가)
           └─▶ POST /recommend-recipes ──▶ [Google Gemini API]
```

---

## 🛠 기술 스택 (Tech Stack)

### **Frontend (Next.js)**
| 항목 | 내용 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Library | React 19 |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React |
| Font | Noto Sans KR |
| 지도 | 카카오 Maps JS API + 로컬 REST API |

### **Backend (Python)**
| 항목 | 내용 |
|------|------|
| Framework | FastAPI + Uvicorn |
| AI | `google-genai` (Gemini Flash Lite) |
| 환경 관리 | Python venv, python-dotenv |

---

## 🚀 시작하기 (Getting Started)

### **1. 저장소 복제**
```bash
git clone https://github.com/your-username/smart-sicsa.git
cd smart-sicsa
```

### **2. 환경 변수 설정**

프로젝트 루트에 `.env.local`을, `Backend` 폴더 안에 `.env` 파일을 생성하세요.
> 자세한 내용은 [`API_GUIDE.md`](./API_GUIDE.md) 참고

```bash
# .env.local
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY
GOOGLE_SEARCH_API_KEY=YOUR_SEARCH_API_KEY
GOOGLE_SEARCH_CX=YOUR_SEARCH_CX_ID
NEXT_PUBLIC_KAKAO_MAP_API_KEY=YOUR_KAKAO_JS_KEY
KAKAO_REST_API_KEY=YOUR_KAKAO_REST_KEY
```

### **3. Next.js 프론트엔드 실행**
```bash
npm install
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### **4. Python 백엔드 실행 (별도 터미널)**
```bash
# 가상환경 생성 및 활성화 (최초 1회)
python -m venv venv
.\venv\Scripts\activate

# 의존성 설치 (최초 1회)
pip install fastapi uvicorn google-genai python-dotenv pydantic

# 서버 실행
python -m uvicorn Backend.create_food:app --reload
```
백엔드 서버가 [http://127.0.0.1:8000](http://127.0.0.1:8000)에서 실행됩니다.

---

## 📂 프로젝트 구조 (Folder Structure)

```text
Smart_sicsa/
├── Backend/
│   ├── .env                      # 백엔드 환경 변수 (API 키)
│   └── create_food.py            # FastAPI 백엔드 (재료 관리 + Gemini 추천)
├── src/
│   └── app/
│       ├── api/
│       │   ├── recommendation/
│       │   │   └── route.ts      # Gemini 레시피 추천 API (프록시)
│       │   └── restaurants/
│       │       └── route.ts      # 카카오 로컬 API 프록시 (REST 키 보호)
│       ├── daily/
│       │   └── page.tsx          # 오늘의 레시피 페이지
│       ├── main/
│       │   └── page.tsx          # 레시피 추천 메인 페이지
│       ├── restaurant/
│       │   └── page.tsx          # 식당 추천 페이지 (카카오 Maps)
│       ├── layout.tsx            # 공통 레이아웃 (SDK 로드)
│       └── page.tsx              # 로그인 페이지 (Entry)
├── src/components/
│   └── Sidebar.tsx               # 공통 사이드바 컴포넌트
├── API_GUIDE.md                  # API 키 발급 및 환경 변수 설정 가이드
├── PROJECT_ROADMAP.md            # 개발 진행 상황 및 향후 계획
└── .env.local                    # 환경 변수 (Git 미포함)
```

---

## 📝 라이선스 (License)

This project is licensed under the MIT License.
