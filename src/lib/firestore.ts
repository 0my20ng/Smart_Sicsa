import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, addDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────
// 내 냉장고 (My Fridge) API
// ─────────────────────────────────────────

/**
 * 특정 유저의 냉장고 재료 목록을 가져옵니다.
 * 만약 문서가 없으면 빈 배열로 새로 생성하고 반환합니다.
 */
export async function getUserFridge(userId: string): Promise<string[]> {
  if (!userId) return [];
  
  const docRef = doc(db, "refrigerators", userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data().ingredients || [];
  } else {
    await setDoc(docRef, { ingredients: [] });
    return [];
  }
}

/**
 * 특정 유저의 냉장고 재료 목록 전체를 덮어씁니다.
 */
export async function setUserFridge(userId: string, ingredients: string[]): Promise<void> {
  if (!userId) return;
  
  const docRef = doc(db, "refrigerators", userId);
  await setDoc(docRef, { ingredients }, { merge: true });
}

/**
 * 특정 유저의 냉장고에 단일 재료를 추가합니다. (중복 방지)
 */
export async function addIngredientToFridge(userId: string, ingredient: string): Promise<void> {
  if (!userId || !ingredient) return;
  
  const docRef = doc(db, "refrigerators", userId);
  // 문서가 없을 수도 있으므로 setDoc + merge: true 사용
  await setDoc(docRef, {
    ingredients: arrayUnion(ingredient)
  }, { merge: true });
}

/**
 * 특정 유저의 냉장고에서 단일 재료를 삭제합니다.
 */
export async function removeIngredientFromFridge(userId: string, ingredient: string): Promise<void> {
  if (!userId || !ingredient) return;
  
  const docRef = doc(db, "refrigerators", userId);
  try {
    await updateDoc(docRef, {
      ingredients: arrayRemove(ingredient)
    });
  } catch (error) {
    // 문서가 아직 생성되지 않은 상태에서 삭제 시도 시 에러 무시
    console.warn("Failed to remove ingredient:", error);
  }
}

// ─────────────────────────────────────────
// 북마크 (Bookmarks) API
// ─────────────────────────────────────────

export interface BookmarkData {
  id?: string;
  userId: string;
  type: "RECIPE" | "RESTAURANT";
  title: string;
  link?: string;
  imageUrl?: string;
  description?: string;
  createdAt?: any;
}

/**
 * 특정 유저의 북마크 목록을 가져옵니다. (타입별 필터링 가능)
 * 복합 인덱스 생성을 피하기 위해 클라이언트 사이드에서 정렬을 수행합니다.
 */
export async function getUserBookmarks(userId: string, type?: "RECIPE" | "RESTAURANT"): Promise<BookmarkData[]> {
  if (!userId) return [];
  const bookmarksRef = collection(db, "bookmarks");
  
  const q = query(bookmarksRef, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  
  let bookmarks: BookmarkData[] = [];
  querySnapshot.forEach((doc) => {
    bookmarks.push({ id: doc.id, ...doc.data() } as BookmarkData);
  });
  
  if (type) {
    bookmarks = bookmarks.filter(b => b.type === type);
  }
  
  // 클라이언트 사이드 정렬 (최신순)
  bookmarks.sort((a, b) => {
    const timeA = a.createdAt?.seconds || 0;
    const timeB = b.createdAt?.seconds || 0;
    return timeB - timeA;
  });
  
  return bookmarks;
}

/**
 * 특정 유저의 특정 항목 북마크 여부를 확인합니다.
 */
export async function checkBookmarkExists(userId: string, title: string): Promise<string | null> {
  if (!userId || !title) return null;
  const bookmarksRef = collection(db, "bookmarks");
  const q = query(bookmarksRef, where("userId", "==", userId), where("title", "==", title));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].id;
  }
  return null;
}

/**
 * 북마크를 추가합니다.
 */
export async function addBookmark(data: Omit<BookmarkData, "id" | "createdAt">): Promise<string> {
  const bookmarksRef = collection(db, "bookmarks");
  const docRef = await addDoc(bookmarksRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * 북마크를 삭제합니다. (문서 ID 기준)
 */
export async function removeBookmark(bookmarkId: string): Promise<void> {
  if (!bookmarkId) return;
  const docRef = doc(db, "bookmarks", bookmarkId);
  await deleteDoc(docRef);
}

/**
 * 제목 기반 북마크 토글 (있으면 삭제, 없으면 추가)
 * 반환값: true(추가됨), false(삭제됨)
 */
export async function toggleBookmark(data: Omit<BookmarkData, "id" | "createdAt">): Promise<boolean> {
  const existingId = await checkBookmarkExists(data.userId, data.title);
  if (existingId) {
    await removeBookmark(existingId);
    return false; // 북마크 해제됨
  } else {
    await addBookmark(data);
    return true; // 북마크 추가됨
  }
}
