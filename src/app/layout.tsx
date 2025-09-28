import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoSub",
  description:
    "AutoSub is a tool that allows you to automatically generate subtitles for your videos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="alphabhai"
      style={{
        "--vsc-domain": '"localhost"',
        backgroundColor: "oklch(92% 0.006 264.531)"
      } as React.CSSProperties}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-base-300`}
      >
        {children}
      </body>
    </html>
  );
}
