"use client";

import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/archive", label: "アーカイブ", icon: "📚" },
  { href: "/tonight", label: "今夜", icon: "🎲" },
  { href: "/settings", label: "設定", icon: "⚙️" },
] as const;

/**
 * 画面下部の固定タブバー。
 *
 * Astryxの`MobileNav`は永続的なタブバーではなく、開閉するドローワーコンポーネント
 * (SideNavのモバイル代替)であり、タップ数最小の原則(常時表示ナビ)に反するため
 * 採用しない。代わりにAstryxのレイアウト・タイポグラフィプリミティブ(HStack/
 * VStack/Text)で構成し、配色はトークンブリッジ経由のTailwindユーティリティ
 * (bg-surface/border-default/text-accent等)で当てる。
 */
export function TabBar() {
  const pathname = usePathname();

  // 招待参加フローは単独完結の画面なのでタブバーは出さない
  if (pathname.startsWith("/join")) return null;

  return (
    <HStack
      as="nav"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-default bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className="min-w-0 flex-1">
            <VStack
              gap={0.5}
              hAlign="center"
              justify="center"
              className="min-h-[56px]"
            >
              <span className="text-lg leading-none" aria-hidden>
                {tab.icon}
              </span>
              <Text type="supporting" color={active ? "accent" : "secondary"}>
                {tab.label}
              </Text>
            </VStack>
          </Link>
        );
      })}
    </HStack>
  );
}
