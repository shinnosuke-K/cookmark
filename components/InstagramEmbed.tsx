"use client";

import { Card } from "@astryxdesign/core/Card";
import { useEffect, useRef, useState } from "react";

interface InstagramEmbedProps {
  shortcode: string;
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
 *   失敗時はこのコンポーネントが何も描画しなくなるだけで、呼び出し側(詳細画面)は
 *   もともと写真・タイトルを別途表示しているため、フォールバックとして機能する。
 */
export function InstagramEmbed({ shortcode }: InstagramEmbedProps) {
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
    <Card ref={containerRef} variant="muted" padding={0} className="w-full overflow-hidden">
      {visible && (
        <iframe
          src={`https://www.instagram.com/p/${shortcode}/embed/captioned/`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className="h-[640px] w-full"
          style={{ border: "none" }}
          title="Instagram投稿"
        />
      )}
    </Card>
  );
}
