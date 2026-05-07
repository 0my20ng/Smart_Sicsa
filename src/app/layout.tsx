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
  return (
    <html lang="ko">
      <body className={`${notoSansKr.className} antialiased bg-gray-50 text-gray-900 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
