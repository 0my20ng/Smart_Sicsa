"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Sparkles, X, Plus, Loader2 } from "lucide-react";
import { getUserFridge, addIngredientToFridge, removeIngredientFromFridge } from "@/lib/firestore";

export default function FridgePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 세션 체크 및 데이터 로드
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      if (session?.user?.id) {
        loadFridge(session.user.id);
      } else {
        setIsLoading(false);
      }
    }
  }, [status, session, router]);

  const loadFridge = async (userId: string) => {
    try {
      setIsLoading(true);
      const data = await getUserFridge(userId);
      setIngredients(data);
    } catch (error) {
      console.error("Failed to load fridge:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => {
    // 키보드 이벤트의 경우 Enter키인지 확인
    if ("key" in e && e.key !== "Enter") return;
    
    const trimmed = inputValue.trim();
    if (!trimmed || !session?.user?.id) return;
    if (ingredients.includes(trimmed)) {
      setInputValue("");
      return;
    }

    // 낙관적 업데이트
    setIngredients((prev) => [...prev, trimmed]);
    setInputValue("");

    try {
      await addIngredientToFridge(session.user.id, trimmed);
    } catch (error) {
      console.error("Failed to add ingredient:", error);
      // 실패 시 롤백
      setIngredients((prev) => prev.filter((i) => i !== trimmed));
    }
  };

  const handleRemove = async (ingredient: string) => {
    if (!session?.user?.id) return;

    // 낙관적 업데이트
    setIngredients((prev) => prev.filter((i) => i !== ingredient));

    try {
      await removeIngredientFromFridge(session.user.id, ingredient);
    } catch (error) {
      console.error("Failed to remove ingredient:", error);
      // 실패 시 롤백
      setIngredients((prev) => [...prev, ingredient]);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#F9FBF9] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-green-500" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // Redirected by useEffect
  }

  return (
    <div className="min-h-screen bg-[#F9FBF9] flex flex-col font-sans">
      <Sidebar />

      <main className="flex-1 pt-24 pb-10 px-4 sm:px-8 md:px-12 max-w-5xl mx-auto w-full">
        {/* 헤더 섹션 */}
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-4xl font-black text-gray-800 flex items-center justify-center sm:justify-start gap-3 mb-4">
            <span className="text-5xl">🧊</span> 내 냉장고
          </h1>
          <p className="text-gray-500 text-lg font-medium">
            현재 보유하고 있는 식재료를 등록해두면, 메인 화면에서 언제든 한 번에 불러올 수 있습니다.
          </p>
        </div>

        {/* 재료 입력 영역 */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border-2 border-gray-100 mb-8">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="어떤 재료가 있나요? (예: 달걀, 김치)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleAdd}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 pl-6 pr-12 text-lg font-medium text-gray-800 focus:outline-none focus:border-green-400 focus:bg-white transition-colors placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!inputValue.trim()}
              className="bg-[#7CFC00] hover:bg-[#6EEB00] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-800 font-black px-8 rounded-2xl flex items-center gap-2 transition-all active:scale-95 shadow-sm"
            >
              <Plus className="w-6 h-6" />
              <span className="hidden sm:inline text-lg">추가하기</span>
            </button>
          </div>
        </div>

        {/* 보관 중인 재료 리스트 */}
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border-2 border-gray-100 min-h-[300px]">
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-green-500" />
            보관 중인 재료 <span className="text-gray-400 text-lg ml-2">{ingredients.length}개</span>
          </h2>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-10 h-10 animate-spin text-green-400" />
            </div>
          ) : ingredients.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {ingredients.map((item, idx) => (
                <div
                  key={idx}
                  className="group flex items-center gap-2 bg-[#E8F5E9] hover:bg-green-100 border border-green-200 px-5 py-3 rounded-2xl transition-all shadow-sm"
                >
                  <span className="text-lg font-bold text-green-800">{item}</span>
                  <button
                    onClick={() => handleRemove(item)}
                    className="text-green-600 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition-colors ml-1"
                    title={`${item} 삭제`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
              <span className="text-4xl mb-4">🛒</span>
              <p className="text-xl font-bold mb-2">냉장고가 텅 비었어요!</p>
              <p className="text-base text-gray-400">위 검색창에서 가지고 계신 재료를 채워보세요.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
