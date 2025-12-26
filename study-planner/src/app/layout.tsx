import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 学习规划助手",
  description: "智能学习计划，助你高效备考",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} antialiased bg-background text-foreground`}
      >
        <Sidebar />
        <main className="ml-64 min-h-screen p-8 transition-colors duration-300">
          {children}
        </main>
      </body>
    </html>
  );
}
