"use client";

import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Token, type TokenColor } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { RecipeThumbnail } from "./RecipeThumbnail";
import type { Recipe } from "@/lib/recipes";

const VERDICT_LABEL: Record<"repeat" | "meh", string> = {
  repeat: "リピート確定",
  meh: "イマイチ",
};

const VERDICT_COLOR: Record<"repeat" | "meh" | "none", TokenColor> = {
  repeat: "orange",
  meh: "gray",
  none: "default",
};

interface ArchiveRecipeCardProps {
  recipe: Recipe;
  adderName: string | undefined;
}

export function ArchiveRecipeCard({ recipe, adderName }: ArchiveRecipeCardProps) {
  const verdictLabel = recipe.verdict ? VERDICT_LABEL[recipe.verdict] : "未評価";
  const verdictColor = VERDICT_COLOR[recipe.verdict ?? "none"];

  const subtitle = [
    recipe.author_handle ? `@${recipe.author_handle}` : null,
    adderName ? `${adderName}が追加` : null,
  ]
    .filter(Boolean)
    .join(" ・ ");

  return (
    <ClickableCard label={recipe.title} href={`/recipe/${recipe.id}`}>
      <HStack gap={3} align="center">
        <RecipeThumbnail photoPath={recipe.photo_path} />

        <VStack gap={1} hAlign="start" className="min-w-0 flex-1">
          <Text type="body" weight="medium" maxLines={1}>
            {recipe.title}
          </Text>
          {subtitle && (
            <Text type="body" color="secondary" maxLines={1}>
              {subtitle}
            </Text>
          )}
          {recipe.category && (
            <Token label={recipe.category} color="orange" size="sm" />
          )}
        </VStack>

        <Token label={verdictLabel} color={verdictColor} className="shrink-0" />
      </HStack>
    </ClickableCard>
  );
}
