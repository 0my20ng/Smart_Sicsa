"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Heart, Loader2, MapPin, Store } from "lucide-react";
import { useSession } from "next-auth/react";
import { getUserBookmarks, removeBookmark, BookmarkData } from "@/lib/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RestaurantBookmarksPage() {
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
        getUserBookmarks(session.user.id, "RESTAURANT")
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
            내 맛집 북마크
          </h1>

          {bookmarks.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-500 mb-2">아직 북마크한 맛집이 없어요!</p>
              <p className="text-gray-400 mb-6">지도에서 식당을 찾아 하트를 눌러보세요.</p>
              <Link href="/restaurant" className="inline-flex bg-[#7CFC00] hover:bg-[#6EEB00] text-gray-800 font-bold py-3 px-6 rounded-xl transition-colors shadow-sm">
                식당 찾으러 가기
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-green-400 hover:shadow-md transition-all flex flex-col p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full w-fit">
                      <Store className="w-4 h-4" />
                      <span className="text-sm font-bold truncate max-w-[120px]">{bookmark.description || "음식점"}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-800 mb-2 truncate">{bookmark.title}</h3>
                  
                  <div className="mt-auto pt-6 flex items-center justify-between">
                    {bookmark.link ? (
                      <a href={bookmark.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg">
                        <MapPin className="w-4 h-4" /> 지도 보기
                      </a>
                    ) : <div />}
                    
                    <button onClick={() => bookmark.id && handleRemove(bookmark.id)} className="text-red-500 font-bold text-sm hover:underline ml-auto bg-red-50 px-3 py-1.5 rounded-lg">
                      삭제
                    </button>
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
