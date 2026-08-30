import type { Metadata, Viewport } from "next";
import { Source_Serif_4 } from "next/font/google";
import { TabBar } from "@/components/TabBar";
import { Providers } from "./providers";
import "./globals.css";

// 見出し・本文ともSource Serif 4。日本語はglobals.cssのフォールバックで
// システムの明朝(ヒラギノ明朝 / 游明朝)に落ちる。
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cookmark",
  description: "夫婦でInstagramのレシピを共有・管理するアプリ",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Cookmark",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f3f2f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${sourceSerif.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-bg text-text antialiased">
        <Providers>
          <main className="flex flex-1 flex-col">{children}</main>
          <TabBar />
        </Providers>
      </body>
    </html>
  );
}
