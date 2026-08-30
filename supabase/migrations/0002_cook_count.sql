-- Cookmark: track how many times a recipe has been cooked.

alter table recipes add column cook_count integer not null default 0;
update recipes set cook_count = 1 where status = 'cooked';
