import { useState, useEffect } from 'react';
import { useBaseQuery } from './useBaseQuery';
import { useBaseMutation } from './useBaseMutation';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export interface Prefix {
  id: number;
  prefix: string;
  status: string;
  vrf_id: number | null;
  site_id: number | null;
  tenant_id: number | null;
  depth: number;
  parent_id: number | null;
  child_count: number;
  role_id: number | null;
  is_pool: boolean;
  mark_utilized: boolean;
  description: string | null;
}

export interface UtilizationData {
  percentage: number;
  used: number;
  total: number;
}

// Cache for utilization data to avoid excessive API calls
const utilizationCache = new Map<number, UtilizationData>();

/**
 * Hook for fetching the complete prefix hierarchy
 */
export function usePrefixHierarchy() {
  return useBaseQuery<Prefix[]>({
    url: 'prefixes/hierarchy',
    keyParts: ['prefixes', 'hierarchy'],
    transformation: (data) => {
      // Ensure we have a consistent data structure
      if (Array.isArray(data)) {
        return data;
      } else if (data?.items && Array.isArray(data.items)) {
        return data.items;
      } else if (data?.data && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    }
  });
}

/**
 * Helper function to build a prefix tree from a flat list
 */
export function buildPrefixTree(prefixes: Prefix[]) {
  const prefixMap = new Map<number, Prefix & { children: number[] }>();
  
  // Create a map entry for each prefix with an empty children array
  prefixes.forEach(prefix => {
    prefixMap.set(prefix.id, { ...prefix, children: [] });
  });
  
  // Populate the children arrays
  prefixes.forEach(prefix => {
    if (prefix.parent_id !== null && prefixMap.has(prefix.parent_id)) {
      const parent = prefixMap.get(prefix.parent_id)!;
      parent.children.push(prefix.id);
    }
  });
  
  return prefixMap;
}

/**
 * Helper function to flatten a prefix tree into a sorted array
 */
export function flattenPrefixTree(prefixMap: Map<number, Prefix & { children: number[] }>) {
  const result: Prefix[] = [];
  
  // Helper function to add a prefix and its children recursively
  const addPrefixAndChildren = (prefixId: number, map: Map<number, Prefix & { children: number[] }>) => {
    const prefix = map.get(prefixId);
    if (!prefix) return;
    
    result.push(prefix);
    
    prefix.children.forEach(childId => {
      addPrefixAndChildren(childId, map);
    });
  };
  
  // Start with root prefixes (those without a parent)
  const rootPrefixes = Array.from(prefixMap.values())
    .filter(prefix => prefix.parent_id === null)
    .sort((a, b) => a.prefix.localeCompare(b.prefix));
  
  // Add each root prefix and its children
  rootPrefixes.forEach(prefix => {
    addPrefixAndChildren(prefix.id, prefixMap);
  });
  
  return result;
}

/**
 * Hook for fetching prefix utilization data
 */
export function usePrefixUtilization(prefixId: number) {
  const [utilization, setUtilization] = useState<UtilizationData>({
    percentage: 0,
    used: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchUtilizationData = async () => {
      setIsLoading(true);
      
      try {
        // Check if we have cached data
        if (utilizationCache.has(prefixId)) {
          setUtilization(utilizationCache.get(prefixId)!);
          setIsLoading(false);
          return;
        }
        
        // Fetch from API
        const response = await apiClient.get(`/prefixes/${prefixId}/utilization`);
        const data = response.data;
        
        // Cache the result
        utilizationCache.set(prefixId, data);
        setUtilization(data);
      } catch (error) {
        console.error(`Error fetching utilization for prefix ${prefixId}:`, error);
        // Set default values if API call fails
        setUtilization({ percentage: 0, used: 0, total: 0 });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUtilizationData();
  }, [prefixId]);
  
  return { utilization, isLoading };
}

/**
 * Hook for clearing the utilization cache
 */
export function clearUtilizationCache() {
  utilizationCache.clear();
}

/**
 * Hook for creating a new prefix
 */
export function useCreatePrefix() {
  return useBaseMutation<Prefix, Partial<Prefix>>({
    url: 'prefixes',
    type: 'create',
    invalidateQueries: ['prefixes']
  });
}

/**
 * Hook for updating an existing prefix
 */
export function useUpdatePrefix(prefixId: number) {
  return useBaseMutation<Prefix, Partial<Prefix>>({
    url: `prefixes/${prefixId}`,
    type: 'update',
    invalidateQueries: ['prefixes']
  });
}

/**
 * Hook for deleting a prefix
 */
export function useDeletePrefix() {
  return useBaseMutation<void, number>({
    url: '',
    type: 'delete',
    invalidateQueries: ['prefixes'],
    mutationFn: async (prefixId) => {
      await apiClient.delete(`prefixes/${prefixId}`);
    }
  });
} 