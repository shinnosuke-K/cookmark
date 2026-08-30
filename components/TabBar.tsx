"use client";

import { Books } from "@phosphor-icons/react/dist/csr/Books";
import { ForkKnife } from "@phosphor-icons/react/dist/csr/ForkKnife";
import { MoonStars } from "@phosphor-icons/react/dist/csr/MoonStars";
import { SlidersHorizontal } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; icon: Icon }[] = [
  { href: "/", label: "ホーム", icon: ForkKnife },
  { href: "/archive", label: "アーカイブ", icon: Books },
  { href: "/tonight", label: "今夜", icon: MoonStars },
  { href: "/settings", label: "設定", icon: SlidersHorizontal },
];

/**
 * 画面下部の固定タブバー。上端の1px罫線だけがこのUIで唯一の罫線で、
 * 地は bg の96%(スクロールした内容が薄く透ける)。
 */
export function TabBar() {
  const pathname = usePathname();

  // 招待参加フローは単独完結の画面なのでタブバーは出さない
  if (pathname.startsWith("/join")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-divider backdrop-blur"
      style={{
        background: "rgba(243,242,242,.96)",
        paddingTop: "8px",
        paddingBottom: "max(30px, env(safe-area-inset-bottom, 0px))",
      }}
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href);
        const TabIcon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5"
            style={{
              color: active ? "var(--color-accent)" : "rgba(32,30,29,.5)",
            }}
          >
            <TabIcon size={24} weight="duotone" />
            <span className={`text-[14px] ${active ? "font-semibold" : ""}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
