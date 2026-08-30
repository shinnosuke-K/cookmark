"use client";

import { Image as ImageIcon } from "@phosphor-icons/react/dist/csr/Image";
import { usePhotoUrl } from "@/lib/photos";

interface RecipeThumbnailProps {
  photoPath: string | null;
  /** 一辺のpx。ホーム64 / アーカイブ56 / 詳細・今夜は可変 */
  size?: number;
  /** 幅いっぱいに広げる(詳細・今夜の大きい枠) */
  fill?: boolean;
  className?: string;
}

/**
 * レシピのサムネイル。ユーザーがアップロードした写真があれば署名付きURLで表示し、
 * なければ斜線のプレースホルダを出す(photosバケットは非公開のためgetPublicUrlは使えない)。
 */
export function RecipeThumbnail({
  photoPath,
  size = 64,
  fill = false,
  className = "",
}: RecipeThumbnailProps) {
  const { data: url } = usePhotoUrl(photoPath);
  const iconSize = Math.max(18, Math.round(size * 0.34));

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md ${url ? "" : "ck-placeholder"} ${className}`}
      style={fill ? undefined : { width: size, height: size }}
    >
      {url ? (
        // 署名付きURLは1時間で失効するためnext/imageの最適化には載せない
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <ImageIcon size={iconSize} weight="duotone" color="#7d7979" />
      )}
    </div>
  );
}
