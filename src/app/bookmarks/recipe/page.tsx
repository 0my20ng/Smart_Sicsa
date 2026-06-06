"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Bookmark, Heart, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { getUserBookmarks, removeBookmark, BookmarkData } from "@/lib/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RecipeBookmarksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/main");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.id) {
        getUserBookmarks(session.user.id, "RECIPE")
          .then(setBookmarks)
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }
  }, [status, session]);

  const handleRemove = async (id: string) => {
    try {
      await removeBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      console.error("북마크 삭제 실패:", error);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="h-screen w-full bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#F5F5F5] flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black text-gray-800 mb-8 flex items-center gap-3">
            <Heart className="w-10 h-10 text-red-500 fill-current" />
            내 레시피 북마크
          </h1>

          {bookmarks.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
              <Bookmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-500 mb-2">아직 북마크한 레시피가 없어요!</p>
              <p className="text-gray-400 mb-6">마음에 드는 레시피를 찾아 하트를 눌러보세요.</p>
              <Link href="/main" className="inline-flex bg-[#7CFC00] hover:bg-[#6EEB00] text-gray-800 font-bold py-3 px-6 rounded-xl transition-colors shadow-sm">
                레시피 찾으러 가기
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all flex flex-col group">
                  {bookmark.imageUrl ? (
                    <div className="h-48 w-full overflow-hidden bg-gray-100">
                      <img src={bookmark.imageUrl} alt={bookmark.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="h-48 w-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 font-bold">이미지 없음</span>
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2 truncate">{bookmark.title}</h3>
                    {bookmark.description && (
                      <p className="text-gray-500 text-sm mb-4 line-clamp-2">{bookmark.description}</p>
                    )}
                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                      {bookmark.link && (
                        <a href={bookmark.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-600 font-bold text-sm">
                          레시피 영상 보기 →
                        </a>
                      )}
                      <button onClick={() => bookmark.id && handleRemove(bookmark.id)} className="text-red-500 font-bold text-sm hover:underline ml-auto bg-red-50 px-3 py-1.5 rounded-lg">
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
