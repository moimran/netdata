import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client'; 
import { RouteTarget } from './useVRFData'; 
 
interface FetchResponse {
  items: RouteTarget[];
  total: number;
  page: number;
  pageSize: number;
}

// Fetches all route targets (assumes API supports fetching all with a large page size or no pagination)
const fetchAllRouteTargets = async (): Promise<RouteTarget[]> => {
  // Adjust page size if needed, or if API has a specific 'all' parameter
  const { data } = await apiClient.get<FetchResponse>('/route_targets', {
    params: { page: 1, pageSize: 1000 }, // Fetch up to 1000 targets
  });
  return data.items;
};

interface UseAllRouteTargetsOptions {
  enabled?: boolean;
}

export const useAllRouteTargets = (options?: UseAllRouteTargetsOptions) => {
  return useQuery<RouteTarget[], Error>({
    queryKey: ['allRouteTargets'],
    queryFn: fetchAllRouteTargets,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: options?.enabled !== undefined ? options.enabled : true, // Default to true if not specified
  });
};
