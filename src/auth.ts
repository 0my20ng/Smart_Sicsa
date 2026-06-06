import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { FirestoreAdapter } from "@auth/firebase-adapter"
import { adminDb } from "./lib/firebase-admin"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: FirestoreAdapter(adminDb),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  // JWT 세션을 사용하더라도 adapter를 통해 유저가 DB에 저장됩니다.
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // 기존 세션 호환성을 위해 token.sub를 폴백으로 사용
        session.user.id = (token.id as string) || (token.sub as string);
      }
      return session;
    },
  },
})
