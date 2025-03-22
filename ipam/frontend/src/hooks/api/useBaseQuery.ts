import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { AxiosError } from 'axios';

export interface BaseQueryOptions<TData = unknown> extends Omit<UseQueryOptions<TData, AxiosError>, 'queryKey' | 'queryFn'> {
  url: string;
  params?: Record<string, any>;
  transformation?: (data: any) => TData;
  keyParts?: any[];
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
  ...restOptions
}: BaseQueryOptions<TData>): UseQueryResult<TData, AxiosError> {
  const queryKey = ['data', url, params, ...keyParts];

  return useQuery<TData, AxiosError>({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get(url, { params });
      
      // Transform the data if transformation function is provided
      if (transformation) {
        return transformation(response.data);
      }
      
      return response.data;
    },
    ...restOptions
  });
} 