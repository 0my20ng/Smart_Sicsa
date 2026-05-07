# 🎓 Smart Sicsa (대학생 식사 가이드)

> **"오늘 뭐 먹지?" 고민하는 대학생들을 위한 스마트한 식사 솔루션**
> 
> 냉장고 속 남은 재료로 만드는 레시피부터 학교 주변 가성비 맛집 추천까지, 대학생의 식생활을 책임집니다.

---

## ✨ 주요 기능 (Key Features)

### 🍱 내 냉장고 기반 레시피 추천
- 보유한 식재료를 선택하여 즉시 만들 수 있는 맞춤형 요리법 제안
- 자취생을 위한 초간단, 고효율 레시피 데이터베이스 제공
- 식재료 태그 시스템을 통한 직관적인 재료 관리

### 📍 학교 주변 식당 탐색
- 위치 기반 서비스를 통한 주변 식당 정보 확인
- 가격대 및 음식 카테고리별 정밀 필터링 (가성비 맛집 탐색 최적화)
- 나만 알고 싶은 맛집 북마크 기능

### 📱 사용자 친화적 UI/UX
- 현대적이고 싱그러운 그린 테마의 인터페이스
- 모든 기기에서 사용 가능한 반응형 사이드바 드로어 시스템
- 직관적인 아이콘과 애니메이션을 통한 부드러운 사용자 경험

---

## 🛠 기술 스택 (Tech Stack)

### **Frontend**
- **Framework**: Next.js 16 (App Router)
- **Library**: React 19
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Font**: Noto Sans KR

---

## 🚀 시작하기 (Getting Started)

### **1. 저장소 복제**
```bash
git clone https://github.com/your-username/smart-sicsa.git
cd smart-sicsa
```

### **2. 의존성 설치**
```bash
npm install
```

### **3. 개발 서버 실행**
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

---

## 📂 프로젝트 구조 (Folder Structure)

```text
src/
├── app/              # Next.js App Router (Page & Layout)
│   ├── main/         # 레시피 추천 페이지
│   ├── restaurant/   # 식당 추천 페이지
│   └── page.tsx      # 로그인 페이지 (Entry)
├── components/       # 재사용 가능한 UI 컴포넌트 (Sidebar 등)
└── globals.css       # 전역 스타일 및 Tailwind 설정
```

---

## 📝 라이선스 (License)

This project is licensed under the MIT License.
