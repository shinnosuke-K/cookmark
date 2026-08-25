"use client";

import { usePhotoUrl } from "@/lib/photos";

interface RecipeThumbnailProps {
  photoPath: string | null;
}

/**
 * レシピのサムネイル。ユーザーがアップロードした写真があれば署名付きURLで表示し、
 * なければプレースホルダーを表示する(photosバケットは非公開のためgetPublicUrlは使えない)。
 */
export function RecipeThumbnail({ photoPath }: RecipeThumbnailProps) {
  const { data: url } = usePhotoUrl(photoPath);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 署名付きURLは短命かつ都度変わるためnext/imageの最適化と相性が悪い
      <img
        src={url}
        alt=""
        className="h-16 w-16 shrink-0 rounded-lg object-cover"
      />
    );
  }

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-2xl">
      🍳
    </div>
  );
}
