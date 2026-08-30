"use client";

import { useEffect, useRef, useState } from "react";

interface InstagramEmbedProps {
  shortcode: string;
  className?: string;
}

const LOAD_TIMEOUT_MS = 8000;

/**
 * Instagram投稿のembed iframeを遅延ロードする(詳細画面でのみ使用)。
 *
 * - IntersectionObserverで画面内に入ってから初めてiframeをレンダーする(常時ロードすると重いため)。
 * - embedの失敗はエラー表示にせず静かに非表示にする方針。ただしembed.instagram.comは
 *   クロスオリジンのため、404等でもiframe自体のonErrorはほぼ発火しない。そこで
 *   「iframeのonLoadが一定時間(LOAD_TIMEOUT_MS)経っても発火しない」ことを
 *   失敗とみなすタイムアウト方式をベストエフォートの判定として採用している。
 *   失敗時は何も描画しなくなり、呼び出し側(詳細画面)が下に敷いている
 *   「Instagram投稿」のプレースホルダがそのまま見える。
 */
export function InstagramEmbed({ shortcode, className = "" }: InstagramEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || loaded) return;
    const timer = setTimeout(() => setFailed(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [visible, loaded]);

  if (failed) return null;

  return (
    <div ref={containerRef} className={`overflow-hidden bg-surface ${className}`}>
      {visible && (
        <iframe
          src={`https://www.instagram.com/p/${shortcode}/embed/captioned/`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className="h-full w-full border-0"
          scrolling="no"
          title="Instagram投稿"
        />
      )}
    </div>
  );
}
