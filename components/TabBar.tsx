"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/archive", label: "アーカイブ", icon: "📚" },
  { href: "/tonight", label: "今夜", icon: "🎲" },
  { href: "/settings", label: "設定", icon: "⚙️" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  // 招待参加フローは単独完結の画面なのでタブバーは出さない
  if (pathname.startsWith("/join")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] ${
                  active ? "text-orange-600" : "text-zinc-500"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
