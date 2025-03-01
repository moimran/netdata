import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

// Custom hook to fetch reference data for tables
export const useReferenceData = (referenceTableNames: string[]) => {
  const { data: referenceQueryData } = useQuery({
    queryKey: ['references', referenceTableNames],
    staleTime: 0, // Always consider the data stale to ensure it's refreshed
    refetchOnMount: true, // Refetch when the component mounts
    refetchOnWindowFocus: true, // Refetch when the window regains focus
    queryFn: async () => {
      const results: Record<string, any> = {};
      
      // Use Promise.all to fetch all reference data in parallel
      await Promise.all(referenceTableNames.map(async (refTableName) => {
        try {
          console.log(`Fetching reference data for ${refTableName}`);
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
          
          console.log(`Fetched ${results[refTableName].length} items for ${refTableName}`);
        } catch (error) {
          console.error(`Error fetching ${refTableName}:`, error);
          results[refTableName] = [];
        }
      }));
      
      return results;
    },
    enabled: referenceTableNames.length > 0
  });
  
  return referenceQueryData || {};
};
