import { useBaseQuery } from './useBaseQuery';
import { useBaseMutation } from './useBaseMutation';
import { useQueryClient } from '@tanstack/react-query';

export interface VRF {
  id: number;
  name: string;
  rd: string | null;
  description: string | null;
  enforce_unique: boolean;
  tenant_id: number | null;
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
  const tableName = type === 'import' ? 'vrf_import_targets' : 'vrf_export_targets';
  
  return useBaseQuery<RouteTarget[]>({
    url: tableName,
    params: { vrf_id: vrfId },
    keyParts: [tableName, vrfId],
    enabled: !!vrfId,
    transformation: async (data) => {
      // Get the junction table entries
      const junctionItems = data.items || [];
      
      if (junctionItems.length === 0) {
        return [];
      }
      
      // Extract the route target IDs
      const targetIds = junctionItems.map((item: any) => item.route_target_id);
      
      // Fetch each route target individually
      const targetsPromises = targetIds.map((targetId: number) => 
        fetch(`/api/v1/route_targets/${targetId}`)
          .then(res => res.json())
      );
      
      // Wait for all promises to resolve
      const targets = await Promise.all(targetsPromises);
      return targets;
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
  const tableName = type === 'import' ? 'vrf_import_targets' : 'vrf_export_targets';
  
  return useBaseMutation<any, { targetIds: number[] }>({
    url: tableName,
    type: 'create',
    invalidateQueries: [tableName, 'vrfs'],
    mutationFn: async ({ targetIds }) => {
      // Create junction table entries for each target ID
      const results = await Promise.all(targetIds.map(targetId => 
        fetch(`/api/v1/${tableName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            vrf_id: Number(vrfId), 
            route_target_id: targetId 
          })
        }).then(res => res.json())
      ));
      
      return results;
    },
    onSuccess: () => {
      // Invalidate specific queries
      queryClient.invalidateQueries({ queryKey: [tableName, vrfId] });
      queryClient.invalidateQueries({ queryKey: ['route_targets', 'available_for_vrf'] });
    }
  });
}

/**
 * Hook for removing a route target from a VRF
 */
export function useRemoveVRFRouteTarget(vrfId: string | number | undefined) {
  const queryClient = useQueryClient();
  
  return useBaseMutation<any, { targetId: number, type: 'import' | 'export' }>({
    url: '', // URL will be determined in the mutation function
    type: 'delete',
    invalidateQueries: ['vrf_import_targets', 'vrf_export_targets', 'vrfs'],
    mutationFn: async ({ targetId, type }) => {
      const tableName = type === 'import' ? 'vrf_import_targets' : 'vrf_export_targets';
      
      // Find the junction table entry
      const response = await fetch(`/api/v1/${tableName}?vrf_id=${vrfId}&route_target_id=${targetId}`);
      const data = await response.json();
      const junctionItems = data.items || [];
      
      if (junctionItems.length === 0) {
        throw new Error('Junction table entry not found');
      }
      
      // Delete the junction table entry
      const junctionId = junctionItems[0].id;
      await fetch(`/api/v1/${tableName}/${junctionId}`, {
        method: 'DELETE'
      });
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      const tableName = variables.type === 'import' ? 'vrf_import_targets' : 'vrf_export_targets';
      queryClient.invalidateQueries({ queryKey: [tableName, vrfId] });
      queryClient.invalidateQueries({ queryKey: ['route_targets', 'available_for_vrf'] });
    }
  });
} 