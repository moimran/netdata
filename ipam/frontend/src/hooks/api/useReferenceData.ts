import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

/**
 * Hook for fetching reference data from multiple tables efficiently
 *
 * @param referenceTableNames Array of table names to fetch reference data from
 * @param enabled Whether the query should be enabled
 * @returns Object containing reference data, loading state, and utility functions
 */
export function useReferenceData(
  referenceTableNames: string[] = [],
  enabled: boolean = true
) {
  const [referenceData, setReferenceData] = useState<Record<string, any[]>>({});
  
  // Fetch reference data for all specified tables in parallel
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['references', referenceTableNames],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to reduce unnecessary refetches
    refetchOnMount: 'always', // Only refetch if the data is stale
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    queryFn: async () => {
      const results: Record<string, any[]> = {};
      
      // Use Promise.all to fetch all reference data in parallel
      await Promise.all(referenceTableNames.map(async (refTableName) => {
        try {
          // Use the maximum limit the API allows (100)
          const limit = 100;
          let allItems: any[] = [];
          let page = 0;
          let hasMore = true;
          
          // Fetch first page
          const firstResponse = await apiClient.get(`${refTableName}`, {
            params: {
              limit: limit,
              skip: 0
            }
          });
          
          // Process the first page response
          let responseData = firstResponse.data;
          let items: any[] = [];
          
          // Extract items based on response structure
          if (Array.isArray(responseData)) {
            items = responseData;
          } else if (responseData?.items && Array.isArray(responseData.items)) {
            items = responseData.items;
            // If we have pagination info, use it
            if (responseData.total !== undefined) {
              hasMore = items.length < responseData.total;
            } else {
              hasMore = items.length === limit;
            }
          } else if (responseData?.data && Array.isArray(responseData.data)) {
            items = responseData.data;
          } else {
            items = [];
            hasMore = false;
          }
          
          // Add first page items to our collection
          allItems = [...allItems, ...items];
          page++;
          
          console.log(`Fetched page ${page} for ${refTableName}: ${items.length} items`);
          
          // If we need more pages and have fewer than 500 items total (to avoid excessive requests)
          while (hasMore && allItems.length < 500) {
            try {
              const nextResponse = await apiClient.get(`${refTableName}`, {
                params: {
                  limit: limit,
                  skip: page * limit
                }
              });
              
              // Process the next page
              responseData = nextResponse.data;
              
              // Extract items based on response structure
              if (Array.isArray(responseData)) {
                items = responseData;
                hasMore = items.length === limit;
              } else if (responseData?.items && Array.isArray(responseData.items)) {
                items = responseData.items;
                // If we have pagination info, use it
                if (responseData.total !== undefined) {
                  hasMore = allItems.length + items.length < responseData.total;
                } else {
                  hasMore = items.length === limit;
                }
              } else if (responseData?.data && Array.isArray(responseData.data)) {
                items = responseData.data;
                hasMore = items.length === limit;
              } else {
                items = [];
                hasMore = false;
              }
              
              // If we got no items, we're done
              if (items.length === 0) {
                hasMore = false;
              } else {
                // Add items to our collection
                allItems = [...allItems, ...items];
                console.log(`Fetched page ${page + 1} for ${refTableName}: ${items.length} items, total so far: ${allItems.length}`);
                page++;
              }
            } catch (error) {
              console.error(`Error fetching page ${page + 1} for ${refTableName}:`, error);
              hasMore = false;
            }
          }
          
          // Store all items in the results
          results[refTableName] = allItems;
          console.log(`Processed ${results[refTableName].length} total items for ${refTableName}`);
        } catch (error) {
          console.error(`Error fetching ${refTableName}:`, error);
          results[refTableName] = [];
        }
      }));
      
      return results;
    },
    enabled: enabled && referenceTableNames.length > 0
  });
  
  useEffect(() => {
    if (data) {
      setReferenceData(data);
    }
  }, [data]);
  
  /**
   * Get a reference item by its ID
   * 
   * @param tableName The reference table name
   * @param id The ID of the item to find
   * @returns The reference item or undefined if not found
   */
  const getReferenceItem = (tableName: string, id: number | string | null) => {
    if (id === null || id === undefined) return null;
    
    const items = referenceData[tableName] || [];
    return items.find(item => String(item.id) === String(id)) || null;
  };
  
  /**
   * Format a reference value for display
   * 
   * @param value The reference ID
   * @param tableName The reference table name
   * @returns Formatted display string for the reference
   */
  const formatReferenceValue = (value: number | string | null, tableName: string): string => {
    if (value === null) return '-';
    
    const referencedItem = getReferenceItem(tableName, value);
    
    if (referencedItem) {
      // Special handling for prefixes
      if (tableName === 'prefixes' && referencedItem.prefix) {
        return referencedItem.prefix;
      }
      
      // Return the name property if it exists, otherwise fall back to other common properties
      return referencedItem.name || referencedItem.rd || String(value);
    }
    
    return `${tableName} #${value}`;
  };
  
  return {
    referenceData,
    isLoading,
    isError,
    refetch,
    getReferenceItem,
    formatReferenceValue
  };
} 