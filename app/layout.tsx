import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
});

// 이 부분을 수정했습니다!
export const metadata: Metadata = {
  title: "JokBo", // 폰 아이콘 아래에 표시될 이름
  description: "가족의 역사를 기록하는 족보 앱",
  icons: {
    icon: "/icon.png",        // 일반 아이콘
    apple: "/apple-icon.png", // 아이폰 홈 화면용
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}