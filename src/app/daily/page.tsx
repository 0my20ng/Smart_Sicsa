"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { RefreshCw, Sparkles, UtensilsCrossed, Calendar, Heart, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toggleBookmark, checkBookmarkExists } from "@/lib/firestore";

// ══════════════════════════════════════════════════════════════════════════════
// [오늘의 레시피 데이터]
// 날짜를 시드(seed)로 사용하여 하루 동안 동일한 추천을 유지합니다.
// ══════════════════════════════════════════════════════════════════════════════
interface DailyRecipe {
  name: string;       // 음식 이름
  emoji: string;      // 이모지
  reason: string;     // 추천 이유
  tags: string[];     // 태그 (칼로리, 영양소 등)
  color: string;      // 카드 강조 색상 (tailwind gradient)
}

const RECIPE_POOL: DailyRecipe[] = [
  {
    name: "된장찌개",
    emoji: "🍲",
    reason: "오늘처럼 피곤한 날엔 구수한 된장의 따뜻함이 몸과 마음을 달래줍니다. 대두 발효식품으로 장 건강에도 최고예요!",
    tags: ["단백질", "발효식품", "따뜻한 국물", "한식"],
    color: "from-amber-400 to-orange-500",
  },
  {
    name: "김치볶음밥",
    emoji: "🍳",
    reason: "냉장고 속 재료만으로 뚝딱 만드는 자취생의 영웅! 익은 김치의 깊은 감칠맛이 입맛을 돋워줍니다.",
    tags: ["간편식", "유산균", "매콤", "자취생 필수"],
    color: "from-red-400 to-rose-500",
  },
  {
    name: "삼겹살",
    emoji: "🥓",
    reason: "스트레스를 날려버릴 고기가 필요한 날! 삼겹살의 풍부한 단백질이 지친 몸에 활력을 불어넣어 줍니다.",
    tags: ["단백질", "고열량", "기분전환", "회식"],
    color: "from-pink-400 to-red-400",
  },
  {
    name: "비빔밥",
    emoji: "🥗",
    reason: "오색 나물이 가득한 비빔밥은 다양한 채소와 영양소를 한 번에 섭취할 수 있는 완벽한 균형식입니다.",
    tags: ["균형영양", "채소", "건강식", "한식"],
    color: "from-green-400 to-emerald-500",
  },
  {
    name: "라면",
    emoji: "🍜",
    reason: "바쁜 하루 끝에 5분만에 완성하는 마법의 음식! 뜨거운 국물 한 모금에 모든 고민이 사라져요.",
    tags: ["간편식", "국물", "가성비", "야식"],
    color: "from-yellow-400 to-amber-500",
  },
  {
    name: "초밥",
    emoji: "🍱",
    reason: "가벼우면서도 품격 있는 한 끼. 신선한 생선의 오메가-3가 두뇌 활동을 향상시켜 공부 효율을 높여줍니다!",
    tags: ["오메가-3", "저칼로리", "프리미엄", "일식"],
    color: "from-sky-400 to-blue-500",
  },
  {
    name: "치킨",
    emoji: "🍗",
    reason: "오늘 하루 정말 고생했어요! 바삭한 치킨 한 조각으로 자신에게 작은 보상을 해주는 건 어떨까요?",
    tags: ["단백질", "고열량", "보상", "치맥"],
    color: "from-orange-400 to-yellow-400",
  },
  {
    name: "샐러드",
    emoji: "🥙",
    reason: "몸이 가벼워지고 싶은 날! 신선한 채소와 드레싱의 조화가 기분까지 상쾌하게 만들어 줍니다.",
    tags: ["다이어트", "저칼로리", "채소", "건강식"],
    color: "from-lime-400 to-green-500",
  },
  {
    name: "순두부찌개",
    emoji: "🍵",
    reason: "부드러운 순두부의 식감이 지친 속을 달래줍니다. 두부의 식물성 단백질은 근육 회복에도 탁월해요.",
    tags: ["저칼로리", "단백질", "따뜻한 국물", "건강식"],
    color: "from-red-300 to-orange-400",
  },
  {
    name: "파스타",
    emoji: "🍝",
    reason: "오늘은 특별한 날! 알덴테 파스타의 쫄깃한 식감과 풍부한 소스가 기분을 업 시켜줄 거예요.",
    tags: ["탄수화물", "포만감", "양식", "기분전환"],
    color: "from-yellow-300 to-amber-400",
  },
  {
    name: "떡볶이",
    emoji: "🌶️",
    reason: "매콤달콤한 소스의 매력! 캡사이신이 엔도르핀 분비를 촉진시켜 기분을 좋게 만들어 줍니다.",
    tags: ["분식", "매콤", "가성비", "간식"],
    color: "from-red-500 to-pink-500",
  },
  {
    name: "솥밥",
    emoji: "🍚",
    reason: "오늘은 정성을 담은 한 끼 어때요? 구수한 누룽지와 밥알 하나하나에서 느껴지는 온기가 마음까지 따뜻하게 합니다.",
    tags: ["한식", "든든함", "건강식", "전통"],
    color: "from-amber-300 to-yellow-400",
  },
  {
    name: "닭갈비",
    emoji: "🥘",
    reason: "고단한 하루, 불 앞에서 구워지는 닭갈비의 향기가 기억에 남을 추억을 만들어 줄 거예요.",
    tags: ["고단백", "매콤", "한식", "활력"],
    color: "from-orange-500 to-red-500",
  },
  {
    name: "돈까스",
    emoji: "🍛",
    reason: "바삭한 튀김옷 안에 촉촉한 고기! 달콤새콤한 소스와 함께라면 밥 한 공기는 기본이죠.",
    tags: ["포만감", "단백질", "일식", "가성비"],
    color: "from-yellow-500 to-amber-600",
  },
  {
    name: "국밥",
    emoji: "🥣",
    reason: "해장이 필요한 아침이든, 따뜻한 위로가 필요한 저녁이든. 뜨끈한 국밥 한 그릇이면 모든 게 괜찮아집니다.",
    tags: ["해장", "든든함", "국물", "한식"],
    color: "from-amber-500 to-orange-600",
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// [날짜 기반 시드 함수]
// 오늘 날짜를 숫자로 변환하여 배열 인덱스로 사용 → 하루 동안 동일한 추천 유지
// ══════════════════════════════════════════════════════════════════════════════
const getTodayIndex = (): number => {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return seed % RECIPE_POOL.length;
};

const getFormattedDate = (): string => {
  const now = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
};

// ══════════════════════════════════════════════════════════════════════════════
// [메인 컴포넌트]
// ══════════════════════════════════════════════════════════════════════════════
export default function DailyPage() {
  const [isSpinning, setIsSpinning] = useState(false);          // 돌림판 애니메이션 여부
  const [displayedRecipe, setDisplayedRecipe] = useState<DailyRecipe | null>(null); // 현재 표시 중인 레시피
  const [finalRecipe, setFinalRecipe] = useState<DailyRecipe | null>(null);         // 최종 확정 레시피
  const [isRevealed, setIsRevealed] = useState(false);          // 결과 공개 여부
  const [spinCount, setSpinCount] = useState(0);                // 돌림판 회전 카운트
  const todayIndex = getTodayIndex();
  const todayRecipe = RECIPE_POOL[todayIndex];
  
  const { data: session } = useSession();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);

  // 최종 레시피 확정 시 북마크 여부 확인
  useEffect(() => {
    if (finalRecipe && session?.user?.id) {
      checkBookmarkExists(session.user.id, finalRecipe.name).then((id) => {
        setIsBookmarked(!!id);
      });
    } else {
      setIsBookmarked(false);
    }
  }, [finalRecipe, session]);

  const handleBookmarkToggle = async () => {
    if (!session?.user?.id || !finalRecipe) return;
    try {
      setIsBookmarkLoading(true);
      const newStatus = await toggleBookmark({
        userId: session.user.id,
        type: "RECIPE",
        title: finalRecipe.name,
        description: finalRecipe.reason,
      });
      setIsBookmarked(newStatus);
    } catch (error) {
      console.error("북마크 실패:", error);
    } finally {
      setIsBookmarkLoading(false);
    }
  };

  // ── 돌림판 애니메이션 시작 ─────────────────────────────────────────────────
  const handleSpin = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);
    setIsRevealed(false);
    setFinalRecipe(null);

    let count = 0;
    const totalSpins = 20 + Math.floor(Math.random() * 10); // 20~30번 순환
    const spinInterval = setInterval(() => {
      // 무작위 레시피를 빠르게 순환
      const randomIdx = Math.floor(Math.random() * RECIPE_POOL.length);
      setDisplayedRecipe(RECIPE_POOL[randomIdx]);
      count++;

      // 마지막 5번은 속도를 늦추는 효과 (실제 구현은 timeout으로)
      if (count >= totalSpins) {
        clearInterval(spinInterval);

        // 최종 결과: 오늘 날짜 기반 고정값
        setTimeout(() => {
          setDisplayedRecipe(todayRecipe);
          setFinalRecipe(todayRecipe);
          setIsSpinning(false);
          setSpinCount((prev) => prev + 1);

          // 잠깐의 딜레이 후 결과 카드 공개
          setTimeout(() => {
            setIsRevealed(true);
          }, 400);
        }, 300);
      }
    }, 80);
  }, [isSpinning, todayRecipe]);

  // ── 페이지 마운트 시 자동 스핀 ────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSpin();
    }, 600);
    return () => clearTimeout(timer);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const currentDisplay = displayedRecipe || RECIPE_POOL[0];

  return (
    <div className="h-screen w-full bg-gradient-to-br from-[#f0fdf4] via-white to-[#dcfce7] flex overflow-hidden">
      <Sidebar />

      {/* ── 메인 콘텐츠 ─────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-12 overflow-y-auto">

        {/* 헤더 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold mb-4">
            <Calendar className="w-4 h-4" />
            {getFormattedDate()}
          </div>
          <h1 className="text-5xl font-black text-gray-800 mb-3 flex items-center gap-3 justify-center">
            <UtensilsCrossed className="w-12 h-12 text-green-500" />
            오늘의 레시피
          </h1>
          <p className="text-gray-500 text-lg font-medium">
            오늘 하루에 딱 맞는 음식을 추천해드려요!
          </p>
        </div>

        {/* 돌림판 카드 영역 */}
        <div className="w-full max-w-lg">

          {/* 스피닝 카드 */}
          <div
            className={`relative bg-white rounded-3xl shadow-2xl border-4 overflow-hidden transition-all duration-300
              ${isSpinning ? "border-green-300 scale-95" : isRevealed ? "border-green-400 scale-100" : "border-gray-200 scale-100"}`}
          >
            {/* 그라데이션 배너 */}
            <div className={`bg-gradient-to-r ${isSpinning || !isRevealed ? "from-gray-300 to-gray-400" : currentDisplay.color} h-3 transition-all duration-500`} />

            <div className="p-10 text-center">
              {/* 이모지 */}
              <div
                className={`text-9xl mb-6 select-none transition-all duration-150
                  ${isSpinning ? "blur-sm scale-90" : "blur-0 scale-100"}`}
              >
                {isSpinning ? currentDisplay.emoji : (isRevealed ? currentDisplay.emoji : "🍽️")}
              </div>

              {/* 음식 이름 및 북마크 버튼 */}
              <div
                className={`text-4xl font-black mb-4 transition-all duration-200 flex items-center justify-center gap-4
                  ${isSpinning ? "text-gray-300 blur-sm" : "text-gray-800 blur-0"}`}
              >
                {isSpinning
                  ? currentDisplay.name
                  : isRevealed
                  ? currentDisplay.name
                  : "???"}
                
                {/* 북마크 버튼 (결과 공개 후, 로그인 상태일 때만 표시) */}
                {isRevealed && !isSpinning && session?.user && (
                  <button
                    onClick={handleBookmarkToggle}
                    disabled={isBookmarkLoading}
                    className={`p-2 rounded-full transition-all border-2 flex-shrink-0 ${
                      isBookmarked
                        ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100"
                        : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-red-400"
                    }`}
                    title={isBookmarked ? "북마크 취소" : "북마크 저장"}
                  >
                    {isBookmarkLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Heart className="w-6 h-6" fill={isBookmarked ? "currentColor" : "none"} />
                    )}
                  </button>
                )}
              </div>

              {/* 스피닝 중 로딩 바 */}
              {isSpinning && (
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div className="bg-green-400 h-2 rounded-full animate-pulse" style={{ width: "70%" }} />
                </div>
              )}

              {/* 추천 이유 (공개 후에만 표시) */}
              {isRevealed && !isSpinning && (
                <div className="mt-4 space-y-4 animate-fadeIn">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-left">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                      <p className="text-gray-700 font-medium leading-relaxed text-base">
                        {currentDisplay.reason}
                      </p>
                    </div>
                  </div>

                  {/* 태그 */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {currentDisplay.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-white border-2 border-green-200 rounded-full text-sm font-bold text-green-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 하단 버튼 영역 */}
          <div className="mt-6 flex flex-col items-center gap-3">
            {/* 다시 돌리기 버튼 */}
            <button
              id="btn-spin-daily"
              onClick={handleSpin}
              disabled={isSpinning}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-xl font-black shadow-lg transition-all
                ${isSpinning
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-[#7CFC00] hover:bg-[#6EEB00] active:scale-95 text-gray-800 border-2 border-green-400 hover:shadow-xl"
                }`}
            >
              <RefreshCw className={`w-6 h-6 ${isSpinning ? "animate-spin" : ""}`} />
              {isSpinning ? "추천 중..." : spinCount === 0 ? "오늘의 레시피 추천받기" : "다시 돌리기"}
            </button>

            {/* 안내 문구 */}
            {isRevealed && !isSpinning && (
              <p className="text-xs text-gray-400 font-medium text-center animate-fadeIn">
                오늘({getFormattedDate()})의 추천은 매일 자정에 새로 바뀌어요 🌙
              </p>
            )}
          </div>
        </div>

        {/* 다른 레시피 힌트 (결과 공개 후) */}
        {isRevealed && !isSpinning && (
          <div className="mt-10 w-full max-w-lg animate-fadeIn">
            <p className="text-center text-sm font-bold text-gray-400 mb-4">이런 음식은 어때요?</p>
            <div className="grid grid-cols-3 gap-3">
              {RECIPE_POOL
                .filter((r) => r.name !== currentDisplay.name)
                .slice(0, 6)
                .map((recipe) => (
                  <div
                    key={recipe.name}
                    className="bg-white rounded-2xl border-2 border-gray-100 p-3 text-center hover:border-green-300 hover:scale-105 transition-all cursor-default shadow-sm"
                  >
                    <div className="text-3xl mb-1">{recipe.emoji}</div>
                    <p className="text-xs font-bold text-gray-600">{recipe.name}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* 커스텀 애니메이션 CSS */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out both;
        }
      `}</style>
    </div>
  );
}
