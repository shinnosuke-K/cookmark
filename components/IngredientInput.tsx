"use client";

import { XCircle } from "@phosphor-icons/react/dist/csr/XCircle";
import { useState } from "react";
import {
  frequentIngredients,
  normalizeIngredients,
} from "@/lib/ingredients";
import { useBoardIngredients } from "@/lib/recipes";

interface IngredientInputProps {
  /** 「よく使う:」候補チップの集計元(ボード内の全レシピ)。 */
  boardId: string | undefined;
  value: string[];
  onChange: (next: string[]) => void;
  /** ラベルの htmlFor と対応させるための入力欄のid。 */
  inputId: string;
}

/**
 * 食材のチップ入力(追加シート・詳細編集で共通)。
 * Enter・「,」・「、」で確定、チップのタップで削除、空欄でBackspaceなら直前を削除。
 * フォーカスを外したときも未確定の入力を取りこぼさず確定する。
 */
export function IngredientInput({
  boardId,
  value,
  onChange,
  inputId,
}: IngredientInputProps) {
  const [draft, setDraft] = useState("");
  const { data: allIngredients } = useBoardIngredients(boardId);
  const suggestions = frequentIngredients(allIngredients ?? [], value);

  function commit(token: string) {
    const trimmed = token.trim();
    setDraft("");
    if (!trimmed || value.includes(trimmed)) return;
    onChange(normalizeIngredients([...value, trimmed]));
  }

  function handleDraftChange(next: string) {
    // IME確定と同時に区切り文字が入るケースも拾えるよう、キーではなく入力値の
    // 末尾で判定する(「、」はスマホの日本語キーボードで打ちやすい)。
    const match = next.match(/^(.*)[,、]$/);
    if (match) {
      commit(match[1]);
      return;
    }
    setDraft(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      <div className="flex min-h-11 flex-wrap items-center gap-x-1.5 gap-y-3 rounded-md border border-divider bg-surface px-2 py-[5px]">
        {value.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(value.filter((v) => v !== item))}
            aria-label={`${item}を削除`}
            className="ck-tag ck-chip ck-chip-tight px-2.5 py-[7px]"
            style={{
              background: "var(--color-neutral-300)",
              color: "var(--color-neutral-800)",
            }}
          >
            {item}
            <XCircle size={15} weight="duotone" />
          </button>
        ))}
        <input
          id={inputId}
          className="min-h-8 min-w-[110px] flex-1 border-none bg-transparent text-[15px] outline-none"
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => commit(draft)}
          placeholder={value.length > 0 ? "追加" : "食材名を入力(Enterで確定)"}
        />
      </div>

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-3">
          <span className="text-[14px] text-[rgba(32,30,29,.5)]">よく使う:</span>
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => commit(item)}
              className="ck-tag ck-chip ck-chip-tight px-2.5 py-[7px]"
              style={{
                border: "1px solid var(--color-neutral-500)",
                color: "var(--color-neutral-700)",
              }}
            >
              + {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
