import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
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

function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [, _setClient] = useState<QueryClient>(queryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export default ReactQueryProvider;
