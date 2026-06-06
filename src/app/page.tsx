import Link from "next/link";
import { LogIn } from "lucide-react";
import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl md:text-5xl font-bold text-center text-gray-800 mb-8 tracking-tight">
          대학생 식사 가이드
        </h1>

        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-green-100 p-8 space-y-6 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-700 tracking-wide mb-2">Login</h2>
            <div className="h-1 w-12 bg-green-400 mx-auto rounded-full"></div>
          </div>

          <div className="mt-8"></div>

          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/main" });
            }}
          >
            <button type="submit" className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-xl transition-all">
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google로 로그인하기
            </button>
          </form>

          <div className="flex flex-col items-center justify-center space-y-3 pt-2 text-sm">
            <Link href="/main" className="text-gray-500 hover:text-green-600 transition-colors flex items-center gap-1 group">
              <span className="border-b border-transparent group-hover:border-green-600">게스트로 로그인</span>
              <LogIn className="w-3 h-3" />
            </Link>
            <div className="text-xs text-green-600/80 bg-green-50 px-3 py-1 rounded-full">
              게스트 로그인시 정보저장 X
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
