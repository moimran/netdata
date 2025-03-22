import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { AxiosError } from 'axios';

export type MutationType = 'create' | 'update' | 'delete';

export interface BaseMutationOptions<TData = unknown, TVariables = unknown> extends Omit<
  UseMutationOptions<TData, AxiosError, TVariables>,
  'mutationFn'
> {
  url: string;
  type: MutationType;
  mutationFn?: (variables: TVariables) => Promise<TData>;
  invalidateQueries?: string[];
  optimisticUpdate?: {
    queryKey: unknown[];
    updateFn: (oldData: any, variables: TVariables) => any;
  };
}

/**
 * A base mutation hook that handles common patterns for data mutations
 *
 * @param options Options for the mutation including URL, type, and query invalidation
 * @returns Mutation result with data, loading state, and error handling
 */
export function useBaseMutation<TData = unknown, TVariables = unknown>({
  url,
  type,
  invalidateQueries = [],
  mutationFn,
  optimisticUpdate,
  ...restOptions
}: BaseMutationOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  // Replace $id in URL with the actual ID from variables
  const getActualUrl = (variables: any) => {
    let actualUrl = url;
    if (typeof variables === 'object' && variables.id) {
      actualUrl = url.replace('$id', variables.id);
    } else if (typeof variables === 'number' || typeof variables === 'string') {
      actualUrl = url.replace('$id', variables);
    }
    return actualUrl;
  };

  return useMutation<TData, AxiosError, TVariables>({
    mutationFn: mutationFn || (async (variables) => {
      const actualUrl = getActualUrl(variables);
      
      switch (type) {
        case 'create':
          return (await apiClient.post(actualUrl, variables)).data;
        case 'update':
          return (await apiClient.put(actualUrl, variables)).data;
        case 'delete':
          return (await apiClient.delete(actualUrl)).data;
        default:
          throw new Error(`Unknown mutation type: ${type}`);
      }
    }),
    
    onMutate: async (variables) => {
      // If optimistic update is enabled
      if (optimisticUpdate) {
        // Cancel any outgoing refetches to avoid overwriting our optimistic update
        await queryClient.cancelQueries({ queryKey: optimisticUpdate.queryKey });
        
        // Snapshot the previous value
        const previousData = queryClient.getQueryData(optimisticUpdate.queryKey);
        
        // Optimistically update to the new value
        queryClient.setQueryData(optimisticUpdate.queryKey, (old) => 
          optimisticUpdate.updateFn(old, variables)
        );
        
        // Return a context object with the snapshotted value
        return { previousData };
      }
      return undefined;
    },
    
    onError: (err, variables, context) => {
      // If optimistic update is enabled, roll back on error
      if (optimisticUpdate && context) {
        queryClient.setQueryData(optimisticUpdate.queryKey, context.previousData);
      }
    },
    
    onSettled: () => {
      // Invalidate all relevant queries after mutation has settled
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(query => {
          queryClient.invalidateQueries({ queryKey: ['data', query] });
        });
      }
    },
    
    ...restOptions
  });
} 