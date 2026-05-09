# 🎓 Smart Sicsa (대학생 식사 가이드)

> **"오늘 뭐 먹지?" 고민하는 대학생들을 위한 스마트한 식사 솔루션**
> 
> 냉장고 속 남은 재료로 만드는 AI 레시피부터 학교 주변 가성비 맛집 추천까지, 대학생의 식생활을 책임집니다.

---

## ✨ 주요 기능 (Key Features)

### 🍱 AI 기반 레시피 추천
- 보유한 식재료를 태그로 입력하면 **Google Gemini AI**가 실제 블로그 레시피를 검색하여 추천
- 보유 재료 / 부족한 재료를 구분하여 표시
- 레시피 클릭 시 상세 뷰 전환 → 원본 블로그 바로 이동 가능

### 📍 학교 주변 식당 탐색 _(UI 구현 완료, 지도 API 연동 예정)_
- 위치 기반 서비스를 통한 주변 식당 정보 확인
- 가격대 및 음식 카테고리별 필터링
- 나만 알고 싶은 맛집 북마크 기능

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
   │       (UI 및 사용자 인터랙션)
   │
   └─▶ [Python FastAPI 백엔드] :8000
           │
           ├─▶ GET  /ingredients   (재료 목록 조회)
           ├─▶ POST /ingredients   (재료 추가)
           └─▶ POST /recommend-recipes ──▶ [Google Gemini API]
                                             (gemini-3.1-flash-lite + google_search 그라운딩)
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

### **Backend (Python)**
| 항목 | 내용 |
|------|------|
| Framework | FastAPI + Uvicorn |
| AI | `google-genai` (Gemini 3.1 Flash Lite) |
| 환경 관리 | Python venv, python-dotenv |

---

## 🚀 시작하기 (Getting Started)

### **1. 저장소 복제**
```bash
git clone https://github.com/your-username/smart-sicsa.git
cd smart-sicsa
```

### **2. 환경 변수 설정**

프로젝트 루트에 `.env.local`을, `Backend` 폴더 안에 `.env` 파일을 생성하고 각각 아래 키를 입력하세요.
> 자세한 내용은 `API_GUIDE.md` 참고

```bash
# .env.local 및 Backend/.env 공통
GOOGLE_API_KEY=YOUR_GEMINI_API_KEY
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
│   ├── .env                  # 백엔드 환경 변수 (API 키)
│   └── create_food.py        # FastAPI 백엔드 (재료 관리 + Gemini 추천)
├── src/
│   └── app/
│       ├── main/
│       │   └── page.tsx      # 레시피 추천 메인 페이지
│       ├── restaurant/
│       │   └── page.tsx      # 식당 추천 페이지
│       └── page.tsx          # 로그인 페이지 (Entry)
├── components/
│   └── Sidebar.tsx           # 공통 사이드바 컴포넌트
├── API_GUIDE.md              # API 키 발급 및 환경 변수 설정 가이드
├── PROJECT_ROADMAP.md        # 개발 진행 상황 및 향후 계획
└── .env.local                # 환경 변수 (Git 미포함)
```

---

## 📝 라이선스 (License)

This project is licensed under the MIT License.
