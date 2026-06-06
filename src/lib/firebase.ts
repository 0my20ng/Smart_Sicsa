// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 1. .env에 숨겨둔 환경변수들을 불러와 config 객체를 만듭니다.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 2. Firebase 앱을 초기화합니다. 
// (Next.js 특성상 여러 번 렌더링될 때 앱이 중복 생성되는 에러를 막기 위한 방어 코드입니다.)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 3. Firestore(데이터베이스) 객체를 밖으로 내보냅니다.
const db = getFirestore(app);

export { app, db };
