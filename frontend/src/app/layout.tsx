import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartExpense",
  description: "AI 기반 자동 분류 카드 가계부",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
