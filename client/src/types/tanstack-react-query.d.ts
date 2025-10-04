declare module "@tanstack/react-query" {
  import type { ReactNode } from "react";

  export type QueryKey = readonly unknown[];

  export interface QueryClientConfig {
    defaultOptions?: Record<string, unknown>;
  }

  export class QueryClient {
    constructor(config?: QueryClientConfig);
    getQueryData<TData = unknown>(queryKey: QueryKey): TData | undefined;
    setQueryData<TData = unknown>(queryKey: QueryKey, data: TData): void;
  }

  export interface QueryClientProviderProps {
    client: QueryClient;
    children: ReactNode;
  }

  export function QueryClientProvider(
    props: QueryClientProviderProps
  ): JSX.Element;

  export interface UseQueryOptions<TData = unknown> {
    queryKey: QueryKey;
    queryFn: () => Promise<TData>;
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
    [key: string]: unknown;
  }

  export type UndefinedInitialDataOptions<TData = unknown> = Partial<
    UseQueryOptions<TData>
  >;

  export interface UseQueryResult<TData = unknown, TError = unknown> {
    data?: TData;
    error?: TError;
    isLoading: boolean;
    isFetching: boolean;
    refetch: () => Promise<unknown>;
    [key: string]: unknown;
  }

  export function useQuery<TData = unknown, TError = unknown>(
    options: UseQueryOptions<TData>
  ): UseQueryResult<TData, TError>;
}
