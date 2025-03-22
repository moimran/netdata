import { useMutation, UseMutationOptions, UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { AxiosError } from 'axios';

export type MutationType = 'create' | 'update' | 'delete';

export interface BaseMutationOptions<TData = unknown, TVariables = unknown> 
  extends Omit<UseMutationOptions<TData, AxiosError, TVariables>, 'mutationFn'> {
  url: string;
  type: MutationType;
  invalidateQueries?: string[];
  onSuccessCallback?: (data: TData, variables: TVariables) => void;
  transformation?: (responseData: any) => TData;
}

/**
 * A base mutation hook that handles common patterns for data modification
 *
 * @param options Options for the mutation including URL, type, and query invalidation
 * @returns Mutation result with methods for triggering mutations and handling loading/error states
 */
export function useBaseMutation<TData = unknown, TVariables = unknown>({
  url,
  type,
  invalidateQueries = [],
  onSuccessCallback,
  transformation,
  ...restOptions
}: BaseMutationOptions<TData, TVariables>): UseMutationResult<TData, AxiosError, TVariables> {
  const queryClient = useQueryClient();

  return useMutation<TData, AxiosError, TVariables>({
    mutationFn: async (variables) => {
      let response;

      switch (type) {
        case 'create':
          response = await apiClient.post(url, variables);
          break;
        case 'update':
          response = await apiClient.put(url, variables);
          break;
        case 'delete':
          response = await apiClient.delete(url);
          break;
        default:
          throw new Error(`Unknown mutation type: ${type}`);
      }

      // Transform the data if a transformation function is provided
      if (transformation) {
        return transformation(response.data);
      }

      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      });

      // Call the success callback if provided
      if (onSuccessCallback) {
        onSuccessCallback(data, variables);
      }
    },
    ...restOptions
  });
} 