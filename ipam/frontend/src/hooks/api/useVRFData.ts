import { useBaseQuery } from './useBaseQuery';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export interface VRF {
  id: number;
  name: string;
  rd: string | null;
  description: string | null;
  enforce_unique: boolean;
  tenant_id: number | null;
}

export interface VRFReadWithTargets extends VRF {
  import_targets: RouteTarget[];
  export_targets: RouteTarget[];
}

export interface RouteTarget {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

/**
 * Hook for fetching a specific VRF by ID
 */
export function useVRFDetail(id: string | number | undefined) {
  return useBaseQuery<VRF>({
    url: `vrfs/${id}`,
    keyParts: ['vrfs', id],
    enabled: !!id
  });
}

/**
 * Hook for fetching route targets associated with a VRF
 */
export function useVRFRouteTargets(vrfId: string | number | undefined, type: 'import' | 'export') {
  // Fetch the full VRF details, which now includes the targets
  return useBaseQuery<RouteTarget[]>({ // The generic type is the FINAL type after transformation
    url: `vrfs/${vrfId}`, // Fetch the specific VRF
    keyParts: ['vrfs', vrfId, 'targets', type], // Unique key including type
    enabled: !!vrfId,
    transformation: (data: VRFReadWithTargets): RouteTarget[] => { // Type the INPUT data and ensure sync return
      // Data is the VRF object with import_targets and export_targets arrays
      if (!data) {
        return [];
      }
      // Return the correct list based on the type
      return type === 'import' ? data.import_targets || [] : data.export_targets || [];
    }
  });
}

/**
 * Hook for fetching available route targets that can be added to a VRF
 */
export function useAvailableRouteTargets(
  vrfId: string | number | undefined, 
  type: 'import' | 'export',
  currentTargets?: RouteTarget[]
) {
  return useBaseQuery<RouteTarget[]>({
    url: 'route_targets',
    keyParts: ['route_targets', 'available_for_vrf', vrfId, type],
    enabled: !!vrfId && !!currentTargets,
    transformation: (data) => {
      const allTargets = data.items || [];
      
      // Filter out targets that are already associated with this VRF
      const currentTargetIds = currentTargets 
        ? currentTargets.map((target: RouteTarget) => target.id) 
        : [];
      
      return allTargets.filter((target: RouteTarget) => !currentTargetIds.includes(target.id));
    }
  });
}

/**
 * Hook for adding route targets to a VRF
 */
export function useAddVRFRouteTargets(vrfId: string | number | undefined, type: 'import' | 'export') {
  const queryClient = useQueryClient();

  // Correct types: <TData, TError, TVariables>
  return useMutation<VRFReadWithTargets, Error, { targetIds: number[] }>({ 
    mutationFn: async ({ targetIds }: { targetIds: number[] }) => { // Explicitly type variables
      if (!vrfId) throw new Error('VRF ID is required');

      // 1. Fetch current VRF data to get existing target IDs
      const currentVRF = await queryClient.fetchQuery<VRFReadWithTargets>({ 
        queryKey: ['vrfs', vrfId],
        queryFn: async () => { // Provide the actual fetch logic
          const response = await apiClient.get(`/vrfs/${vrfId}`);
          return response.data;
        },
        staleTime: 0 // Ensure fresh data is fetched for the mutation
      });

      if (!currentVRF) throw new Error('Could not fetch current VRF data');

      // 2. Calculate new list of target IDs
      const existingTargetIds = type === 'import' 
        ? (currentVRF.import_targets || []).map(t => t.id) // Handle null/undefined targets
        : (currentVRF.export_targets || []).map(t => t.id);
        
      const combinedIds = [...existingTargetIds, ...targetIds];
      const uniqueNewTargetIds = Array.from(new Set(combinedIds)); // Ensure uniqueness

      // 3. Prepare PUT payload
      const payload = type === 'import'
        ? { import_target_ids: uniqueNewTargetIds }
        : { export_target_ids: uniqueNewTargetIds };

      // 4. Send PUT request
      const response = await apiClient.put(`/vrfs/${vrfId}`, payload);
      return response.data; // This will be the updated VRF object
    },
    onSuccess: (updatedVRF) => { // Data returned by mutationFn is passed here
      // Update the cache with the new VRF data
      queryClient.setQueryData(['vrfs', vrfId], updatedVRF);

      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['vrfs', vrfId, 'targets', type] }); 
      queryClient.invalidateQueries({ queryKey: ['route_targets', 'available_for_vrf', vrfId, type] }); 
      // Optionally invalidate the main VRF list if needed: queryClient.invalidateQueries({ queryKey: ['vrfs'] });
    }
  });
}

/**
 * Hook for removing a route target from a VRF (new implementation)
 */
export function useRemoveVRFRouteTarget(vrfId: string | number | undefined, type: 'import' | 'export') {
  const queryClient = useQueryClient();

  return useMutation<VRFReadWithTargets, Error, { targetId: number }>({ // Correct types
    mutationFn: async ({ targetId }: { targetId: number }) => { // Correctly typed variables
      if (!vrfId) throw new Error('VRF ID is required');

      // 1. Fetch current VRF data
      const currentVRF = await queryClient.fetchQuery<VRFReadWithTargets>({ 
        queryKey: ['vrfs', vrfId],
        queryFn: async () => { 
          const response = await apiClient.get(`/vrfs/${vrfId}`);
          return response.data;
        },
        staleTime: 0
      });

      if (!currentVRF) throw new Error('Could not fetch current VRF data');

      // 2. Calculate new list of target IDs (filter out the one to remove)
      const existingTargetIds = type === 'import' 
        ? (currentVRF.import_targets || []).map(t => t.id)
        : (currentVRF.export_targets || []).map(t => t.id);

      const updatedTargetIds = existingTargetIds.filter(id => id !== targetId);

      // 3. Prepare PUT payload
      const payload = type === 'import'
        ? { import_target_ids: updatedTargetIds }
        : { export_target_ids: updatedTargetIds };

      // 4. Send PUT request
      const response = await apiClient.put(`/vrfs/${vrfId}`, payload);
      return response.data; // Return updated VRF
    },
    onSuccess: (updatedVRF) => { // Use the 'type' argument from the hook's scope
      // Update the cache
      queryClient.setQueryData(['vrfs', vrfId], updatedVRF);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['vrfs', vrfId, 'targets', type] });
      queryClient.invalidateQueries({ queryKey: ['route_targets', 'available_for_vrf', vrfId, type] });
    }
  });
}