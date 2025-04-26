import axios from 'axios';

// Define the API URL - use relative path for Vite proxy
export const API_URL = '/api/v1';

// Create an axios instance with default config
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false // Don't send credentials for CORS requests
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      method: config.method,
      baseURL: config.baseURL,
      url: config.url,
      fullUrl: `${config.baseURL}${config.url}`,
      params: config.params,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('API Response Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
        config: {
          baseURL: error.config.baseURL,
          url: error.config.url,
          fullUrl: `${error.config.baseURL}${error.config.url}`,
          method: error.config.method,
          params: error.config.params,
          data: error.config.data
        }
      });
    } else if (error.request) {
      console.error('API Request Error: No response received', error.request);
    } else {
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Helper to handle possible 404 responses
const safeGet = async (url: string) => {
  try {
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    // Check for 404
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.warn(`Endpoint ${url} not found, returning mock data`);
      
      // Return mock data for specific endpoints
      if (url === 'regions') {
        return {
          items: [
            { id: '1', name: 'North America', slug: 'north-america', description: 'North American region' },
            { id: '2', name: 'Europe', slug: 'europe', description: 'European region' },
            { id: '3', name: 'Asia Pacific', slug: 'apac', description: 'Asia Pacific region' },
          ],
          total: 3,
          page: 1,
          size: 10
        };
      }
      
      if (url === 'sites') {
        return {
          items: [
            { id: '1', name: 'New York', slug: 'new-york', status: 'active', region_id: '1' },
            { id: '2', name: 'London', slug: 'london', status: 'active', region_id: '2' },
            { id: '3', name: 'Singapore', slug: 'singapore', status: 'active', region_id: '3' },
          ],
          total: 3,
          page: 1,
          size: 10
        };
      }
      
      if (url === 'vrfs') {
        return {
          items: [
            { id: '1', name: 'Default', rd: '65000:1', description: 'Default VRF' },
            { id: '2', name: 'Customer A', rd: '65000:100', description: 'Customer A VRF' },
          ],
          total: 2,
          page: 1,
          size: 10
        };
      }
      
      if (url === 'prefixes') {
        return {
          items: [
            { id: '1', prefix: '10.0.0.0/8', description: 'Private space' },
            { id: '2', prefix: '192.168.0.0/16', description: 'Private space' },
          ],
          total: 2,
          page: 1,
          size: 10
        };
      }
      
      if (url === 'ip_addresses') {
        return {
          items: [
            { id: '1', address: '10.0.0.1/32', description: 'Gateway' },
            { id: '2', address: '192.168.1.1/32', description: 'Gateway' },
          ],
          total: 2,
          page: 1,
          size: 10
        };
      }
      
      // Default empty response for other endpoints
      return { 
        items: [],
        total: 0,
        page: 1,
        size: 10
      };
    }
    throw error;
  }
};

export const api = {
  // Regions
  getRegions: () => safeGet('regions'),
  createRegion: (data: any) => apiClient.post('regions', data),
  
  // Site Groups
  getSiteGroups: () => safeGet('site_groups'),
  createSiteGroup: (data: any) => apiClient.post('site_groups', data),
  
  // Sites
  getSites: () => safeGet('sites'),
  createSite: (data: any) => apiClient.post('sites', data),
  
  // VRFs
  getVRFs: () => safeGet('vrfs'),
  createVRF: (data: any) => apiClient.post('vrfs', data),
  
  // Prefixes
  getPrefixes: () => safeGet('prefixes'),
  getPrefixHierarchy: () => safeGet('prefixes/hierarchy'),
  getPrefixUtilization: (id: string) => safeGet(`prefixes/${id}/utilization`),
  createPrefix: (data: any) => apiClient.post('prefixes', data),
  
  // IP Ranges
  getIPRanges: () => safeGet('ip_ranges'),
  createIPRange: (data: any) => apiClient.post('ip_ranges', data),
  
  // IP Addresses
  getIPAddresses: () => safeGet('ip_addresses'),
  createIPAddress: (data: any) => apiClient.post('ip_addresses', data),
  
  // Device Inventory
  getDeviceInventory: () => safeGet('device_inventory'),
  getDeviceInventoryByDevice: (deviceId: string) => safeGet(`device_inventory/${deviceId}`),
  
  // Get all table endpoints
  getAllTables: () => safeGet('all-tables'),
  
  // Get schema for a table
  getTableSchema: (tableName: string) => safeGet(`schema/${tableName}`),
  
  // Get reference options for a field
  getReferenceOptions: (tableName: string, fieldName: string) => 
    safeGet(`reference/${tableName}/${fieldName}`),
};

export default api;
