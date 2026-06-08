# 🎓 Smart Sicsa (대학생 식사 가이드)

> **"오늘 뭐 먹지?" 고민하는 대학생들을 위한 스마트한 식사 솔루션**
>
> 냉장고 속 남은 재료로 만드는 AI 레시피부터 학교 주변 가성비 맛집 추천까지, 대학생의 식생활을 책임집니다.

---

## ✨ 주요 기능 (Key Features)

### 🔐 소셜 로그인 & 데이터 동기화
- **NextAuth (Google Login)** 기반의 간편한 소셜 로그인
- 사용자별 냉장고 재료 및 북마크 데이터를 **Firebase Firestore**와 실시간 동기화

### 🧊 내 냉장고 (`/fridge`)
- 보유 중인 식재료를 손쉽게 등록 및 관리
- 로컬 스토리지 휘발성 데이터가 아닌, 사용자 계정 기반 클라우드 영구 저장

### 🌟 오늘의 레시피 (`/daily`)
- 오늘 날짜를 기반으로 **하루 한 가지 음식**을 추천
- 돌림판 스핀 애니메이션으로 결과 공개 및 추천 이유 제시
- 마음에 드는 메뉴는 즉시 💖 북마크(찜하기) 가능

### 🍱 AI 기반 레시피 추천 (`/main`)
- 보유한 식재료를 바탕으로 **Google Gemini AI**가 웹을 스크래핑(RAG)하여 맞춤 레시피 5개 추천
- 보유 재료 / 부족한 재료를 명확하게 구분하여 표시
- 원본 블로그 바로 이동 및 💖 북마크(찜하기) 지원

### 📍 학교 주변 식당 탐색 (`/restaurant`)
- **카카오 Maps** 기반 실시간 지도 감지 및 반경 내 음식점 마커 표시
- 음식 종류(한식/중식/일식 등) 및 검색 반경 필터링
- 식당 정보 팝업에서 💖 북마크(찜하기) 및 카카오맵 외부 링크 연동

### 💖 북마크 모아보기 (`/bookmarks`)
- 내가 찜한 **레시피**와 **맛집**을 분리된 탭에서 한눈에 모아보고 관리

---

## 🏗️ 아키텍처 (Architecture)

파이썬 백엔드를 모두 걷어내고, **Next.js Full-Stack 구조**로 일원화되었습니다.

```text
[브라우저 (Client)]
   │
   ├─▶ [Next.js App Router (Serverless API)]
   │       │
   │       ├─▶ /api/restaurants ──▶ [카카오 로컬 REST API] (CORS 방지 프록시)
   │       └─▶ /api/recommend-recipes ──▶ [Google Gemini API + Cheerio 스크래핑] (RAG 파이프라인)
   │
   └─▶ [Firebase Cloud Firestore] (Database)
           ├─▶ users (NextAuth 사용자 정보)
           ├─▶ refrigerators (내 냉장고 재료)
           └─▶ bookmarks (레시피 & 맛집 찜하기)
```

---

## 🛠 기술 스택 (Tech Stack)

### **Frontend & Backend (Full-Stack Next.js)**
| 항목 | 내용 |
|------|------|
| Framework | Next.js 16 (App Router, Serverless API) |
| Language | TypeScript |
| UI Library | React 19, Tailwind CSS v4, Lucide React |
| Auth | NextAuth.js (v5) + Firebase Adapter |
| Database | Firebase Cloud Firestore |
| AI Pipeline | `@google/genai` (Gemini 2.5 Flash + Google Grounding), `cheerio` (Web Scraping) |
| Map | 카카오 Maps JS API + 카카오 로컬 REST API |

---

## 🚀 시작하기 (Getting Started)

### **1. 저장소 복제**
```bash
git clone https://github.com/your-username/smart-sicsa.git
cd smart-sicsa
```

### **2. 환경 변수 설정**

프로젝트 루트에 `.env.local` 파일을 생성하고 아래 변수들을 입력하세요.

```bash
# [NextAuth & Authentication]
AUTH_SECRET=YOUR_AUTH_SECRET
AUTH_GOOGLE_ID=YOUR_GOOGLE_CLIENT_ID
AUTH_GOOGLE_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# [Google Gemini AI]
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY

# [Kakao Maps & Local API]
NEXT_PUBLIC_KAKAO_MAP_API_KEY=YOUR_KAKAO_JS_KEY
KAKAO_REST_API_KEY=YOUR_KAKAO_REST_KEY

# [Firebase SDK]
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID

# [Firebase Admin SDK]
FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL=YOUR_FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY="YOUR_FIREBASE_PRIVATE_KEY"
```

### **3. 의존성 설치 및 실행**
```bash
npm install
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

---

## 📂 프로젝트 핵심 구조 (Folder Structure)

```text
Smart_sicsa/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── recommend-recipes/  # RAG 기반 AI 추천 서버리스 파이프라인
│   │   │   └── restaurants/        # 카카오 로컬 API 프록시 라우트
│   │   ├── bookmarks/              # 북마크 모아보기 (레시피/맛집)
│   │   ├── daily/                  # 오늘의 레시피 페이지
│   │   ├── fridge/                 # 내 냉장고 관리 페이지
│   │   ├── main/                   # 메인 AI 레시피 추천 페이지
│   │   ├── restaurant/             # 학교 주변 맛집 탐색 페이지
│   │   ├── layout.tsx              # 전역 레이아웃 및 NextAuth Session Provider
│   │   └── page.tsx                # 소셜 로그인 진입 화면
│   ├── components/                 # 공통 UI (Sidebar 등)
│   ├── lib/
│   │   ├── firebase.ts             # Firebase Client SDK 및 사용자 설정
│   │   ├── firebase-admin.ts       # Firebase Admin SDK (NextAuth용)
│   │   └── firestore.ts            # 냉장고 & 북마크 비즈니스 로직 API
│   └── auth.ts                     # NextAuth 설정 및 콜백
└── .env.local                      # 환경 변수 설정
```

---

## 📝 라이선스 (License)

This project is licensed under the MIT License.
