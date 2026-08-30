"use client";

import { ArrowsClockwise } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { Question } from "@phosphor-icons/react/dist/csr/Question";
import { ThumbsDown } from "@phosphor-icons/react/dist/csr/ThumbsDown";
import type { CSSProperties } from "react";
import type { RecipeVerdict } from "@/lib/database.types";

/**
 * リピート確定/イマイチの色定義。塗りバッジ(VerdictBadge)と詳細画面のトグル
 * チップ(選択/非選択)の両方がここを参照する、評価まわりの唯一の色ソース。
 */
export const VERDICT_STYLE: Record<
  "repeat" | "meh",
  {
    label: string;
    Icon: typeof ArrowsClockwise;
    /** バッジ・選択中チップの塗り */
    selected: CSSProperties;
    /** 非選択チップの薄塗り。リピート確定・イマイチで同じ「薄塗り」の言語に揃え、
     *  片方だけ違う見た目(破線等)にしないようにする。 */
    unselected: CSSProperties;
  }
> = {
  repeat: {
    label: "リピート確定",
    Icon: ArrowsClockwise,
    selected: {
      background: "var(--color-accent-2-600)",
      color: "#fff",
      fontWeight: 600,
    },
    unselected: {
      background: "var(--color-accent-2-100)",
      color: "var(--color-accent-2-700)",
    },
  },
  meh: {
    label: "イマイチ",
    Icon: ThumbsDown,
    selected: {
      background: "var(--color-neutral-300)",
      color: "var(--color-neutral-800)",
    },
    unselected: {
      background: "var(--color-neutral-200)",
      color: "var(--color-neutral-700)",
    },
  },
};

const NONE_STYLE: CSSProperties = {
  border: "1.5px dashed var(--color-neutral-500)",
  background: "transparent",
  color: "var(--color-neutral-700)",
};

/** 詳細画面の評価トグルチップのスタイルを返す。選択中はバッジと同じ塗り。 */
export function verdictChipStyle(
  verdict: "repeat" | "meh",
  selected: boolean,
): CSSProperties {
  return selected
    ? VERDICT_STYLE[verdict].selected
    : VERDICT_STYLE[verdict].unselected;
}

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
  const entry = verdict ? VERDICT_STYLE[verdict] : null;
  const label = entry?.label ?? "未評価";
  const Icon = entry?.Icon ?? Question;
  const style = entry?.selected ?? NONE_STYLE;
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
