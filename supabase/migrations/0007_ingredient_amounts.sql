-- Cookmark: 食材ごとの分量(任意)。食材名 → 分量 のJSONオブジェクトで保持し、
-- null = 分量なし。例: {"鶏むね肉": "300g", "長ねぎ": "1本"}
-- 食材名そのもの(検索・「よく使う」候補の集計元)は従来どおり ingredients 列に持ち、
-- この列はInstagram自動取得で得た分量をチップに添えて表示するためだけに使う。

alter table recipes add column ingredient_amounts jsonb;
