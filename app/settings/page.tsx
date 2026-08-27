"use client";

import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { useMemo, useState } from "react";
import { useBoard, useMyMember } from "@/lib/board";

export default function SettingsPage() {
  const toast = useToast();
  const { data: member, isLoading: memberLoading } = useMyMember();
  const { data: board, isLoading: boardLoading } = useBoard(member?.board_id);
  const [copied, setCopied] = useState(false);

  const inviteUrl = useMemo(() => {
    if (!board || typeof window === "undefined") return null;
    return `${window.location.origin}/join/${board.invite_token}`;
  }, [board]);

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({ body: "招待URLをコピーしました" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ type: "error", body: "コピーに失敗しました。長押しで手動コピーしてください" });
    }
  }

  if (memberLoading || boardLoading) {
    return (
      <Text type="body" color="secondary" className="flex flex-1 items-center justify-center p-8">
        読み込み中...
      </Text>
    );
  }

  if (!member) {
    return (
      <Text type="body" color="secondary" className="flex flex-1 items-center justify-center p-8 text-center">
        まだボードに参加していません
      </Text>
    );
  }

  return (
    <VStack gap={8} className="flex-1 p-6">
      <Heading level={1}>設定</Heading>

      <VStack gap={1}>
        <Text type="label" color="secondary">
          表示名
        </Text>
        <Text type="body">{member.display_name}</Text>
      </VStack>

      <VStack gap={2}>
        <Text type="label" color="secondary">
          招待URL
        </Text>
        <Text type="supporting" color="secondary">
          このURLをパートナーに送るとボードに参加できます。iOSでアプリのデータが消えてログインできなくなった場合も、このURLからもう一度参加できます。
        </Text>
        <HStack gap={2} align="center">
          <TextInput
            label="招待URL"
            isLabelHidden
            isReadOnly
            value={inviteUrl ?? ""}
            className="min-w-0 flex-1"
          />
          <Button
            label={copied ? "コピー済み" : "コピー"}
            variant="primary"
            className="min-h-11 shrink-0"
            onClick={handleCopy}
          />
        </HStack>
      </VStack>
    </VStack>
  );
}
