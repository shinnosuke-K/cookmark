import imageCompression from "browser-image-compression";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";

const SIGNED_URL_EXPIRES_IN = 60 * 60; // 1時間
const SIGNED_URL_STALE_TIME = 50 * 60 * 1000; // 期限切れ前に再取得されるよう余裕を持たせる

export const photoUrlQueryKey = (photoPath: string | null | undefined) =>
  ["photoUrl", photoPath] as const;

/**
 * 非公開Storageバケット(photos)の写真パスから、表示用の署名付きURLを取得する。
 * バケットが非公開のため getPublicUrl は使えない。
 */
export async function getPhotoUrl(photoPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrl(photoPath, SIGNED_URL_EXPIRES_IN);

  if (error) throw error;
  return data.signedUrl;
}

export function usePhotoUrl(photoPath: string | null | undefined) {
  return useQuery({
    queryKey: photoUrlQueryKey(photoPath),
    queryFn: () => getPhotoUrl(photoPath as string),
    enabled: !!photoPath,
    staleTime: SIGNED_URL_STALE_TIME,
  });
}

export interface UploadRecipePhotoInput {
  boardId: string;
  recipeId: string;
  file: File;
}

/**
 * 画像を圧縮(長辺1200px / quality 0.8、jpegに変換)してから photos バケットへ
 * アップロードする。オブジェクトパスは `{board_id}/{recipe_id}-{timestamp}.jpg`
 * (先頭フォルダ=board_id という Storage RLS ポリシーの前提に合わせる)。
 * 保存先パス(バケット名を含まない)を返すので、recipes.photo_path に格納する。
 */
export async function uploadRecipePhoto({
  boardId,
  recipeId,
  file,
}: UploadRecipePhotoInput): Promise<string> {
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1200,
    initialQuality: 0.8,
    fileType: "image/jpeg",
    useWebWorker: true,
  });

  const path = `${boardId}/${recipeId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from("photos")
    .upload(path, compressed, { contentType: "image/jpeg", upsert: true });

  if (error) throw error;
  return path;
}
