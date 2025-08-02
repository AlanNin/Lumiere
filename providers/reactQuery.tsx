import { ReactNode, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { useReactQueryDevTools } from "@dev-plugins/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "REACT_QUERY_CACHE",
});

export function invalidateQueries(...keys: Array<string | readonly unknown[]>) {
  if (keys.length === 0) {
    return queryClient.invalidateQueries();
  }

  return Promise.all(
    keys.map((key) => {
      const queryKey = typeof key === "string" ? [key] : key;
      return queryClient.invalidateQueries({ queryKey });
    })
  );
}

export function resetCache() {
  queryClient.clear();
}

export async function getReactQueryCacheSizeInMB(): Promise<number> {
  const allKeys = await AsyncStorage.getAllKeys();
  const queryKeys = allKeys.filter((key) =>
    key.startsWith("REACT_QUERY_CACHE")
  );

  const items = await AsyncStorage.multiGet(queryKeys);
  const totalBytes = items.reduce((sum, [, value]) => {
    if (value) {
      sum += new TextEncoder().encode(value).length;
    }
    return sum;
  }, 0);

  const totalMB = totalBytes / (1024 * 1024);
  return Number(totalMB.toFixed(2));
}

export default function ReactQueryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [, _setClient] = useState<QueryClient>(queryClient);

  useReactQueryDevTools(queryClient);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            return query.meta?.persist !== false;
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
