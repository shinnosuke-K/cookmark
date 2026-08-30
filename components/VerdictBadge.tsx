"use client";

import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { Question } from "@phosphor-icons/react/dist/csr/Question";
import { ThumbsDown } from "@phosphor-icons/react/dist/csr/ThumbsDown";
import type { CSSProperties } from "react";
import type { RecipeVerdict } from "@/lib/database.types";

const VERDICT: Record<
  "repeat" | "meh" | "none",
  { label: string; Icon: typeof ArrowsClockwise; style: CSSProperties }
> = {
  repeat: {
    label: "リピート確定",
    Icon: ArrowsClockwise,
    style: {
      background: "var(--color-accent-2-600)",
      color: "#fff",
      fontWeight: 600,
    },
  },
  meh: {
    label: "イマイチ",
    Icon: ThumbsDown,
    style: {
      background: "var(--color-neutral-300)",
      color: "var(--color-neutral-800)",
    },
  },
  none: {
    label: "未評価",
    Icon: Question,
    style: {
      border: "1.5px dashed var(--color-neutral-500)",
      background: "transparent",
      color: "var(--color-neutral-700)",
    },
  },
};

/**
 * 評価バッジ。リピート確定だけがマゼンタ塗り、イマイチはグレー塗り、
 * 未評価は破線アウトラインで「まだ答えていない」ことを示す。
 */
export function VerdictBadge({
  verdict,
  count,
  className = "",
}: {
  verdict: RecipeVerdict | null;
  /** リピート確定回数。2回以上のときだけ「×N」をバッジ内に添える。 */
  count?: number;
  className?: string;
}) {
  const { label, Icon, style } = VERDICT[verdict ?? "none"];
  const displayLabel =
    verdict === "repeat" && count !== undefined && count >= 2
      ? `${label} ×${count}`
      : label;

  return (
    <span
      className={`ck-tag ck-pill shrink-0 px-3.5 py-[5px] ${className}`}
      style={style}
    >
      <Icon size={15} weight="duotone" />
      {displayLabel}
    </span>
  );
}

/** 詳細画面の状態バッジ。未挑戦のときだけシアンのアウトラインになる。 */
export function StatusBadge({
  status,
  verdict,
}: {
  status: string;
  verdict: RecipeVerdict | null;
}) {
  if (status !== "cooked") {
    return (
      <span
        className="ck-tag ck-pill shrink-0 px-3 py-[3px]"
        style={{
          border: "1px solid var(--color-accent)",
          color: "var(--color-accent-700)",
        }}
      >
        未挑戦
      </span>
    );
  }
  return <VerdictBadge verdict={verdict} className="px-3 py-[3px]" />;
}
