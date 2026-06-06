import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "대학생 식사 가이드 | Smart Sicsa",
  description: "대학생들을 위한 맞춤형 레시피와 식당을 추천해주는 스마트 식사 가이드입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ── TMAP API Key (현재 비활성화) ──────────────────────────────────────────
  // const tmapApiKey = process.env.NEXT_PUBLIC_TMAP_API_KEY || "";

  // ── 카카오 Maps API Key ───────────────────────────────────────────────────
  const kakaoApiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY || "";

  return (
    <html lang="ko">
      <head>
        {/*
          ══════════════════════════════════════════════════════════════════
          [비활성화] TMAP jsv2 SDK 로드 (카카오 Maps로 교체됨)
          ══════════════════════════════════════════════════════════════════
          ⚠️ TMAP jsv2 SDK는 내부적으로 document.write()를 사용하여 하위 모듈(Map, LatLng 등)을
          동적으로 로드합니다. document.write()는 스크립트가 HTML 파싱 중 동기적으로 실행될 때만
          작동하므로, next/script의 어떠한 strategy도 사용 불가합니다.
          반드시 일반 <script> 태그로 동기(synchronous) 로딩해야 합니다.

          TMAP 재사용 시 아래 주석을 해제하고, 카카오 스크립트를 비활성화하세요.
          ──────────────────────────────────────────────────────────────────
          <script
            src={`https://apis.openapi.sk.com/tmap/jsv2?version=1&appKey=${tmapApiKey}`}
            type="text/javascript"
          />
        */}

        {/*
          ══════════════════════════════════════════════════════════════════
          [활성화] 카카오 Maps JS API SDK 로드
          ══════════════════════════════════════════════════════════════════
          - autoload=false: React 컴포넌트 마운트 후 수동으로 kakao.maps.load() 호출
          - libraries=services: 장소 검색(Places), Geocoder 등 서비스 라이브러리 포함
          ══════════════════════════════════════════════════════════════════
        */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services&autoload=false`}
          type="text/javascript"
        />
      </head>
      <body className={`${notoSansKr.className} antialiased bg-gray-50 text-gray-900 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
