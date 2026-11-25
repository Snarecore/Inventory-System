import { QueryClient } from "@tanstack/react-query";

export const GLOBAL_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            refetchOnWindowFocus: false,
            staleTime: GLOBAL_STALE_TIME
        },
        mutations: {
            retry: 0
        }
    }
});