import { AxiosError } from 'axios';
import { ApiError } from '../api/client';

/**
 * Error types for client-side error handling
 */
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

/**
 * Standardized error structure for client-side error handling
 */
export interface StandardError {
  type: ErrorType;
  message: string;
  fieldErrors?: Record<string, string[]>;
  originalError?: unknown;
  statusCode?: number;
}

/**
 * Determine error type based on status code
 */
function getErrorTypeFromStatus(status: number): ErrorType {
  if (status >= 400 && status < 500) {
    if (status === 401 || status === 403) {
      return ErrorType.AUTHORIZATION;
    }
    if (status === 404) {
      return ErrorType.NOT_FOUND;
    }
    if (status === 422) {
      return ErrorType.VALIDATION;
    }
    return ErrorType.VALIDATION;
  }
  
  if (status >= 500) {
    return ErrorType.SERVER;
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * Format validation errors from API response into a standardized format
 */
export function formatValidationErrors(
  errorData: any
): Record<string, string[]> {
  const formattedErrors: Record<string, string[]> = {};
  
  if (!errorData) return formattedErrors;
  
  // Handle various API error formats
  if (typeof errorData === 'object') {
    // Format 1: { field1: ['error1', 'error2'], field2: ['error3'] }
    if (Object.values(errorData).some(val => Array.isArray(val))) {
      return errorData as Record<string, string[]>;
    }
    
    // Format 2: { field1: 'error1', field2: 'error2' }
    if (Object.values(errorData).some(val => typeof val === 'string')) {
      Object.entries(errorData).forEach(([key, value]) => {
        formattedErrors[key] = [value as string];
      });
      return formattedErrors;
    }
    
    // Format 3: { errors: { field1: ['error1'], field2: ['error2'] } }
    if (errorData.errors && typeof errorData.errors === 'object') {
      return formatValidationErrors(errorData.errors);
    }
    
    // Format 4: { detail: { field1: ['error1'], field2: ['error2'] } }
    if (errorData.detail && typeof errorData.detail === 'object') {
      return formatValidationErrors(errorData.detail);
    }
    
    // Format 5: { fieldErrors: { field1: ['error1'], field2: ['error2'] } }
    if (errorData.fieldErrors && typeof errorData.fieldErrors === 'object') {
      return formatValidationErrors(errorData.fieldErrors);
    }
  }
  
  // Default to general error if we can't parse it
  formattedErrors['_general'] = ['An unexpected error occurred'];
  return formattedErrors;
}

/**
 * Process API error into a standardized format
 */
export function processApiError(error: unknown): StandardError {
  // Handle Axios errors
  if (error instanceof AxiosError) {
    const status = error.response?.status || 0;
    const errorType = getErrorTypeFromStatus(status);
    
    // Get standardized error message from standardizedError if available
    const standardizedError = (error as any).standardizedError as ApiError | undefined;
    const message = standardizedError?.message || error.message || 'An unexpected error occurred';
    
    // Process validation errors if present
    let fieldErrors: Record<string, string[]> | undefined;
    if (errorType === ErrorType.VALIDATION) {
      fieldErrors = formatValidationErrors(error.response?.data);
    }
    
    return {
      type: errorType,
      message,
      fieldErrors,
      originalError: error,
      statusCode: status
    };
  }
  
  // Handle standard ApiError
  if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
    const apiError = error as ApiError;
    const errorType = getErrorTypeFromStatus(apiError.status);
    
    return {
      type: errorType,
      message: apiError.message,
      originalError: error,
      statusCode: apiError.status
    };
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return {
      type: ErrorType.UNKNOWN,
      message: error
    };
  }
  
  // Handle any other type of error
  return {
    type: ErrorType.UNKNOWN,
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    originalError: error
  };
}

/**
 * Convert API errors to form validation errors
 */
export function apiErrorToFormValidation(
  error: unknown
): Record<string, string> {
  const processedError = processApiError(error);
  const result: Record<string, string> = {};
  
  // Add field-specific errors
  if (processedError.fieldErrors) {
    Object.entries(processedError.fieldErrors).forEach(([field, errors]) => {
      if (errors.length > 0) {
        result[field] = errors[0]; // Take the first error message for each field
      }
    });
  }
  
  // Add general error if no field errors or if there's a general error field
  if (Object.keys(result).length === 0 || processedError.fieldErrors?._general) {
    result['_general'] = processedError.message;
  }
  
  return result;
}

/**
 * Get a user-friendly error message
 */
export function getFriendlyErrorMessage(error: unknown): string {
  const processedError = processApiError(error);
  
  switch (processedError.type) {
    case ErrorType.NETWORK:
      return 'Network error. Please check your connection and try again.';
      
    case ErrorType.VALIDATION:
      return 'There were validation errors. Please check the form and try again.';
      
    case ErrorType.AUTHORIZATION:
      return 'You do not have permission to perform this action.';
      
    case ErrorType.NOT_FOUND:
      return 'The requested resource was not found.';
      
    case ErrorType.SERVER:
      return 'Server error. Please try again later.';
      
    default:
      return processedError.message || 'An unexpected error occurred.';
  }
} 