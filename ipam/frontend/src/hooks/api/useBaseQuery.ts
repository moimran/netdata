import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { AxiosError } from 'axios';

export interface BaseQueryOptions<TData = unknown> extends Omit<UseQueryOptions<TData, AxiosError>, 'queryKey' | 'queryFn'> {
  url: string;
  params?: Record<string, any>;
  transformation?: (data: any) => TData;
  keyParts?: any[];
  staleTime?: number;
  gcTime?: number; // Renamed from cacheTime for React Query v5+
}

/**
 * A base query hook that handles common patterns for data fetching
 *
 * @param options Options for the query including URL, params, and data transformation
 * @returns Query result with data, loading state, and error handling
 */
export function useBaseQuery<TData = unknown>({
  url,
  params,
  transformation,
  keyParts = [],
  staleTime = 5 * 60 * 1000,
  gcTime = 10 * 60 * 1000, // Renamed from cacheTime
  ...restOptions
}: BaseQueryOptions<TData>): UseQueryResult<TData, AxiosError> {
  const queryKey = ['data', url, params, ...keyParts];

  return useQuery<TData, AxiosError>({
    queryKey,
    queryFn: async () => {
      console.log(`---> Entering queryFn for url: ${url}`); // DEBUG
      try {
        const response = await apiClient.get(url, { params });
        console.log(`---> apiClient.get successful for url: ${url}`); // DEBUG
        
        // Transform the data if transformation function is provided
        if (transformation) {
          return transformation(response.data);
        }
        
        return response.data;
      } catch (error) {
        console.error(`---> Error in queryFn for url: ${url}`, error); // DEBUG
        throw error; // Re-throw error for react-query to handle
      }
    },
    staleTime,
    gcTime, // Renamed from cacheTime
    retry: 1,
    refetchOnWindowFocus: false,
    ...restOptions
  });
} 