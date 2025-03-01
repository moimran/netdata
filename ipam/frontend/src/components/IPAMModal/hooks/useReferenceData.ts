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
    queryFn: async () => {
      const results: Record<string, any> = {};
      
      // Use Promise.all to fetch all reference data in parallel
      await Promise.all(referenceTableNames.map(async (refTableName) => {
        try {
          const response = await apiClient.get(`${refTableName}`);
          results[refTableName] = response.data;
        } catch (error) {
          console.error(`Error fetching ${refTableName}:`, error);
          results[refTableName] = { items: [] };
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
      const vlanGroups = referenceData.vlan_groups.items || referenceData.vlan_groups.data || referenceData.vlan_groups || [];
      if (Array.isArray(vlanGroups)) {
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
    
    // Handle different data structures
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
