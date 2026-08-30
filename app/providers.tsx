"use client";

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
      <QueryProvider>{children}</QueryProvider>
    </ToastProvider>
  );
}
