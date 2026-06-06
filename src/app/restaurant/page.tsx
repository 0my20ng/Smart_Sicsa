"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { MapPin, AlertCircle, Search, UtensilsCrossed, Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { toggleBookmark, getUserBookmarks, BookmarkData } from "@/lib/firestore";

// ══════════════════════════════════════════════════════════════════════════════
// [TypeScript 전역 타입 선언]
// ══════════════════════════════════════════════════════════════════════════════

// 카카오 Maps SDK 전역 타입 선언
declare global {
  interface Window {
    kakao: any;

    // ── [비활성화] TMAP SDK 전역 타입 ──────────────────────────────────────
    // Tmapv2: any;
    // ────────────────────────────────────────────────────────────────────────
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// [인터페이스 정의]
// ══════════════════════════════════════════════════════════════════════════════

interface Restaurant {
  id: string;
  place_name: string;       // 장소명
  category_name: string;    // 카테고리 (예: "음식점 > 한식 > 삼겹살")
  address_name: string;     // 지번 주소
  road_address_name: string; // 도로명 주소
  phone: string;            // 전화번호
  place_url: string;        // 카카오맵 상세 URL
  distance: string;         // 현재 위치로부터 거리 (m)
  x: string;                // 경도 (longitude)
  y: string;                // 위도 (latitude)
}

// ══════════════════════════════════════════════════════════════════════════════
// [카테고리 코드 및 필터 정의]
// 카카오 로컬 API category_group_code: FD6 = 음식점
// ══════════════════════════════════════════════════════════════════════════════

// 음식 종류 → 카카오 Places 키워드 검색 시 조합할 접미사
const FOOD_CATEGORY_MAP: Record<string, string> = {
  전체: "",
  한식: "한식",
  중식: "중식",
  일식: "일식",
  양식: "양식",
  분식: "분식",
  "카페/디저트": "카페",
  치킨: "치킨",
  피자: "피자",
};

// 가격대 → 키워드 검색에 추가할 힌트 (카카오 API는 가격 파라미터 미지원 → 키워드 우회)
const PRICE_KEYWORD_MAP: Record<string, string> = {
  전체: "",
  "1만원 이하": "저렴한",
  "1만원 ~ 2만원": "",
  "2만원 ~ 3만원": "",
  "3만원 이상": "",
};

// ══════════════════════════════════════════════════════════════════════════════
// [메인 컴포넌트]
// ══════════════════════════════════════════════════════════════════════════════

export default function RestaurantPage() {
  // ── Ref ───────────────────────────────────────────────────────────────────
  const mapContainerRef = useRef<HTMLDivElement>(null); // 지도를 렌더링할 DOM 컨테이너
  const mapInstanceRef = useRef<any>(null);             // 카카오 Map 인스턴스
  const myMarkerRef = useRef<any>(null);                // 현재 위치 마커
  const restaurantMarkersRef = useRef<any[]>([]);       // 음식점 마커 목록
  const infoWindowRef = useRef<any>(null);              // 열려있는 InfoWindow

  // ── State ─────────────────────────────────────────────────────────────────
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);       // SDK 초기화 완료 여부
  const [sdkError, setSdkError] = useState<string | null>(null); // SDK 오류 메시지
  const [isSearching, setIsSearching] = useState(false);         // 검색 중 여부
  const [searchError, setSearchError] = useState<string | null>(null); // 검색 오류 메시지

  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("전체");
  const [selectedPrice, setSelectedPrice] = useState<string>("전체");
  const [searchRadius, setSearchRadius] = useState<number>(1000); // 반경(m)
  const [restaurantList, setRestaurantList] = useState<Restaurant[]>([]); // 음식점 목록
  
  const { data: session } = useSession();
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);

  // ── 로그인 시 북마크 목록 불러오기 ──────────────────────────────────────────
  useEffect(() => {
    if (session?.user?.id) {
      getUserBookmarks(session.user.id, "RESTAURANT").then(setBookmarks);
    }
  }, [session]);

  const handleBookmarkToggle = async (place: Restaurant, e: React.MouseEvent) => {
    e.stopPropagation();
    const userId = session?.user?.id;
    if (!userId) return;
    try {
      const isBookmarked = bookmarks.some(b => b.title === place.place_name);
      
      // Optimistic update
      if (isBookmarked) {
        setBookmarks(prev => prev.filter(b => b.title !== place.place_name));
      } else {
        setBookmarks(prev => [...prev, {
          userId,
          type: "RESTAURANT",
          title: place.place_name,
          link: place.place_url,
          description: place.category_name,
        } as BookmarkData]);
      }

      await toggleBookmark({
        userId,
        type: "RESTAURANT",
        title: place.place_name,
        link: place.place_url,
        description: place.category_name,
      });
    } catch (error) {
      console.error("북마크 실패:", error);
      // 에러 발생 시 원래 상태 복구
      getUserBookmarks(userId, "RESTAURANT").then(setBookmarks);
    }
  };

  // ── 환경변수 ──────────────────────────────────────────────────────────────
  const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY || "";
  const isApiKeyMissing = !kakaoApiKey || kakaoApiKey === "YOUR_KAKAO_MAP_API_KEY";

  // ── [비활성화] TMAP 관련 환경변수 및 State ─────────────────────────────────
  // const tmapApiKey = process.env.NEXT_PUBLIC_TMAP_API_KEY || "";
  // const [mapInstance, setMapInstance] = useState<any>(null);
  // const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  // const [scriptError, setScriptError] = useState<string | null>(null);
  // const [currentMarker, setCurrentMarker] = useState<any>(null);
  // ────────────────────────────────────────────────────────────────────────

  // ══════════════════════════════════════════════════════════════════════════
  // [EFFECT 1] 카카오 Maps SDK 초기화
  // autoload=false로 로드했으므로, 여기서 kakao.maps.load()를 수동 호출합니다.
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (isApiKeyMissing) return;

    // ── autoload=false 방식 설명 ──────────────────────────────────────────
    // layout.tsx에서 SDK를 autoload=false로 로드하면:
    //   1) window.kakao 객체는 즉시 생성됨
    //   2) window.kakao.maps는 아직 존재하지 않음 (load() 호출 전)
    //   3) kakao.maps.load(callback) 호출 시 내부 모듈을 초기화하고 callback 실행
    //
    // 따라서 폴링 조건은 window.kakao 존재만 확인하면 됩니다.
    // ────────────────────────────────────────────────────────────────────────
    const pollKakaoReady = () => {
      if (typeof window !== "undefined" && window.kakao) {
        console.log("[Kakao Maps] kakao 객체 감지 → kakao.maps.load() 호출");
        // kakao.maps.load() 로 실제 Maps 모듈 초기화
        window.kakao.maps.load(() => {
          console.log("[Kakao Maps] ✅ SDK 초기화 완료");
          setIsSdkLoaded(true);
        });
        return true;
      }
      return false;
    };

    // 마운트 시 즉시 확인
    if (pollKakaoReady()) return;

    // 아직 스크립트가 파싱되지 않은 경우 200ms 간격으로 폴링
    const timer = setInterval(() => {
      if (pollKakaoReady()) clearInterval(timer);
    }, 200);

    const timeout = setTimeout(() => {
      clearInterval(timer);
      console.error("[Kakao Maps] ❌ SDK 로드 타임아웃 (10초 초과)");
      setSdkError(
        "카카오 지도 SDK를 불러오지 못했습니다.\n" +
        "• API 키가 올바른지 확인해주세요.\n" +
        "• 카카오 디벨로퍼스에서 localhost 도메인이 허용되어 있는지 확인해주세요."
      );
    }, 10000);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };

    // ── [비활성화] TMAP SDK 초기화 폴링 ────────────────────────────────────
    // const checkTmapReady = () => {
    //   const hasTmapv2 = typeof window !== "undefined" && !!window.Tmapv2;
    //   const hasMap = hasTmapv2 && typeof window.Tmapv2.Map === "function";
    //   const hasLatLng = hasTmapv2 && typeof window.Tmapv2.LatLng === "function";
    //   if (hasTmapv2 && hasMap && hasLatLng) {
    //     setIsScriptLoaded(true);
    //     return true;
    //   }
    //   return false;
    // };
    // ────────────────────────────────────────────────────────────────────────
  }, [isApiKeyMissing]);

  // ══════════════════════════════════════════════════════════════════════════
  // [EFFECT 2] 카카오 지도 인스턴스 생성
  // SDK 초기화 완료 후, DOM Ref가 준비되면 지도를 생성합니다.
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isSdkLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const { kakao } = window;

      // 기본 중심 좌표: 서울시청
      const defaultCenter = new kakao.maps.LatLng(37.5652045, 126.9870203);

      const options = {
        center: defaultCenter,
        level: 5, // 줌 레벨 (1~14, 숫자가 클수록 축소)
      };

      const map = new kakao.maps.Map(mapContainerRef.current, options);

      // 지도 타입 컨트롤 추가 (우측 상단)
      const mapTypeControl = new kakao.maps.MapTypeControl();
      map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);

      // 줌 컨트롤 추가 (우측)
      const zoomControl = new kakao.maps.ZoomControl();
      map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

      mapInstanceRef.current = map;
      console.log("[Kakao Maps] ✅ 지도 인스턴스 생성 완료");
    } catch (error: any) {
      console.error("[Kakao Maps] ❌ 지도 생성 실패:", error);
      setSdkError(`지도 초기화 오류: ${error?.message || error}`);
    }

    // ── [비활성화] TMAP 지도 인스턴스 생성 ────────────────────────────────
    // if (!isScriptLoaded || !mapRef.current || mapInstance || isApiKeyInvalid) return;
    // const map = new window.Tmapv2.Map(mapRef.current, {
    //   center: new window.Tmapv2.LatLng(37.5652045, 126.98702028),
    //   width: "100%", height: "100%", zoom: 16, httpsMode: true,
    // });
    // map.setMapType(window.Tmapv2.Map.MapType.ROAD);
    // setMapInstance(map);
    // ────────────────────────────────────────────────────────────────────────
  }, [isSdkLoaded]);

  // ══════════════════════════════════════════════════════════════════════════
  // [함수] 음식점 마커 초기화
  // ══════════════════════════════════════════════════════════════════════════
  const clearRestaurantMarkers = useCallback(() => {
    restaurantMarkersRef.current.forEach((marker) => marker.setMap(null));
    restaurantMarkersRef.current = [];

    // 열린 InfoWindow도 닫기
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
      infoWindowRef.current = null;
    }

    // ── [비활성화] TMAP 마커 초기화 ────────────────────────────────────────
    // restaurantMarkersRef.current.forEach((marker) => marker.setMap(null));
    // restaurantMarkersRef.current = [];
    // ────────────────────────────────────────────────────────────────────────
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // [함수] 카카오 로컬 REST API로 주변 음식점 검색
  //
  // 엔드포인트: GET https://dapi.kakao.com/v2/local/search/keyword.json
  // 파라미터:
  //   - query: 검색 키워드 (음식 종류 + 가격 힌트 조합)
  //   - x, y: 중심 좌표 (경도, 위도)
  //   - radius: 반경 (미터, 최대 20000)
  //   - category_group_code: FD6 (음식점)
  //   - sort: distance (거리순)
  //   - size: 최대 결과 수 (최대 15)
  // ══════════════════════════════════════════════════════════════════════════
  const fetchRestaurants = useCallback(
    async (lat: number, lng: number, category: string, price: string, radius: number) => {
      const map = mapInstanceRef.current;
      // 지도 인스턴스만 확인 (REST API 키는 서버에서 처리)
      if (!map) return;

      setIsSearching(true);
      setSearchError(null);

      try {
        // 검색 키워드 조합: "저렴한 한식" / "일식" / "음식점" 등
        const priceKeyword = PRICE_KEYWORD_MAP[price] || "";
        const categoryKeyword = FOOD_CATEGORY_MAP[category] || "";
        const query =
          [priceKeyword, categoryKeyword].filter(Boolean).join(" ") || "음식점";

        // ══════════════════════════════════════════════════════════════════
        // 카카오 로컬 API를 직접 클라이언트에서 호출하면 401 오류 발생
        // (REST API 키를 Authorization 헤더에 넣어야 하는데, NEXT_PUBLIC_ 없이는 클라이언트 접근 불가)
        //
        // 해결책: Next.js API 라우트(/api/restaurants)를 통해 서버사이드 프록시로 호출
        // REST API 키는 서버 환경변수(KAKAO_REST_API_KEY)에서 안전하게 사용됨
        // ══════════════════════════════════════════════════════════════════
        const proxyUrl = new URL("/api/restaurants", window.location.origin);
        proxyUrl.searchParams.set("query", query);
        proxyUrl.searchParams.set("x", String(lng));        // 경도
        proxyUrl.searchParams.set("y", String(lat));        // 위도
        proxyUrl.searchParams.set("radius", String(radius));
        proxyUrl.searchParams.set("category_group_code", "FD6"); // 음식점 코드 고정
        proxyUrl.searchParams.set("sort", "distance");
        proxyUrl.searchParams.set("size", "15");

        const res = await fetch(proxyUrl.toString());

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(`HTTP ${res.status}: ${errData?.error || "서버 오류"}`);
        }

        // ── [비활성화] 클라이언트 직접 호출 방식 (401 오류 발생) ──────────────
        // const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
        // url.searchParams.set("query", query);
        // url.searchParams.set("x", String(lng));
        // url.searchParams.set("y", String(lat));
        // url.searchParams.set("radius", String(radius));
        // url.searchParams.set("category_group_code", "FD6");
        // url.searchParams.set("sort", "distance");
        // url.searchParams.set("size", "15");
        // const res = await fetch(url.toString(), {
        //   headers: { Authorization: `KakaoAK ${kakaoApiKey}` },
        // });
        // ────────────────────────────────────────────────────────────────────

        const data = await res.json();
        const documents: Restaurant[] = data.documents || [];

        setRestaurantList(documents);

        // 기존 마커 제거 후 새 마커 생성
        clearRestaurantMarkers();

        const { kakao } = window;
        const newMarkers: any[] = [];

        documents.forEach((place) => {
          const markerPos = new kakao.maps.LatLng(
            parseFloat(place.y),
            parseFloat(place.x)
          );

          // 음식점 마커 (기본 마커)
          const marker = new kakao.maps.Marker({
            position: markerPos,
            map: map,
            title: place.place_name,
          });

          // 마커 클릭 시 InfoWindow 표시
          kakao.maps.event.addListener(marker, "click", () => {
            // 기존 InfoWindow 닫기
            if (infoWindowRef.current) {
              infoWindowRef.current.close();
            }

            // InfoWindow 내용 구성
            const content = `
              <div style="
                padding: 12px 16px;
                min-width: 220px;
                font-family: 'Noto Sans KR', sans-serif;
                border-radius: 8px;
              ">
                <strong style="font-size: 14px; color: #1a1a1a; display: block; margin-bottom: 4px;">
                  ${place.place_name}
                </strong>
                <span style="font-size: 11px; color: #888; display: block; margin-bottom: 6px;">
                  ${place.category_name}
                </span>
                <span style="font-size: 12px; color: #555; display: block; margin-bottom: 2px;">
                  📍 ${place.road_address_name || place.address_name}
                </span>
                ${place.phone ? `<span style="font-size: 12px; color: #555; display: block; margin-bottom: 6px;">📞 ${place.phone}</span>` : ""}
                <span style="font-size: 12px; color: #4CAF50; font-weight: 600;">
                  🚶 ${Number(place.distance).toLocaleString()}m
                </span>
                <a href="${place.place_url}" target="_blank" style="
                  display: block;
                  margin-top: 8px;
                  font-size: 12px;
                  color: #3182f6;
                  text-decoration: none;
                  font-weight: 600;
                ">카카오맵에서 보기 →</a>
              </div>
            `;

            const infoWindow = new kakao.maps.InfoWindow({ content });
            infoWindow.open(map, marker);
            infoWindowRef.current = infoWindow;
          });

          newMarkers.push(marker);
        });

        restaurantMarkersRef.current = newMarkers;

        if (documents.length === 0) {
          setSearchError("해당 조건의 음식점을 찾지 못했습니다. 반경을 넓히거나 조건을 변경해보세요.");
        }

        // ── [비활성화] TMAP 음식점 순위 API 호출 ──────────────────────────────
        // // 1. Reverse Geocoding → 법정동 코드 획득
        // const reverseGeoUrl = `https://apis.openapi.sk.com/tmap/geo/reversegeocoding?version=1&lat=${lat}&lon=${lng}&coordType=WGS84GEO&addressType=A00&appKey=${tmapApiKey}`;
        // const geoRes = await fetch(reverseGeoUrl);
        // const geoData = await geoRes.json();
        // const legalDongCode = geoData?.addressInfo?.legalDongCode;
        // const districtCode = legalDongCode.substring(0, 10);
        //
        // // 2. Puzzle 음식점 순위 API (403 오류 발생 → 비활성화)
        // const puzzleUrl = `https://apis.openapi.sk.com/tmap/puzzle/restaurant/ranking/districts/${districtCode}?category=${encodeURIComponent(category)}&appKey=${tmapApiKey}`;
        // const puzzleRes = await fetch(puzzleUrl, { headers: { Accept: "application/json" } });
        // const puzzleData = await puzzleRes.json();
        // const restaurants = puzzleData?.contents?.stat || [];
        //
        // // 3. TMAP Marker 생성
        // restaurants.forEach((restaurant: any) => {
        //   if (restaurant.lat && restaurant.lng) {
        //     const markerPos = new window.Tmapv2.LatLng(restaurant.lat, restaurant.lng);
        //     const marker = new window.Tmapv2.Marker({ position: markerPos, map: mapInstance, title: restaurant.ypName });
        //     newMarkers.push(marker);
        //   }
        // });
        // ────────────────────────────────────────────────────────────────────────
      } catch (error: any) {
        console.error("[Kakao Local API] 음식점 검색 오류:", error);
        setSearchError(`음식점 정보를 불러오지 못했습니다: ${error?.message || error}`);
      } finally {
        setIsSearching(false);
      }
    },
    [kakaoApiKey, clearRestaurantMarkers]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // [함수] 현재 위치로 이동
  // ══════════════════════════════════════════════════════════════════════════
  const handleMoveToCurrentLocation = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.kakao) {
      alert("지도가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!navigator.geolocation) {
      alert("이 브라우저는 위치 정보 서비스를 지원하지 않습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const { kakao } = window;
        const newCenter = new kakao.maps.LatLng(lat, lng);

        // 지도 중심 이동 및 줌
        map.setCenter(newCenter);
        map.setLevel(4);

        // 기존 내 위치 마커 제거
        if (myMarkerRef.current) {
          myMarkerRef.current.setMap(null);
        }

        // 내 위치 커스텀 마커 (파란 원형)
        const myMarkerContent = `
          <div style="
            width: 20px; height: 20px;
            background: #3182f6;
            border: 3px solid #fff;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(49,130,246,0.6);
          "></div>
        `;
        const myMarker = new kakao.maps.CustomOverlay({
          position: newCenter,
          content: myMarkerContent,
          map: map,
          yAnchor: 0.5,
        });

        myMarkerRef.current = myMarker;
        setCurrentLocation({ lat, lng });

        // ── [비활성화] TMAP 현재 위치 마커 생성 ──────────────────────────────
        // if (currentMarker) currentMarker.setMap(null);
        // const marker = new window.Tmapv2.Marker({
        //   position: new window.Tmapv2.LatLng(lat, lng),
        //   map: mapInstance,
        //   title: "현재 내 위치",
        // });
        // setCurrentMarker(marker);
        // ────────────────────────────────────────────────────────────────────
      },
      (error) => {
        console.error("[Geolocation] 위치 정보 오류:", error);
        alert("현재 위치 정보를 가져올 수 없습니다. 브라우저 위치 권한을 허용해주세요.");
      }
    );
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // [함수] 탐색 버튼 클릭 핸들러
  // ══════════════════════════════════════════════════════════════════════════
  const handleSearch = useCallback(() => {
    if (!currentLocation) {
      alert("먼저 우측 상단의 📍 버튼을 눌러 현재 위치를 설정해주세요.");
      return;
    }
    fetchRestaurants(
      currentLocation.lat,
      currentLocation.lng,
      selectedCategory,
      selectedPrice,
      searchRadius
    );
  }, [currentLocation, selectedCategory, selectedPrice, searchRadius, fetchRestaurants]);

  // ══════════════════════════════════════════════════════════════════════════
  // [렌더링]
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-screen w-full bg-white flex overflow-hidden">
      <Sidebar />

      {/* ── 좌측 필터 패널 ───────────────────────────────────────────────── */}
      <div className="w-80 h-full border-r-2 border-gray-100 bg-[#F1F8E9] pt-24 px-6 flex flex-col gap-6 z-10 overflow-y-auto">
        <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2">
          <UtensilsCrossed className="w-8 h-8 text-green-600" />
          식당 추천
        </h2>

        <div className="space-y-5">

          {/* 반경 선택 */}
          <div className="space-y-2">
            <label className="text-base font-black text-gray-700 block">검색 반경</label>
            <div className="relative">
              <select
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="w-full appearance-none bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-2xl leading-tight focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all font-bold text-base"
              >
                <option value={500}>500m 이내</option>
                <option value={1000}>1km 이내</option>
                <option value={2000}>2km 이내</option>
                <option value={5000}>5km 이내</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 음식 종류 필터 */}
          <div className="space-y-2">
            <label className="text-base font-black text-gray-700 block">음식 종류</label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-2xl leading-tight focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all font-bold text-base"
              >
                {Object.keys(FOOD_CATEGORY_MAP).map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 가격대 필터 */}
          <div className="space-y-2">
            <label className="text-base font-black text-gray-700 block">
              가격대
              <span className="ml-2 text-xs font-normal text-gray-400">(키워드 기반 참고용)</span>
            </label>
            <div className="relative">
              <select
                value={selectedPrice}
                onChange={(e) => setSelectedPrice(e.target.value)}
                className="w-full appearance-none bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-2xl leading-tight focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all font-bold text-base"
              >
                {Object.keys(PRICE_KEYWORD_MAP).map((price) => (
                  <option key={price}>{price}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 탐색 버튼 */}
          <div className="pt-2">
            <button
              id="btn-search-restaurants"
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full bg-[#7CFC00] hover:bg-[#6EEB00] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800 font-black py-4 px-4 rounded-2xl border-2 border-green-400 shadow-lg transition-all flex items-center justify-center gap-2 text-xl"
            >
              {isSearching ? (
                <span className="animate-pulse">탐색 중...</span>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  탐색
                </>
              )}
            </button>
          </div>

          {/* 검색 오류 메시지 */}
          {searchError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
              {searchError}
            </div>
          )}

          {/* 검색 결과 미리보기 */}
          {restaurantList.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500">
                검색 결과 {restaurantList.length}건
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {restaurantList.map((place) => (
                  <div
                    key={place.id}
                    className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm hover:border-green-400 transition-all cursor-pointer relative"
                    onClick={() => {
                      // 해당 음식점으로 지도 이동
                      const map = mapInstanceRef.current;
                      if (map && window.kakao) {
                        const pos = new window.kakao.maps.LatLng(
                          parseFloat(place.y),
                          parseFloat(place.x)
                        );
                        map.setCenter(pos);
                        map.setLevel(3);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-gray-800 text-sm truncate flex-1">{place.place_name}</p>
                      {session?.user && (
                        <button
                          onClick={(e) => handleBookmarkToggle(place, e)}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                        >
                          <Heart 
                            className={`w-5 h-5 ${bookmarks.some(b => b.title === place.place_name) ? "text-red-500 fill-current" : "text-gray-300"}`} 
                          />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate pr-6">{place.category_name}</p>
                    <p className="text-xs text-green-600 font-semibold mt-1">
                      🚶 {Number(place.distance).toLocaleString()}m
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 우측 지도 영역 ────────────────────────────────────────────────── */}
      <div className="flex-1 relative bg-[#F5F5F5] h-full">

        {/* API Key 미설정 폴백 UI */}
        {isApiKeyMissing ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gray-50 select-none">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-yellow-100 p-8 text-center space-y-6 transform hover:scale-105 transition-transform duration-300">
              <div className="inline-flex p-4 rounded-full bg-yellow-50 text-yellow-500">
                <AlertCircle className="w-12 h-12 animate-pulse" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-gray-800">카카오 Maps API 키 설정 필요</h3>
                <p className="text-gray-500 font-medium leading-relaxed text-sm">
                  지도를 사용하기 위해 아래 두 가지 설정이 필요합니다.
                </p>

                <div className="text-left space-y-3">
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 mb-1">① .env.local 파일에 추가</p>
                    <code className="text-xs font-mono text-blue-800 break-all">
                      NEXT_PUBLIC_KAKAO_MAP_API_KEY=발급받은_JavaScript_키
                    </code>
                  </div>

                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                    <p className="text-xs font-bold text-orange-700 mb-1">② 카카오 로컬 API 호출을 위한 REST API 키도 필요</p>
                    <p className="text-xs text-orange-600">
                      카카오 디벨로퍼스 → 내 앱 → 앱 키에서 JavaScript 키(지도)와
                      REST API 키(장소 검색)를 각각 확인하세요.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-400">
                  설정 후 개발 서버를 재시작(npm run dev)해주세요.
                </p>
              </div>
            </div>
          </div>
        ) : sdkError ? (
          /* SDK 오류 폴백 UI */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-gray-50 select-none">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-red-100 p-8 text-center space-y-6">
              <div className="inline-flex p-4 rounded-full bg-red-50 text-red-500">
                <AlertCircle className="w-12 h-12 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-800">지도 로드 실패</h3>
                <p className="text-red-500 font-bold text-sm">{sdkError}</p>
                <p className="text-gray-400 text-xs">F12 개발자 도구 콘솔에서 상세 오류를 확인하세요.</p>
              </div>
            </div>
          </div>
        ) : (
          /* 카카오 지도 컨테이너 */
          <>
            {/* SDK 로딩 중 스피너 */}
            {!isSdkLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100/70 z-10">
                <p className="text-gray-600 font-black animate-pulse text-lg">지도를 불러오는 중입니다...</p>
              </div>
            )}
            <div ref={mapContainerRef} className="w-full h-full z-0" />
          </>
        )}

        {/* 현재 위치 이동 버튼 */}
        {!isApiKeyMissing && (
          <button
            id="btn-current-location"
            onClick={handleMoveToCurrentLocation}
            className="absolute top-8 right-8 bg-white hover:bg-gray-50 text-green-500 p-5 rounded-3xl shadow-xl border-2 border-green-100 transition-all hover:scale-110 active:scale-90 group z-20"
            title="현재 내 위치로 이동"
          >
            <MapPin className="w-10 h-10 fill-current" />
          </button>
        )}
      </div>
    </div>
  );
}
