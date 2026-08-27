"use client";

import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { VStack } from "@astryxdesign/core/VStack";
import { useState } from "react";
import { CookedSheet } from "./CookedSheet";
import { RecipeThumbnail } from "./RecipeThumbnail";
import type { Recipe } from "@/lib/recipes";

interface RecipeCardProps {
  recipe: Recipe;
  adderName: string | undefined;
}

export function RecipeCard({ recipe, adderName }: RecipeCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

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

        <Button
          label="作った!"
          variant="primary"
          size="lg"
          className="min-h-11 shrink-0"
          onClick={() => setSheetOpen(true)}
        />
      </HStack>

      <CookedSheet recipe={recipe} open={sheetOpen} onOpenChange={setSheetOpen} />
    </ClickableCard>
  );
}
