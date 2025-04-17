import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { nanoid } from 'nanoid';

// Define standard error structure
export interface ApiError {
  status: number;
  message: string;
  details?: any;
  code?: string;
}

// Interface for pending requests cache
interface PendingRequest {
  id: string;
  timestamp: number;
  controller: AbortController;
}

// Cache for in-flight requests to support deduplication
const pendingRequests = new Map<string, PendingRequest>();

// Default request timeout (10 seconds)
const DEFAULT_TIMEOUT = 10000;

// Time window for deduplication (in milliseconds)
const DEDUPLICATION_WINDOW = 500;

// Create a base axios instance with common configuration
export const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Get cache key for a request based on its method, url, and params/data
function getCacheKey(config: AxiosRequestConfig): string {
  const { method, url, params, data } = config;
  return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
}

// Helper to clean up expired pending requests
function cleanupPendingRequests() {
  const now = Date.now();
  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > DEDUPLICATION_WINDOW) {
      pendingRequests.delete(key);
    }
  }
}

// Intercept requests for deduplication and additional handling
apiClient.interceptors.request.use(
  (config) => {
    // Clean up old pending requests
    cleanupPendingRequests();

    // Generate request ID
    const requestId = nanoid();
    
    // Add request ID to headers for tracing
    config.headers = {
      ...config.headers,
      'X-Request-ID': requestId
    };

    // Skip deduplication for non-GET requests
    if (config.method?.toLowerCase() !== 'get') {
      return config;
    }

    // Create cache key for this request
    const cacheKey = getCacheKey(config);
    
    // If we have a pending request with the same key, abort it
    if (pendingRequests.has(cacheKey)) {
      const existingRequest = pendingRequests.get(cacheKey)!;
      
      // Return the existing request's config to reuse the promise
      return config;
    }
    
    // Add this request to pending cache
    const controller = new AbortController();
    config.signal = controller.signal;
    
    pendingRequests.set(cacheKey, {
      id: requestId,
      timestamp: Date.now(),
      controller
    });
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for common error handling and cleanup
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Find and remove this request from pending cache
    const cacheKey = getCacheKey(response.config);
    pendingRequests.delete(cacheKey);
    
    return response;
  },
  (error: AxiosError) => {
    // Find and remove this request from pending cache
    if (error.config) {
      const cacheKey = getCacheKey(error.config);
      pendingRequests.delete(cacheKey);
    }
    
    // Transform all API errors to a standard format
    const standardError: ApiError = {
      status: error.response?.status || 500,
      message: 'An unexpected error occurred'
    };
    
    // Handle axios errors
    if (error.response) {
      // The server responded with a status code outside the 2xx range
      standardError.status = error.response.status;
      
      // Try to extract error message from various API formats
      if (error.response.data) {
        if (typeof error.response.data === 'string') {
          standardError.message = error.response.data;
        } else if (error.response.data.message) {
          standardError.message = error.response.data.message;
        } else if (error.response.data.error) {
          standardError.message = error.response.data.error;
        } else if (error.response.data.detail) {
          standardError.message = error.response.data.detail;
        }
        
        standardError.details = error.response.data;
      }
    } else if (error.request) {
      // The request was made but no response was received
      standardError.message = 'No response from server';
      standardError.code = 'NETWORK_ERROR';
    } else {
      // Something happened in setting up the request
      standardError.message = error.message;
      standardError.code = 'REQUEST_SETUP_ERROR';
    }
    
    // Attach standardized error to the original error
    error.standardizedError = standardError;
    
    return Promise.reject(error);
  }
);

export default apiClient; 