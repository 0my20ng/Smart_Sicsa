"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Search, X, Image as ImageIcon, Loader2, ArrowLeft, Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { getUserFridge, toggleBookmark, checkBookmarkExists } from "@/lib/firestore";

// 백엔드 API가 Next.js 서버리스 함수로 통합되어 로컬/외부 구분이 불필요해졌습니다.

// ─────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────
interface Recipe {
  id?: string | number;
  title: string;
  ingredients: string[];
  description: string;
  imageUrl: string | null;
  link?: string;
  missingIngredients?: string[];
}

// ─────────────────────────────────────────
// 에러 메시지 파싱 헬퍼
// ─────────────────────────────────────────
async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const err = await response.json();
    return err.detail ?? "알 수 없는 오류가 발생했습니다.";
  } catch {
    return `서버 오류 (HTTP ${response.status})`;
  }
}

// ─────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────
export default function MainPage() {
  // ── 상태 관리 ──
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { data: session } = useSession();
  const [isFridgeLoading, setIsFridgeLoading] = useState(false);
  
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);

  // 선택된 레시피 변경 시 북마크 여부 확인
  useEffect(() => {
    if (selectedRecipe && session?.user?.id) {
      checkBookmarkExists(session.user.id, selectedRecipe.title).then((id) => {
        setIsBookmarked(!!id);
      });
    } else {
      setIsBookmarked(false);
    }
  }, [selectedRecipe, session]);

  const handleBookmarkToggle = async () => {
    if (!session?.user?.id || !selectedRecipe) return;
    try {
      setIsBookmarkLoading(true);
      const newStatus = await toggleBookmark({
        userId: session.user.id,
        type: "RECIPE",
        title: selectedRecipe.title,
        link: selectedRecipe.link,
        imageUrl: selectedRecipe.imageUrl || "",
        description: selectedRecipe.description,
      });
      setIsBookmarked(newStatus);
    } catch (error) {
      console.error("북마크 실패:", error);
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  // ─────────────────────────────────────────
  // 백엔드가 Stateless로 전환되었으므로 초기 재료 목록은 비어있습니다.
  // 추후 로그인 완료 시 Firebase Firestore에서 '내 냉장고' 데이터를 불러오도록 연동합니다.
  // ─────────────────────────────────────────
  useEffect(() => {
    // 임시 로컬 저장소 등에서 불러올 수 있음
  }, []);

  // ─────────────────────────────────────────
  // 내 냉장고 불러오기
  // ─────────────────────────────────────────
  const handleLoadFridge = async () => {
    if (!session?.user?.id) return;
    try {
      setIsFridgeLoading(true);
      const fridgeIngredients = await getUserFridge(session.user.id);
      // 기존 재료에 냉장고 재료를 병합 (중복 제거)
      setSelectedIngredients((prev) => Array.from(new Set([...prev, ...fridgeIngredients])));
    } catch (error) {
      console.error("냉장고 불러오기 실패:", error);
    } finally {
      setIsFridgeLoading(false);
    }
  };

  // ─────────────────────────────────────────
  // 재료 추가 (Enter 키)
  // ─────────────────────────────────────────
  const handleAddIngredient = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !inputValue.trim()) return;
    const trimmed = inputValue.trim();

    // 중복 방지 (로컬 처리)
    if (selectedIngredients.includes(trimmed)) {
      setInputValue("");
      return;
    }

    // 프론트엔드 로컬 상태 업데이트 (추후 Firestore 저장 로직 추가)
    setSelectedIngredients((prev) => [...prev, trimmed]);
    setInputValue("");
  };

  // ─────────────────────────────────────────
  // 재료 삭제 (X 버튼)
  // ─────────────────────────────────────────
  const removeIngredient = async (ingredient: string) => {
    // 프론트엔드 로컬 상태 업데이트 (추후 Firestore 삭제 로직 추가)
    setSelectedIngredients((prev) => prev.filter((item) => item !== ingredient));
  };

  // ─────────────────────────────────────────
  // AI 레시피 추천 검색
  // ─────────────────────────────────────────
  const handleSearch = async () => {
    setError(null);
    setIsLoading(true);
    setSelectedRecipe(null);

    try {
      const response = await fetch("/api/recommend-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          // ✅ 버그 수정: 프론트의 재료 목록을 직접 전송
          ingredients: selectedIngredients,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          setIsRateLimited(true);
          setIsLoading(false);
          return;
        }
        const msg = await parseErrorMessage(response);
        setError(msg);
        setIsLoading(false);
        return;
      }

      setIsRateLimited(false);
      const data = await response.json();
      setRecipes(data.recipes ?? []);
    } catch {
      setError("서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.");
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

      {/* 429 Rate Limit 에러 모달 */}
      {isRateLimited && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl transform transition-all text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⏳</span>
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-4">요청이 너무 많아요!</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              현재 무료 버전 AI를 사용 중이라 한 번에 많은 레시피를 검색할 수 없습니다.<br/>
              <span className="font-bold text-red-500">약 15~20초 정도</span> 기다리신 후 다시 시도해주세요.
            </p>
            <button
              onClick={() => setIsRateLimited(false)}
              className="bg-[#7CFC00] hover:bg-[#6EEB00] active:scale-95 text-gray-800 font-black py-4 px-8 rounded-2xl w-full transition-all text-lg shadow-md border-2 border-green-400"
            >
              알겠습니다
            </button>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
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

            <div className="bg-white border-2 border-gray-100 rounded-3xl p-8 shadow-sm relative">
              <div className="flex justify-between items-start mb-8 gap-4">
                <h2 className="text-4xl font-black text-gray-800">{selectedRecipe.title}</h2>
                {session?.user && (
                  <button
                    onClick={handleBookmarkToggle}
                    disabled={isBookmarkLoading}
                    className={`p-3 rounded-2xl transition-all border-2 ${
                      isBookmarked
                        ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100"
                        : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-red-400"
                    }`}
                    title={isBookmarked ? "북마크 취소" : "북마크 저장"}
                  >
                    {isBookmarkLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <Heart className="w-8 h-8" fill={isBookmarked ? "currentColor" : "none"} />
                    )}
                  </button>
                )}
              </div>

              {/* 대표 이미지 */}
              {selectedRecipe.imageUrl ? (
                <div className="w-full h-[400px] rounded-2xl overflow-hidden mb-8 border-2 border-gray-100">
                  <img
                    src={selectedRecipe.imageUrl}
                    alt={selectedRecipe.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // 이미지 로딩 실패 시 대체 처리
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      e.currentTarget.parentElement?.classList.add("flex", "items-center", "justify-center", "bg-gray-50");
                    }}
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
                  <p className="text-gray-600 text-lg leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100 whitespace-pre-wrap">
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
                      aria-label={`${ingredient} 삭제`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
                {/* 재료 입력 필드 (Enter로 추가) */}
                <input
                  type="text"
                  placeholder="재료 추가 후 Enter..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleAddIngredient}
                  className="flex-1 min-w-[120px] outline-none bg-transparent text-lg ml-2 placeholder:text-gray-300 text-black"
                />
              </div>

              {/* 냉장고 불러오기 버튼 */}
              <button
                onClick={handleLoadFridge}
                disabled={!session?.user || isFridgeLoading}
                className={`${
                  !session?.user
                    ? "bg-gray-100 hover:bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white hover:bg-green-50 text-green-600 border-green-200 hover:border-green-300"
                } font-black py-4 px-8 rounded-2xl border-2 shadow-sm transition-all flex flex-col items-center justify-center min-w-[160px] h-[4.5rem]`}
                title={!session?.user ? "로그인 후 사용 가능합니다" : "내 냉장고 데이터 불러오기"}
              >
                {isFridgeLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                ) : (
                  <>
                    <span>냉장고</span>
                    <span>불러오기</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. 레시피 검색바 */}
            <div className="relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="block w-full pr-14 pl-6 py-5 bg-white border-2 border-gray-300 rounded-2xl placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-green-100 focus:border-green-400 text-xl transition-all shadow-sm text-black"
                placeholder="레시피 검색하기..."
              />
              <button
                onClick={handleSearch}
                className="absolute inset-y-0 right-0 pr-6 flex items-center"
                aria-label="레시피 검색"
              >
                <Search className="h-8 w-8 text-gray-800 hover:text-green-500 transition-colors" />
              </button>
            </div>

            {/* 3. 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl px-6 py-4 text-red-600 font-bold flex items-center justify-between">
                <span>⚠️ {error}</span>
                <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* 4. 레시피 목록 */}
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
                        <img
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // 이미지 깨질 때 아이콘 대체
                            e.currentTarget.style.display = "none";
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="flex flex-col items-center justify-center w-full h-full text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg><span class="text-sm font-bold">이미지 없음</span></div>`;
                            }
                          }}
                        />
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
                      <p className="text-gray-500 text-lg leading-relaxed font-medium line-clamp-2 whitespace-pre-wrap">
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
