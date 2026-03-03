import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EchoNote - 智能语音笔记",
  description: "EchoNote - 你的AI语音笔记助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="light">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
