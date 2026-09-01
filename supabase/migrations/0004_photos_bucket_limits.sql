-- Storage悪用対策: photosバケットにアップロード制限を設定する。
-- 無料プランではグローバル上限(50MB)がダッシュボードから変更できないため、
-- バケット単位の制限で代替する。
-- クライアントは長辺1200px/quality0.8のJPEGに圧縮してから上げるので、
-- 正規の写真は数百KB。5MBあれば十分な余裕がある。

update storage.buckets
set
  file_size_limit = 5242880,        -- 5MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'photos';
