import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiClient } from '../../../api/client';
import { ReferenceItem } from '../types';

interface UseReferenceDataProps {
  referenceTableNames: string[];
  show: boolean;
  tableName: string;
  item?: any;
}

interface UseReferenceDataReturn {
  referenceData: Record<string, any>;
  isLoading: boolean;
  isError: boolean;
  getReferenceData: (referenceName: string) => ReferenceItem[];
  selectedVlanGroup: any;
  setSelectedVlanGroup: React.Dispatch<React.SetStateAction<any>>;
}

export const useReferenceData = ({
  referenceTableNames,
  show,
  tableName,
  item
}: UseReferenceDataProps): UseReferenceDataReturn => {
  const [selectedVlanGroup, setSelectedVlanGroup] = useState<any>(null);

  // Use a single query to fetch all reference data
  const { data: referenceQueryData, isLoading, isError } = useQuery({
    queryKey: ['references', referenceTableNames],
    staleTime: 0, // Always consider the data stale to ensure it's refreshed
    refetchOnMount: true, // Refetch when the component mounts
    refetchOnWindowFocus: true, // Refetch when the window regains focus
    queryFn: async () => {
      const results: Record<string, any> = {};
      
      // Use Promise.all to fetch all reference data in parallel
      await Promise.all(referenceTableNames.map(async (refTableName) => {
        try {
          const response = await apiClient.get(`${refTableName}`);
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
    enabled: show && referenceTableNames.length > 0 // Only fetch when modal is open and there are tables to fetch
  });
  
  // Process reference data
  const referenceData = referenceQueryData || {};
  
  // Set the selectedVlanGroup when reference data is loaded
  useEffect(() => {
    if (tableName === 'vlans' && item?.group_id && referenceData.vlan_groups) {
      // Get the VLAN groups data in a consistent format
      let vlanGroups = referenceData.vlan_groups;
      
      // Ensure we have an array
      if (!Array.isArray(vlanGroups)) {
        vlanGroups = vlanGroups.items || vlanGroups.data || [];
      }
      
      if (Array.isArray(vlanGroups) && vlanGroups.length > 0) {
        // Convert both IDs to strings for comparison to avoid type mismatches
        const selectedGroup = vlanGroups.find((group: any) => String(group.id) === String(item.group_id));
        if (selectedGroup) {
          setSelectedVlanGroup(selectedGroup);
        }
      }
    }
  }, [tableName, item, referenceData]);

  // Helper function to get reference data for a specific table
  const getReferenceData = (referenceName: string): ReferenceItem[] => {
    const refData = referenceData[referenceName];
    if (!refData) return [];
    
    // The data should already be in a consistent format from the queryFn
    // But we'll add a safety check just in case
    if (Array.isArray(refData)) {
      return refData;
    }
    
    // Handle different data structures as a fallback
    return refData.items || refData.data || refData || [];
  };

  return {
    referenceData,
    isLoading,
    isError,
    getReferenceData,
    selectedVlanGroup,
    setSelectedVlanGroup
  };
};
