"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, Utensils, MapPin, ChefHat,
  Bookmark, ChevronRight, Sparkles, Lock
} from "lucide-react";

export default function Sidebar() {
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
            <p className="text-sm text-gray-500 mt-2 font-bold tracking-tight">
              대학생 맞춤형 식사 가이드
            </p>
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

                {/* 내 냉장고 — 로그인 후 이용 가능 (보류) */}
                <li>
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
                </li>

                {/* 레시피 북마크 — 로그인 후 이용 가능 (보류) */}
                <li>
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
                {/* 식당 북마크 — 로그인 후 이용 가능 (보류) */}
                <li>
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
                </li>
              </ul>
            </div>

          </nav>

          {/* ── 하단 로그아웃 ─────────────────────────────────────────────────── */}
          <div className="mt-auto pt-10 border-t border-green-200">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-5 px-4 rounded-3xl text-gray-500 hover:bg-white hover:text-red-500 transition-all text-base font-black shadow-inner"
            >
              로그아웃
            </Link>
          </div>

        </div>
      </aside>
    </>
  );
}
