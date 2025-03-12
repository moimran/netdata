import { useState, useCallback } from 'react';
import { apiClient } from '../../../api/client';
import { FormData, ValidationErrors } from '../types';

interface UseIPAddressPrefixProps {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  setValidationErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
}

export const useIPAddressPrefix = ({
  formData,
  setFormData,
  setValidationErrors
}: UseIPAddressPrefixProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const findMatchingPrefix = useCallback(async (ipAddress: string) => {
    if (!ipAddress) return;
    
    setIsLoading(true);
    try {
      // Clear any existing prefix-related errors
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        if ('prefix_id' in newErrors) {
          delete newErrors.prefix_id;
        }
        return newErrors;
      });

      // Call the API to find the matching prefix
      const response = await apiClient.post('/prefixes/find-prefix', {
        ip: ipAddress,
        vrf_id: formData.vrf_id
      });

      // Update the form data with the found prefix
      setFormData(prev => ({
        ...prev,
        prefix_id: response.data.prefix_id
      }));

      return response.data;
    } catch (error: any) {
      console.error('Error finding matching prefix:', error);
      
      // Set validation error
      setValidationErrors(prev => ({
        ...prev,
        prefix_id: 'Please add related prefix for this ip address'
      }));
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [formData.vrf_id, setFormData, setValidationErrors]);

  return {
    findMatchingPrefix,
    isLoading
  };
};