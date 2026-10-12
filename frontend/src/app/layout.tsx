import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "소비 리포트",
  description: "AI가 자동 분류한 카드 지출을 한눈에 보는 소비 리포트",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
