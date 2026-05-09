"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Search, X, Image as ImageIcon, Loader2, ArrowLeft } from "lucide-react";

// ─────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────
interface Recipe {
  id: string | number;
  title: string;
  ingredients: string[];
  description: string;
  imageUrl: string | null;
  link?: string;
  missingIngredients?: string[];
}

export default function MainPage() {
  // ─── 상태 관리 ───
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState(""); // 재료 입력 필드 값
  const [searchQuery, setSearchQuery] = useState(""); // 검색바 값
  const [recipes, setRecipes] = useState<Recipe[]>([]); // AI 추천 레시피 목록
  const [isLoading, setIsLoading] = useState(false); // 검색 로딩 상태
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null); // 선택된 레시피 (상세 뷰)

  // ─── 앱 시작 시 Python 백엔드에서 저장된 재료 불러오기 ───
  useEffect(() => {
    fetch("http://127.0.0.1:8000/ingredients")
      .then((res) => res.json())
      .then((data) => setSelectedIngredients(data))
      .catch((err) => console.error("백엔드 재료 불러오기 실패 (서버가 꺼져있을 수 있습니다):", err));
  }, []);

  // ─── 재료 추가: Enter 키 입력 시 로컬 상태 + 백엔드 저장 ───
  const handleAddIngredient = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !inputValue.trim()) return;
    const trimmed = inputValue.trim();

    // 중복 재료 방지 (로컬 처리)
    if (selectedIngredients.includes(trimmed)) {
      setInputValue("");
      return;
    }

    // 백엔드에 저장 시도 (서버가 꺼져있으면 로컬에만 추가)
    try {
      const response = await fetch("http://127.0.0.1:8000/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await response.json();
      // 백엔드 응답으로 전체 목록 동기화
      setSelectedIngredients(data.ingredients);
    } catch {
      // 백엔드 연결 실패 시 로컬 상태에만 추가
      setSelectedIngredients((prev) => [...prev, trimmed]);
    }

    setInputValue("");
  };

  // ─── 재료 삭제: X 버튼 클릭 시 로컬에서만 제거 ───
  const removeIngredient = (ingredient: string) => {
    setSelectedIngredients((prev) => prev.filter((item) => item !== ingredient));
  };

  // ─── AI 레시피 추천 검색 (Python FastAPI 백엔드 /recommend-recipes 호출) ───
  const handleSearch = async () => {
    setIsLoading(true);
    setSelectedRecipe(null); // 검색 시 상세 뷰 닫기
    try {
      const response = await fetch("http://127.0.0.1:8000/recommend-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail ?? "추천 API 응답 오류");
      }

      const data = await response.json();
      setRecipes(data.recipes ?? []);
    } catch (error: any) {
      console.error("레시피 추천 요청 실패:", error);
      alert(error.message ?? "레시피를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─────────────────────────────────────────
  // 렌더링
  // ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F9FBF9] flex flex-col font-sans">
      <Sidebar />

      <main className="flex-1 pt-24 pb-10 px-4 sm:px-8 md:px-12 max-w-5xl mx-auto w-full">

        {/* ── 상세 뷰 (레시피 클릭 시) ── */}
        {selectedRecipe ? (
          <div className="space-y-6">
            <button
              onClick={() => setSelectedRecipe(null)}
              className="flex items-center text-gray-500 hover:text-green-500 font-bold transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" /> 목록으로 돌아가기
            </button>

            <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 shadow-sm">
              <h2 className="text-4xl font-black text-gray-800 mb-8">{selectedRecipe.title}</h2>

              {/* 대표 이미지 */}
              {selectedRecipe.imageUrl ? (
                <div className="w-full h-[400px] rounded-2xl overflow-hidden mb-8 border-2 border-gray-100">
                  <img
                    src={selectedRecipe.imageUrl}
                    alt={selectedRecipe.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-[400px] bg-gray-50 rounded-2xl flex flex-col items-center justify-center text-gray-400 mb-8 border-2 border-dashed border-gray-200">
                  <ImageIcon className="w-16 h-16 opacity-50 mb-4" />
                  <span className="font-bold text-lg">대표 이미지가 없습니다</span>
                </div>
              )}

              <div className="space-y-8">
                {/* 보유 재료 */}
                <div>
                  <h3 className="text-xl font-black text-gray-700 mb-4">보유 재료</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipe.ingredients.map((ing, idx) => (
                      <span
                        key={idx}
                        className="px-5 py-2.5 rounded-xl text-base font-bold bg-[#7CFC00]/20 text-gray-700 border border-green-200"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 부족한 재료 */}
                {selectedRecipe.missingIngredients && selectedRecipe.missingIngredients.length > 0 && (
                  <div>
                    <h3 className="text-xl font-black text-gray-700 mb-4">부족한 재료</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedRecipe.missingIngredients.map((ing, idx) => (
                        <span
                          key={idx}
                          className="px-5 py-2.5 rounded-xl text-base font-bold bg-red-50 text-red-500 border border-red-200"
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 요리 설명 */}
                <div>
                  <h3 className="text-xl font-black text-gray-700 mb-4">요리 설명</h3>
                  <p className="text-gray-600 text-lg leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    {selectedRecipe.description}
                  </p>
                </div>

                {/* 원본 레시피 이동 버튼 */}
                <div className="pt-10 flex justify-center">
                  <button
                    onClick={() => selectedRecipe.link && window.open(selectedRecipe.link, "_blank")}
                    disabled={!selectedRecipe.link || selectedRecipe.link === "#"}
                    className="bg-[#7CFC00] hover:bg-[#6EEB00] active:scale-95 disabled:bg-gray-200 disabled:border-gray-300 disabled:text-gray-400 text-gray-800 font-black py-5 px-12 rounded-2xl shadow-md transition-all text-xl border-2 border-green-400 w-full sm:w-auto"
                  >
                    원본 레시피 이동하기
                  </button>
                </div>
              </div>
            </div>
          </div>

        ) : (
          /* ── 메인 검색 뷰 ── */
          <div className="space-y-8">

            {/* 1. 재료 입력 & 냉장고 불러오기 버튼 */}
            <div className="flex gap-4 items-center">
              <div className="flex-1 bg-white border-2 border-gray-200 rounded-2xl p-4 flex flex-wrap gap-2 min-h-[4.5rem] items-center">
                {/* 선택된 재료 태그 목록 */}
                {selectedIngredients.map((ingredient, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-[#E8F5E9] text-gray-800 border border-green-300"
                  >
                    {ingredient}
                    <button
                      onClick={() => removeIngredient(ingredient)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
                {/* 재료 입력 필드 (Enter로 추가) */}
                <input
                  type="text"
                  placeholder="재료 추가..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleAddIngredient}
                  className="flex-1 min-w-[120px] outline-none bg-transparent text-lg ml-2 placeholder:text-gray-300"
                />
              </div>

              <button
                className="bg-[#7CFC00] hover:bg-[#6EEB00] active:scale-95 text-gray-800 font-black py-4 px-8 rounded-2xl border-2 border-green-400 shadow-md transition-all flex flex-col items-center justify-center min-w-[160px] h-[4.5rem]"
              >
                <span>냉장고</span>
                <span>불러오기</span>
              </button>
            </div>

            {/* 2. 레시피 검색바 */}
            <div className="relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="block w-full pr-14 pl-6 py-5 bg-white border-2 border-gray-300 rounded-2xl placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-green-100 focus:border-green-400 text-xl transition-all shadow-sm"
                placeholder="레시피 검색하기..."
              />
              <button
                onClick={handleSearch}
                className="absolute inset-y-0 right-0 pr-6 flex items-center"
              >
                <Search className="h-8 w-8 text-gray-800 hover:text-green-500 transition-colors" />
              </button>
            </div>

            {/* 3. 레시피 목록 */}
            <div className="space-y-6 mt-10">
              {isLoading ? (
                /* 로딩 중 */
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Loader2 className="w-12 h-12 animate-spin mb-4 text-green-500" />
                  <p className="text-lg font-medium">Gemini가 맛있는 레시피를 찾는 중...</p>
                </div>

              ) : recipes.length > 0 ? (
                /* AI 추천 레시피 목록 */
                recipes.map((recipe, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedRecipe(recipe)}
                    className="bg-white border-b-2 border-gray-100 pb-8 flex flex-col sm:flex-row gap-6 group cursor-pointer hover:bg-gray-50/50 rounded-2xl transition-all p-4"
                  >
                    {/* 이미지 영역 */}
                    <div className="w-full sm:w-56 h-44 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 flex-shrink-0 group-hover:border-green-300 transition-all overflow-hidden">
                      {recipe.imageUrl ? (
                        <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                          <span className="text-sm font-bold">음식 사진</span>
                        </>
                      )}
                    </div>

                    {/* 컨텐츠 */}
                    <div className="flex-1 flex flex-col pt-2">
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="text-sm font-black text-gray-400">재료 :</span>
                        <div className="flex flex-wrap gap-2">
                          {recipe.ingredients.map((ing, idx) => (
                            <span key={idx} className="px-3 py-1 rounded-full text-sm font-bold bg-[#7CFC00]/20 text-gray-700 border border-green-200">
                              {ing}
                            </span>
                          ))}
                          {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                            <>
                              <span className="text-sm font-black text-red-400 ml-2">부족한 재료 :</span>
                              {recipe.missingIngredients.map((ing, idx) => (
                                <span key={idx} className="px-3 py-1 rounded-full text-sm font-bold bg-red-50 text-red-500 border border-red-200">
                                  {ing}
                                </span>
                              ))}
                            </>
                          )}
                        </div>
                      </div>

                      <h3 className="text-2xl font-black text-gray-800 mb-3">{recipe.title}</h3>
                      <div className="h-0.5 w-full bg-gray-100 mb-4"></div>
                      <p className="text-gray-500 text-lg leading-relaxed font-medium line-clamp-2">
                        {recipe.description}
                      </p>
                    </div>
                  </div>
                ))

              ) : (
                /* 빈 상태 */
                <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">
                  <p className="text-xl font-medium">식재료를 입력하고 레시피를 검색해보세요!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
