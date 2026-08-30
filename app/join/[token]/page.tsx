"use client";

import { useParams } from "next/navigation";
import { JoinScreen } from "@/components/JoinScreen";

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  return <JoinScreen inviteToken={params.token} />;
}
