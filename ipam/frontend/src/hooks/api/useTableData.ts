import { useBaseQuery } from './useBaseQuery';
import { TableName } from '../../types';

export interface TableQueryParams {
  page?: number;
  pageSize?: number;
  searchQuery?: string;
  filterField?: string;
  filterValue?: string;
}

export interface TableData<T = any> {
  items: T[];
  total: number;
}

/**
 * Hook for fetching table data with pagination, search, and filtering
 *
 * @param tableName The name of the table to fetch data from
 * @param params Parameters for pagination, search, and filtering
 * @returns Query result with table data and pagination information
 */
export function useTableData<T = any>(
  tableName: TableName,
  { page = 1, pageSize = 10, searchQuery = '', filterField = '', filterValue = '' }: TableQueryParams = {}
) {
  // Build query parameters for the API request
  const queryParams: Record<string, any> = {};
  
  if (page > 1) {
    queryParams.skip = (page - 1) * pageSize;
  }
  
  queryParams.limit = pageSize;
  
  if (searchQuery) {
    queryParams.search = searchQuery;
  }
  
  if (filterField && filterValue) {
    queryParams[filterField] = filterValue;
  }
  
  // Use the base query hook with table-specific settings
  return useBaseQuery<TableData<T>>({
    url: tableName,
    params: queryParams,
    keyParts: [tableName, page, searchQuery, filterField, filterValue],
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
} 