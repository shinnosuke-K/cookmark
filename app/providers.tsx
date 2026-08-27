"use client";

import { LayerProvider } from "@astryxdesign/core/Layer";
import { LinkProvider } from "@astryxdesign/core/Link";
import { useToast } from "@astryxdesign/core/Toast";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NextLink from "next/link";
import { useState } from "react";

/**
 * QueryClientの生成とグローバルエラーのトースト表示。
 * useToast()はLayerProviderのトーストコンテキストを介して呼び出す必要があるため、
 * LayerProviderの内側の専用コンポーネントに分離している。
 */
function QueryProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: true,
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            toast({
              type: "error",
              body: error instanceof Error ? error.message : "エラーが発生しました",
            });
          },
        }),
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LinkProvider component={NextLink}>
      <LayerProvider>
        <QueryProvider>{children}</QueryProvider>
      </LayerProvider>
    </LinkProvider>
  );
}
