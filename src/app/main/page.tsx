"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Search, X, Image as ImageIcon } from "lucide-react";

export default function MainPage() {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [recipes, setRecipes] = useState([]); // AI로부터 받은 레시피 저장
  const [ingredientInput, setIngredientInput] = useState("");
  const [loading, setLoading] = useState(false); // 로딩 상태

  // 서버에서 재료 불러오기
  useEffect(() => {
    fetch("http://127.0.0.1:8000/ingredients")
      .then((res) => res.json())
      .then((data) => setSelectedIngredients(data))
      .catch(err => console.error("Failed to fetch ingredients:", err));
  }, []);

  // 재료 추가 함수
  const addIngredient = async () => {
    if (!ingredientInput.trim()) return;

    try {
      const response = await fetch("http://127.0.0.1:8000/ingredients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: ingredientInput,
        }),
      });

      const data = await response.json();
      setSelectedIngredients(data.ingredients);
      setIngredientInput("");
    } catch (err) {
      console.error("Failed to add ingredient:", err);
    }
  };

  const mockRecipes = [
    {
      id: 1,
      title: "간장계란밥",
      ingredients: ["계란", "간장", "참기름"],
      description: "바쁜 대학생을 위한 5분 컷 초간단 레시피! 짭쪼름하고 고소한 맛이 일품입니다.",
      imageUrl: null
    },
    {
      id: 2,
      title: "양배추 팽이버섯 볶음",
      ingredients: ["양배추", "팽이버섯", "굴소스"],
      description: "다이어트와 건강을 동시에! 아삭한 식감과 감칠맛이 살아있는 저칼로리 요리입니다.",
      imageUrl: null
    }
  ];

  return (
    <div className="min-h-screen bg-[#F9FBF9] flex flex-col font-sans">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 pt-24 pb-10 px-4 sm:px-8 md:px-12 max-w-5xl mx-auto w-full">
        <div className="space-y-8">

          {/* 1. Ingredients Input & Refrigerator Button */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 bg-white border-2 border-gray-200 rounded-2xl p-4 flex flex-wrap gap-2 min-h-[4.5rem] items-center">
              {selectedIngredients.map((ingredient, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-[#E8F5E9] text-gray-800 border border-green-300"
                >
                  {ingredient}
                  <button
                    onClick={() => {
                      // 삭제 기능: 로컬 상태에서 제거 (필요 시 백엔드 삭제 API 연동 가능)
                      setSelectedIngredients(selectedIngredients.filter((_, i) => i !== idx));
                    }}
                    className="hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="재료 추가..."
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addIngredient();
                  }
                }}
                className="flex-1 min-w-[120px] outline-none bg-transparent text-lg ml-2 placeholder:text-gray-300"
              />
            </div>

            <button
              onClick={addIngredient}
              className="bg-[#7CFC00] hover:bg-[#6EEB00] active:scale-95 text-gray-800 font-black py-4 px-8 rounded-2xl border-2 border-green-400 shadow-md transition-all flex flex-col items-center justify-center min-w-[160px] h-[4.5rem]"
            >
              <span>냉장고</span>
              <span>불러오기</span>
            </button>
          </div>

          {/* 2. Search Bar */}
          <div className="relative group">
            <input
              type="text"
              className="block w-full pr-14 pl-6 py-5 bg-white border-2 border-gray-300 rounded-2xl leading-5 bg-transparent placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-green-100 focus:border-green-400 text-xl transition-all shadow-sm"
              placeholder="레시피 검색하기..."
            />
            <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
              <Search className="h-8 w-8 text-gray-800" />
            </div>
          </div>

          {/* 3. Recipe List */}
          <div className="space-y-6 mt-10">
            {mockRecipes.map((recipe) => (
              <div key={recipe.id} className="bg-white border-b-2 border-gray-100 pb-8 flex flex-col sm:flex-row gap-6 group cursor-pointer hover:bg-gray-50/50 rounded-2xl transition-all p-4">

                {/* Image Placeholder */}
                <div className="w-full sm:w-56 h-44 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 flex-shrink-0 group-hover:border-green-300 transition-all">
                  <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                  <span className="text-sm font-bold">음식 사진</span>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col pt-2">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-sm font-black text-gray-400">재료 :</span>
                    <div className="flex flex-wrap gap-2">
                      {recipe.ingredients.map((ing, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-full text-sm font-bold bg-[#7CFC00]/20 text-gray-700 border border-green-200">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-gray-800 mb-3 inline-block">
                    {recipe.title}
                  </h3>

                  <div className="h-0.5 w-full bg-gray-100 mb-4"></div>

                  <p className="text-gray-500 text-lg leading-relaxed font-medium">
                    {recipe.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
