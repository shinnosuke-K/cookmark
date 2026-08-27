"use client";

import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useJoinBoard } from "@/lib/board";

export default function JoinPage() {
  const toast = useToast();
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const joinBoard = useJoinBoard();
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ type: "error", body: "名前を入力してください" });
      return;
    }

    joinBoard.mutate(
      { token: params.token, name: trimmed },
      {
        onSuccess: () => {
          toast({ body: "参加しました!" });
          router.replace("/");
        },
        onError: () => {
          toast({
            type: "error",
            body: "参加に失敗しました。招待URLを確認してもう一度お試しください",
          });
        },
      },
    );
  }

  return (
    <VStack gap={8} hAlign="center" justify="center" className="flex-1 p-6 text-center">
      <VStack gap={2}>
        <Heading level={1}>Cookmarkに参加</Heading>
        <Text type="body" color="secondary">
          招待されたボードに参加します
        </Text>
      </VStack>

      <VStack as="form" onSubmit={handleSubmit} gap={4} className="w-full max-w-xs text-left">
        <TextInput
          label="あなたの名前"
          value={name}
          onChange={setName}
          placeholder="例: 夫、妻"
        />
        <Button
          type="submit"
          label={joinBoard.isPending ? "参加中..." : "参加する"}
          variant="primary"
          size="lg"
          width="100%"
          className="min-h-11"
          isDisabled={joinBoard.isPending}
        />
      </VStack>
    </VStack>
  );
}
