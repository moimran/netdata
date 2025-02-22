import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Regions
  getRegions: () => apiClient.get('/regions/'),
  createRegion: (data: any) => apiClient.post('/regions/', data),
  
  // Site Groups
  getSiteGroups: () => apiClient.get('/site-groups/'),
  createSiteGroup: (data: any) => apiClient.post('/site-groups/', data),
  
  // Sites
  getSites: () => apiClient.get('/sites/'),
  createSite: (data: any) => apiClient.post('/sites/', data),
  
  // VRFs
  getVRFs: () => apiClient.get('/vrfs/'),
  createVRF: (data: any) => apiClient.post('/vrfs/', data),
  
  // Prefixes
  getPrefixes: () => apiClient.get('/prefixes/'),
  createPrefix: (data: any) => apiClient.post('/prefixes/', data),
  
  // IP Ranges
  getIPRanges: () => apiClient.get('/ip-ranges/'),
  createIPRange: (data: any) => apiClient.post('/ip-ranges/', data),
  
  // IP Addresses
  getIPAddresses: () => apiClient.get('/ip-addresses/'),
  createIPAddress: (data: any) => apiClient.post('/ip-addresses/', data),
};
