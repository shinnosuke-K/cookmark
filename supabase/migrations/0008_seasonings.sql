-- Cookmark: 調味料と分量(任意)。Instagram自動取得で得たものを、記載順のまま
-- {name, amount} の配列で保持し、null = なし。
-- 例: [{"name": "醤油", "amount": "大さじ2"}, {"name": "みりん", "amount": "大さじ1"}]
-- 食材(ingredients)と分けているのは、調味料が検索や「よく使う」候補に混ざると
-- どのレシピにも当たってしまうため。詳細画面での表示専用。

alter table recipes add column seasonings jsonb;
