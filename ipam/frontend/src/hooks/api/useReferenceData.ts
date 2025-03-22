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
    staleTime: 0, // Always consider the data stale to ensure it's refreshed
    refetchOnMount: true, // Refetch when the component mounts
    refetchOnWindowFocus: true, // Refetch when the window regains focus
    queryFn: async () => {
      const results: Record<string, any[]> = {};
      
      // Use Promise.all to fetch all reference data in parallel
      await Promise.all(referenceTableNames.map(async (refTableName) => {
        try {
          const response = await apiClient.get(`${refTableName}`);
          // Ensure we have a consistent data structure
          const responseData = response.data;
          
          // Store data in a consistent format
          if (Array.isArray(responseData)) {
            results[refTableName] = responseData;
          } else if (responseData?.items && Array.isArray(responseData.items)) {
            results[refTableName] = responseData.items;
          } else if (responseData?.data && Array.isArray(responseData.data)) {
            results[refTableName] = responseData.data;
          } else {
            // Default to empty array if we can't determine the structure
            results[refTableName] = [];
          }
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