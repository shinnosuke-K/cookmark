"use client";

import { XCircle } from "@phosphor-icons/react/dist/csr/XCircle";
import { useMemo, useRef, useState } from "react";
import {
  frequentIngredients,
  normalizeIngredients,
  splitIngredients,
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
  // 日本語入力の変換中かどうか。変換中のEnterは「変換の確定」であって
  // チップの確定ではないため、ここで見分ける。
  const composingRef = useRef(false);
  const { data: allIngredients } = useBoardIngredients(boardId);
  const suggestions = useMemo(
    () => frequentIngredients(allIngredients ?? [], value),
    [allIngredients, value],
  );

  /** チップを足す。区切り文字を含んだ貼り付けは複数チップに割る(保存後の表示と揃える)。 */
  function addTokens(raw: string) {
    const tokens = splitIngredients(raw);
    if (tokens.length === 0) return;
    onChange(normalizeIngredients([...value, ...tokens]));
  }

  /** 入力中の文字列を確定してチップにする(入力欄は空に戻す)。 */
  function commitDraft(text: string) {
    setDraft("");
    addTokens(text);
  }

  /** 末尾が区切り文字なら確定する。確定したらtrueを返す。 */
  function commitOnSeparator(next: string): boolean {
    const match = next.match(/^(.*)[,、]$/);
    if (!match) return false;
    commitDraft(match[1]);
    return true;
  }

  function handleDraftChange(next: string) {
    // IME確定と同時に区切り文字が入るケースも拾えるよう、キーではなく入力値の
    // 末尾で判定する(「、」はスマホの日本語キーボードで打ちやすい)。ただし
    // 変換中の未確定文字列に含まれる「、」で切ってしまわないよう、変換が
    // 終わるまでは判定しない(compositionendで改めて見る)。
    if (composingRef.current) {
      setDraft(next);
      return;
    }
    if (commitOnSeparator(next)) return;
    setDraft(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // 変換確定のEnter(keyCode 229 は古いブラウザ・一部IMEの互換用)は無視する。
    // ここを通すと未変換のかながそのままチップになり、変換もろとも失われる。
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;

    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft(draft);
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
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={(e) => {
            composingRef.current = false;
            // 変換確定後の文字列を改めて見る。ブラウザによってcompositionendと
            // 最後のchangeの順序が違うため、両方で同じ判定を通す。
            commitOnSeparator(e.currentTarget.value);
          }}
          onBlur={() => commitDraft(draft)}
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
              // 入力途中で候補をタップしたとき、blurでの確定→候補列の組み替えが
              // タップの途中で起きて別の候補に化けるのを防ぐ(blurさせない)。
              // 入力中の文字列はそのまま残す。
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTokens(item)}
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
