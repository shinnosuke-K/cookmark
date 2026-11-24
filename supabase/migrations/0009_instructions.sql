-- Cookmark: 作り方(任意)。Instagram自動取得でキャプションから抜き出した手順を、
-- 順番どおりの文字列の配列で保持する。null = なし。詳細画面での表示専用。
-- 例: ["蕎麦を茹でる", "冷水で締めて水気を切る"]

alter table recipes add column instructions jsonb;
