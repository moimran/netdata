import axios from 'axios';

// Define the API URL
export const API_URL = 'http://localhost:9001/api/v1';

// Create an axios instance with default config
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', {
      method: config.method,
      url: config.url,
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
          url: error.config.url,
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

export const api = {
  // Regions
  getRegions: () => apiClient.get('/regions'),
  createRegion: (data: any) => apiClient.post('/regions', data),
  
  // Site Groups
  getSiteGroups: () => apiClient.get('/site_groups'),
  createSiteGroup: (data: any) => apiClient.post('/site_groups', data),
  
  // Sites
  getSites: () => apiClient.get('/sites'),
  createSite: (data: any) => apiClient.post('/sites', data),
  
  // VRFs
  getVRFs: () => apiClient.get('/vrfs'),
  createVRF: (data: any) => apiClient.post('/vrfs', data),
  
  // Prefixes
  getPrefixes: () => apiClient.get('/prefixes'),
  createPrefix: (data: any) => apiClient.post('/prefixes', data),
  
  // IP Ranges
  getIPRanges: () => apiClient.get('/ip_ranges'),
  createIPRange: (data: any) => apiClient.post('/ip_ranges', data),
  
  // IP Addresses
  getIPAddresses: () => apiClient.get('/ip_addresses'),
  createIPAddress: (data: any) => apiClient.post('/ip_addresses', data),
};
