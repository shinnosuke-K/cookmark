"use client";

import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState } from "react";
import { ToastProvider, useToast } from "@/components/Toast";

// キャッシュをlocalStorageに保存しておく期間。PWAを開き直したとき、まず前回の
// 一覧をこのキャッシュから即座に描き、裏で最新を取り直す(「開いたら最新」は
// refetchOnWindowFocus / refetchOnMount が引き続き担保する)。
const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// 永続化したキャッシュの形式を変えたときにここを上げると、古い保存分を捨てられる
const PERSIST_BUSTER = "v1";

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
            // 永続化の対象は「キャッシュに残っているクエリ」なので、画面を離れて
            // 5分(既定)でGCされないよう保持期間を保存期間と揃える
            gcTime: PERSIST_MAX_AGE_MS,
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            toast(error instanceof Error ? error.message : "エラーが発生しました");
          },
        }),
      }),
  );

  // プリレンダー時はwindowが無いので何もしないpersisterになる(storageがnull)
  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: typeof window === "undefined" ? null : window.localStorage,
      key: "cookmark-query-cache",
    }),
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE_MS,
        buster: PERSIST_BUSTER,
        dehydrateOptions: {
          // 写真の署名付きURLは1時間で失効するため保存しない(復元直後に
          // 期限切れのURLで壊れた画像が出るのを避ける)
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" && query.queryKey[0] !== "photoUrl",
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <QueryProvider>{children}</QueryProvider>
    </ToastProvider>
  );
}
