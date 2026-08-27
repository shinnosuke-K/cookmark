"use client";

import { Thumbnail } from "@astryxdesign/core/Thumbnail";
import { usePhotoUrl } from "@/lib/photos";

interface RecipeThumbnailProps {
  photoPath: string | null;
}

/**
 * レシピのサムネイル。ユーザーがアップロードした写真があれば署名付きURLで表示し、
 * なければAstryxの`Thumbnail`が持つプレースホルダーを表示する(photosバケットは
 * 非公開のためgetPublicUrlは使えない)。
 */
export function RecipeThumbnail({ photoPath }: RecipeThumbnailProps) {
  const { data: url } = usePhotoUrl(photoPath);

  return <Thumbnail src={url ?? undefined} alt="" className="h-16 w-16 shrink-0" />;
}
