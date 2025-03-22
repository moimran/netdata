import { useBaseQuery } from './useBaseQuery';
import { TableName } from '../../types';
import { useMemo } from 'react';

export interface TableQueryParams {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  filterField?: string;
  filterValue?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface TableData<T = any> {
  items: T[];
  total: number;
}

/**
 * Hook for fetching table data with pagination, search, filtering, and sorting
 *
 * @param tableName The name of the table to fetch data from
 * @param params Parameters for pagination, search, filtering, and sorting
 * @returns Query result with table data and pagination information
 */
export function useTableData<T = any>(
  tableName: TableName,
  { 
    page = 1, 
    pageSize = 10, 
    searchQuery = '', 
    filterField = '', 
    filterValue = '',
    sortField = '',
    sortDirection = 'asc' 
  }: TableQueryParams = {}
) {
  // Memoize query parameters to prevent unnecessary re-renders
  const queryParams = useMemo(() => {
    const params: Record<string, any> = {};
    
    if (page > 1) {
      params.skip = (page - 1) * pageSize;
    }
    
    params.limit = pageSize;
    
    if (searchQuery) {
      params.search = searchQuery;
    }
    
    if (filterField && filterValue) {
      params[filterField] = filterValue;
    }
    
    if (sortField) {
      params.sort = sortField;
      params.order = sortDirection;
    }
    
    return params;
  }, [page, pageSize, searchQuery, filterField, filterValue, sortField, sortDirection]);
  
  // Memoize key parts to ensure stable query keys
  const keyParts = useMemo(() => 
    [tableName, page, searchQuery, filterField, filterValue, sortField, sortDirection],
    [tableName, page, searchQuery, filterField, filterValue, sortField, sortDirection]
  );
  
  // Use the base query hook with table-specific settings
  const queryResult = useBaseQuery<TableData<T>>({
    url: tableName,
    params: queryParams,
    keyParts,
    // Transform the response to ensure consistent data structure
    transformation: (data) => {
      // Handle different API response formats
      if (Array.isArray(data)) {
        return {
          items: data,
          total: data.length
        };
      } else if (data?.items && Array.isArray(data.items)) {
        return {
          items: data.items,
          total: data.total || data.items.length
        };
      } else if (data?.data && Array.isArray(data.data)) {
        return {
          items: data.data,
          total: data.total || data.data.length
        };
      }
      
      // Default fallback
      return {
        items: [],
        total: 0
      };
    }
  });

  return queryResult;
} 