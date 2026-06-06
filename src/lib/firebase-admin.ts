// src/lib/firebase-admin.ts
import * as admin from "firebase-admin";

// Next.js 환경에서 핫 리로딩 시 앱 중복 초기화 방지
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Vercel 배포 시 환경 변수의 줄바꿈(\n)이스케이프 문자를 실제 줄바꿈으로 치환
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
