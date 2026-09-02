-- Cookmark: 食材(任意)。カンマ区切りの文字列で保持し、null = 未登録。
-- 検索(ホーム・アーカイブのフリーワード)の対象に含める。

alter table recipes add column ingredients text;
