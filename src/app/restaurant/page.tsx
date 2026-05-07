"use client";

import Sidebar from "@/components/Sidebar";
import { MapPin, Navigation, Filter, Search } from "lucide-react";

export default function RestaurantPage() {
  return (
    <div className="h-screen w-full bg-white flex overflow-hidden">
      <Sidebar />
      
      {/* 1. Left Filter Panel (Matching Sketch) */}
      <div className="w-80 h-full border-r-2 border-gray-100 bg-[#F1F8E9] pt-24 px-6 flex flex-col gap-8 z-10">
        <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2">
          식당 추천
        </h2>

        <div className="space-y-6">
          {/* Price Filter */}
          <div className="space-y-3">
            <label className="text-xl font-black text-gray-700 block">금액</label>
            <div className="relative">
              <select className="w-full appearance-none bg-white border-2 border-gray-300 text-gray-700 py-4 px-5 rounded-2xl leading-tight focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all font-bold text-lg">
                <option>1만원 ~ 2만원</option>
                <option>1만원 이하</option>
                <option>2만원 ~ 3만원</option>
                <option>3만원 이상</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-3">
            <label className="text-xl font-black text-gray-700 block">종류</label>
            <div className="relative">
              <select className="w-full appearance-none bg-white border-2 border-gray-300 text-gray-700 py-4 px-5 rounded-2xl leading-tight focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all font-bold text-lg">
                <option>양식</option>
                <option>한식</option>
                <option>중식</option>
                <option>일식</option>
                <option>분식</option>
                <option>카페/디저트</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Search Button (Matching Sketch) */}
          <div className="pt-4">
            <button className="w-full bg-[#7CFC00] hover:bg-[#6EEB00] active:scale-95 text-gray-800 font-black py-4 px-4 rounded-2xl border-2 border-green-400 shadow-lg transition-all flex items-center justify-center gap-2 text-xl">
              탐색
            </button>
          </div>
        </div>
      </div>

      {/* 2. Right Map Area (Matching Sketch) */}
      <div className="flex-1 relative bg-[#F5F5F5] flex flex-col items-center justify-center">
        {/* Placeholder for real map */}
        <div className="text-center opacity-20 flex flex-col items-center select-none">
          <MapPin className="w-32 h-32 text-gray-400 mb-4" />
          <h1 className="text-8xl font-black text-gray-400 tracking-[1rem]">지도</h1>
          <p className="text-gray-400 mt-4 text-2xl font-bold">이곳에 지도가 렌더링됩니다</p>
        </div>

        {/* Floating Current Location Button (Matching Sketch) */}
        <button className="absolute top-8 right-8 bg-white hover:bg-gray-50 text-green-500 p-5 rounded-3xl shadow-xl border-2 border-green-100 transition-all hover:scale-110 active:scale-90 group z-20">
          <MapPin className="w-10 h-10 fill-current" />
        </button>
      </div>
    </div>
  );
}
