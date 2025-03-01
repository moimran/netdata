import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { FormData, ValidationErrors } from '../types';

interface UseFormSubmitProps {
  tableName: string;
  item?: any;
  onHide: () => void;
  setValidationErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useFormSubmit = ({
  tableName,
  item,
  onHide,
  setValidationErrors,
  setLoading
}: UseFormSubmitProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      try {
        if (item) {
          await apiClient.put(`${tableName}/${item.id}`, data);
        } else {
          await apiClient.post(`${tableName}`, data);
        }
        return true;
      } catch (error: any) {
        console.error("API Error:", error);
        
        // Initialize errors object
        const errors: ValidationErrors = {};
        
        // Check for validation errors in the response
        if (error.response?.data) {
          console.log("Error response data:", error.response.data);
          
          // Handle different error formats
          if (error.response.data.detail) {
            const errorDetail = error.response.data.detail;
            
            // Check if detail is an object with its own detail property (nested structure)
            if (typeof errorDetail === 'object' && errorDetail.detail) {
              // This handles the case where detail is an object with its own detail property
              const detailMessage = errorDetail.detail;
              
              // Special handling for prefix+VRF uniqueness constraint
              if (errorDetail.error_type === 'unique_violation' && errorDetail.constraint === 'uq_prefix_vrf') {
                if (tableName === 'prefixes') {
                  // Get the specific prefix and VRF values if available
                  const prefixValue = errorDetail.prefix || '';
                  const vrfName = errorDetail.vrf_name || 'this VRF';
                  
                  errors['prefix'] = `This prefix (${prefixValue}) already exists with ${vrfName}.`;
                  errors['vrf_id'] = `A prefix with this network already exists in ${vrfName}.`;
                  
                  // Also set a general error for visibility
                  errors['general'] = `Duplicate prefix: ${prefixValue} already exists in ${vrfName}.`;
                } else {
                  errors['general'] = detailMessage;
                }
              } else {
                errors['general'] = detailMessage;
              }
            } else if (Array.isArray(errorDetail)) {
              // Handle array of validation errors
              errorDetail.forEach((err: any) => {
                if (err.loc && err.loc[1]) {
                  errors[err.loc[1]] = err.msg;
                }
              });
            } else {
              // Handle string error message
              const errorData = error.response.data;
              const detailMessage = errorData.detail;
              
              // Special handling for prefix+VRF uniqueness constraint
              if (errorData.error_type === 'unique_violation' && errorData.constraint === 'uq_prefix_vrf') {
                if (tableName === 'prefixes') {
                  // Get the specific prefix and VRF values if available
                  const prefixValue = errorData.prefix || '';
                  const vrfName = errorData.vrf_name || 'this VRF';
                  
                  errors['prefix'] = `This prefix (${prefixValue}) already exists with ${vrfName}.`;
                  errors['vrf_id'] = `A prefix with this network already exists in ${vrfName}.`;
                  
                  // Also set a general error for visibility
                  errors['general'] = `Duplicate prefix: ${prefixValue} already exists in ${vrfName}.`;
                } else {
                  errors['general'] = detailMessage;
                }
              } else {
                errors['general'] = detailMessage;
              }
            }
          } else if (typeof error.response.data === 'string') {
            // Handle plain string error
            errors['general'] = error.response.data;
          } else if (error.response.data.message) {
            // Handle message property
            errors['general'] = error.response.data.message;
          } else {
            // Fallback for handling other error formats
            if (error.message === 'Network Error') {
              errors['general'] = 'Network error: Unable to connect to the server. Please check your connection and try again.';
            } else {
              errors['general'] = error.message || 'An error occurred while saving the data.';
            }
          }
        }
        
        // Check for specific error types based on status code
        if (error.response?.status === 409) {
          // Conflict - record already exists
          if (tableName === 'devices' && error.response.data) {
            // Special handling for duplicate devices
            const nameValue = error.response.data.name || data.name || '';
            errors['name'] = `Device with name '${nameValue}' already exists. Please use a different name.`;
            errors['general'] = `Device with name '${nameValue}' already exists. Please use a different name.`;
          } else if (!Object.keys(errors).length) {
            // If no specific field errors were set above set a generic one
            errors['general'] = 'This record already exists in the database.';
          }
        } else if (error.response?.status === 400) {
          // Bad request - validation error
          if (!Object.keys(errors).length) {
            errors['general'] = 'The data you submitted is invalid.';
          }
        } else if (error.response?.status === 500) {
          // Server error
          errors['general'] = 'A server error occurred. Please try again later.';
        } else if (!Object.keys(errors).length) {
          // If no specific errors were found, set a generic error
          if (error.message === 'Network Error') {
            errors['general'] = 'Network error: Unable to connect to the server. Please check your connection and try again.';
          } else {
            errors['general'] = error.message || 'An error occurred while saving the data.';
          }
        }
        
        // Set validation errors to display in the form
        setValidationErrors(errors);
        
        // Throw the error to be caught by the mutation's onError handler
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate queries based on the table name
      // This ensures all components using this data will refresh
      
      // Always invalidate the standard table query with a forced refetch
      queryClient.invalidateQueries({ 
        queryKey: ['table', tableName],
        refetchType: 'all' 
      });
      
      // Invalidate reference data queries to ensure references are updated
      queryClient.invalidateQueries({ 
        queryKey: ['references'],
        refetchType: 'all'
      });
      
      // For specific tables, also invalidate their specialized queries
      if (tableName === 'prefixes') {
        // Invalidate prefix hierarchy queries
        queryClient.invalidateQueries({ queryKey: ['prefixes', 'hierarchy'] });
        // Also invalidate general prefixes queries
        queryClient.invalidateQueries({ queryKey: ['prefixes'] });
      } else if (tableName === 'ip_addresses') {
        // Invalidate IP address queries
        queryClient.invalidateQueries({ queryKey: ['ip_addresses'] });
        // Also invalidate prefix utilization since IP addresses affect it
        queryClient.invalidateQueries({ queryKey: ['prefixes', 'utilization'] });
      } else if (tableName === 'vrfs') {
        // Invalidate VRF queries
        queryClient.invalidateQueries({ queryKey: ['vrfs'] });
      } else if (tableName === 'vlan_groups' || tableName === 'vlans') {
        // Invalidate VLAN-related queries
        queryClient.invalidateQueries({ queryKey: ['vlans'] });
        queryClient.invalidateQueries({ queryKey: ['vlan_groups'] });
      } else if (tableName === 'regions') {
        // Invalidate regions queries
        queryClient.invalidateQueries({ queryKey: ['regions'] });
      }
      
      // Close the modal
      onHide();
    },
    onError: (error: any) => {
      setLoading(false);
      
      // If there's a network error and no validation errors were set in the mutation function
      if (error.message === 'Network Error' && !Object.keys(error).length) {
        setValidationErrors({
          general: 'Network error: Unable to connect to the server. Please check your connection and try again.'
        });
      }
    }
  });

  return mutation;
};
