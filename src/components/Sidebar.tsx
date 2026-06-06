"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, Utensils, MapPin, ChefHat,
  Bookmark, ChevronRight, Sparkles, Lock
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function Sidebar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const closeSidebar = () => setIsOpen(false);

  // 현재 경로 활성화 여부
  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  return (
    <>
      {/* ── 햄버거 버튼 ────────────────────────────────────────────────────── */}
      <div className="fixed top-6 left-6 z-[9999]">
        <button
          onClick={toggleSidebar}
          className={`p-3 rounded-2xl backdrop-blur-md transition-all shadow-xl border-2
            ${isOpen
              ? "bg-white text-gray-800 border-gray-200"
              : "bg-green-500 text-white border-green-400 hover:bg-green-600 hover:scale-110 active:scale-95"
            }`}
        >
          {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
        </button>
      </div>

      {/* ── 오버레이 ────────────────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9997] transition-opacity duration-300
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={closeSidebar}
      />

      {/* ── 사이드바 본체 ────────────────────────────────────────────────────── */}
      <aside
        className="fixed top-0 left-0 h-full w-80 bg-[#E8F5E9] border-r border-green-100 shadow-[20px_0_50px_rgba(0,0,0,0.1)] z-[9998] transition-transform duration-300 ease-in-out"
        style={{ transform: isOpen ? "translateX(0)" : "translateX(-100%)" }}
      >
        <div className="p-8 pt-24 flex flex-col h-full overflow-y-auto">

          {/* 헤더 */}
          <div className="mb-12 px-2">
            <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2">
              <ChefHat className="text-green-600 w-10 h-10" />
              Smart Sicsa
            </h2>
            {session?.user ? (
              <div className="flex items-center gap-3 mt-6 p-4 bg-white rounded-2xl shadow-sm border border-green-100">
                {session.user.image ? (
                  <img src={session.user.image} alt="Profile" className="w-12 h-12 rounded-full border-2 border-green-200" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xl">
                    {session.user.name?.[0] || 'U'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="font-bold text-gray-800 text-lg truncate">{session.user.name}님</p>
                  <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-2 font-bold tracking-tight">
                대학생 맞춤형 식사 가이드
              </p>
            )}
          </div>

          <nav className="space-y-8">

            {/* ── 레시피 추천 섹션 ───────────────────────────────────────────── */}
            <div>
              <Link href="/main" onClick={closeSidebar}>
                <div
                  className={`w-full text-left px-6 py-5 rounded-3xl font-black text-2xl flex items-center justify-between mb-4 transition-all shadow-lg
                    ${isActive("/main") && !isActive("/restaurant") && !isActive("/daily")
                      ? "bg-[#7CFC00] text-gray-800 scale-105 border-2 border-green-400"
                      : "bg-white text-green-800 border-2 border-green-100 hover:bg-green-50"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Utensils className="w-7 h-7" />
                    레시피 추천
                  </div>
                  <ChevronRight
                    className={`w-6 h-6 transition-transform
                      ${isActive("/main") && !isActive("/restaurant") && !isActive("/daily") ? "rotate-90" : ""}`}
                  />
                </div>
              </Link>

              <ul className="space-y-3 px-6 border-l-4 border-green-200 ml-6">
                {/* 오늘의 레시피 — 구현 완료 */}
                <li>
                  <Link
                    href="/daily"
                    className={`flex items-center gap-2 px-4 py-2 font-bold text-lg transition-colors rounded-xl
                      ${isActive("/daily")
                        ? "text-green-700 bg-green-100"
                        : "text-gray-700 hover:text-green-700 hover:bg-green-50"
                      }`}
                    onClick={closeSidebar}
                  >
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    오늘의 레시피
                  </Link>
                </li>

                {/* 내 냉장고 */}
                <li>
                  {session?.user ? (
                    <Link
                      href="/fridge"
                      className={`flex items-center gap-2 px-4 py-2 font-bold text-lg transition-colors rounded-xl
                        ${isActive("/fridge") ? "text-green-700 bg-green-100" : "text-gray-700 hover:text-green-700 hover:bg-green-50"}`}
                      onClick={closeSidebar}
                    >
                      <Sparkles className="w-4 h-4 text-green-500" />
                      내 냉장고
                    </Link>
                  ) : (
                    <div
                      className="flex items-center gap-2 px-4 py-2 text-gray-400 font-bold text-lg cursor-not-allowed select-none"
                      title="로그인 후 이용 가능합니다"
                    >
                      <Lock className="w-4 h-4 text-gray-300" />
                      내 냉장고
                      <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-semibold">
                        로그인 필요
                      </span>
                    </div>
                  )}
                </li>

                {/* 레시피 북마크 */}
                <li>
                  {session?.user ? (
                    <Link
                      href="/bookmarks/recipe"
                      className={`flex items-center gap-2 px-4 py-2 font-bold text-lg transition-colors rounded-xl
                        ${isActive("/bookmarks/recipe") ? "text-green-700 bg-green-100" : "text-gray-700 hover:text-green-700 hover:bg-green-50"}`}
                      onClick={closeSidebar}
                    >
                      <Bookmark className="w-4 h-4 text-green-500" />
                      레시피 북마크
                    </Link>
                  ) : (
                    <div
                      className="flex items-center gap-2 px-4 py-2 text-gray-400 font-bold text-lg cursor-not-allowed select-none"
                      title="로그인 후 이용 가능합니다"
                    >
                      <Bookmark className="w-4 h-4 text-gray-300" />
                      레시피 북마크
                      <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-semibold">
                        로그인 필요
                      </span>
                    </div>
                  )}
                </li>
              </ul>
            </div>

            {/* ── 식당 추천 섹션 ─────────────────────────────────────────────── */}
            <div>
              <Link href="/restaurant" onClick={closeSidebar}>
                <div
                  className={`w-full text-left px-6 py-5 rounded-3xl font-black text-2xl flex items-center justify-between mb-4 transition-all shadow-lg
                    ${isActive("/restaurant")
                      ? "bg-[#7CFC00] text-gray-800 scale-105 border-2 border-green-400"
                      : "bg-white text-green-800 border-2 border-green-100 hover:bg-green-50"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-7 h-7" />
                    식당 추천
                  </div>
                  <ChevronRight
                    className={`w-6 h-6 transition-transform ${isActive("/restaurant") ? "rotate-90" : ""}`}
                  />
                </div>
              </Link>

              <ul className="space-y-3 px-6 border-l-4 border-green-200 ml-6">
                {/* 식당 북마크 */}
                <li>
                  {session?.user ? (
                    <Link
                      href="/bookmarks/restaurant"
                      className={`flex items-center gap-2 px-4 py-2 font-bold text-lg transition-colors rounded-xl
                        ${isActive("/bookmarks/restaurant") ? "text-green-700 bg-green-100" : "text-gray-700 hover:text-green-700 hover:bg-green-50"}`}
                      onClick={closeSidebar}
                    >
                      <Bookmark className="w-4 h-4 text-green-500" />
                      식당 북마크
                    </Link>
                  ) : (
                    <div
                      className="flex items-center gap-2 px-4 py-2 text-gray-400 font-bold text-lg cursor-not-allowed select-none"
                      title="로그인 후 이용 가능합니다"
                    >
                      <Bookmark className="w-4 h-4 text-gray-300" />
                      식당 북마크
                      <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-semibold">
                        로그인 필요
                      </span>
                    </div>
                  )}
                </li>
              </ul>
            </div>

          </nav>

          {/* ── 하단 로그아웃/로그인 ─────────────────────────────────────────────────── */}
          <div className="mt-auto pt-10 border-t border-green-200">
            {session?.user ? (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center justify-center gap-2 w-full py-5 px-4 rounded-3xl text-gray-500 hover:bg-white hover:text-red-500 transition-all text-base font-black shadow-inner"
              >
                로그아웃
              </button>
            ) : (
              <Link
                href="/"
                className="flex items-center justify-center gap-2 w-full py-5 px-4 rounded-3xl text-green-600 hover:bg-white hover:text-green-700 transition-all text-base font-black shadow-inner"
              >
                로그인하러 가기
              </Link>
            )}
          </div>

        </div>
      </aside>
    </>
  );
}
