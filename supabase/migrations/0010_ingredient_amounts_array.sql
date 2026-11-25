-- Cookmark: 食材ごとの分量を、調味料(seasonings)と同じ {name, amount} の配列に揃える。
-- 変更前: {"鶏むね肉": "300g", "長ねぎ": "1本"}
-- 変更後: [{"name": "鶏むね肉", "amount": "300g"}, {"name": "長ねぎ", "amount": "1本"}]
-- JSONオブジェクトはキーの順序を保持しないため、並びは ingredients 列(カンマ区切り)での
-- 登場位置に合わせる。

update recipes r
set ingredient_amounts = (
  select coalesce(
    jsonb_agg(
      jsonb_build_object('name', e.key, 'amount', e.value)
      order by nullif(position(e.key in coalesce(r.ingredients, '')), 0) nulls last, e.key
    ),
    '[]'::jsonb
  )
  from jsonb_each_text(r.ingredient_amounts) as e
)
where jsonb_typeof(r.ingredient_amounts) = 'object';

-- 空になったもの(分量が1件も無かった行)は、他の列と同じく null = なし に揃える。
update recipes
set ingredient_amounts = null
where ingredient_amounts = '[]'::jsonb;
