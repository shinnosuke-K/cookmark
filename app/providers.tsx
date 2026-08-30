"use client";

import { LayerProvider } from "@astryxdesign/core/Layer";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ToastProvider, useToast } from "@/components/Toast";

/**
 * QueryClientの生成とグローバルエラーのトースト表示。
 * useToast()はToastProviderの内側でしか呼べないため、専用コンポーネントに分離している。
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
            toast(error instanceof Error ? error.message : "エラーが発生しました");
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
    <ToastProvider>
      {/*
        TODO(一時的): `app/join/[token]/page.tsx` だけがまだAstryx実装のまま残って
        おり、そのuseToastがLayerProviderを要求する。同ファイルを
        `components/JoinScreen.tsx` に差し替えたら、このLayerProviderごと
        @astryxdesign/core への依存を落とせる。
      */}
      <LayerProvider>
        <QueryProvider>{children}</QueryProvider>
      </LayerProvider>
    </ToastProvider>
  );
}
