import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "人性探索",
  description: "人性探索測試",
  icons: {
    icon: "/rich-team-logo-transparent.png",
  },
  openGraph: {
    title: "人性探索",
    description: "人性探索測試",
    images: ["/og.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "人性探索",
    description: "人性探索測試",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
