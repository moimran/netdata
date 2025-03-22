import { useEffect } from 'react';
import { useFormState, ValidationErrors } from './useFormState';
import { useBaseMutation } from '../api/useBaseMutation';
import { Column } from '../../components/IPAMTable/schemas';
import { TableName } from '../../types';
import { parseVlanIdRanges, validateVlanIdAgainstGroup } from '../../utils/validation';

export interface IPAMFormProps {
  tableName: TableName;
  schema: Column[];
  item?: any;
  onSuccess?: () => void;
}

/**
 * Specialized form hook for IPAM form handling with schema-based validation
 *
 * @param props IPAM form properties including table name, schema, and item
 * @returns Form state and handlers for IPAM forms
 */
export function useIPAMForm({ tableName, schema, item, onSuccess }: IPAMFormProps) {
  // Generate initial values from schema and item
  const initialValues = {};
  
  // Add default values for each field in the schema
  schema.forEach(field => {
    if (field.name === 'id') return; // Skip ID field
    
    // Special case for name field which is required
    if (field.name === 'name' && !item?.name) {
      initialValues[field.name] = '';
    } else if (field.name === 'slug') {
      // For slug field, set to null to trigger auto-generation in the backend
      initialValues[field.name] = item?.slug || null;
    } else if (field.type === 'boolean') {
      initialValues[field.name] = item?.[field.name] ?? false;
    } else if (field.name === 'status') {
      initialValues[field.name] = item?.[field.name] ?? 'active';
    } else {
      initialValues[field.name] = item?.[field.name] ?? '';
    }
  });
  
  // Special fields for different table types
  if (tableName === 'vlan_groups') {
    initialValues['vlanIdRanges'] = item?.vlan_id_ranges || '1-4094';
  }
  
  // Validate form based on schema
  const validate = (values: Record<string, any>): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    // Validate required fields
    schema.forEach(field => {
      if (field.required && !values[field.name]) {
        errors[field.name] = 'This field is required';
      }
    });
    
    // Validate VLAN ID ranges for VLAN groups
    if (tableName === 'vlan_groups' && values.vlanIdRanges) {
      try {
        const ranges = parseVlanIdRanges(values.vlanIdRanges);
        if (!ranges) {
          errors.vlanIdRanges = 'Invalid VLAN ID ranges format';
        }
      } catch (error: any) {
        errors.vlanIdRanges = error.message || 'Invalid VLAN ID ranges format';
      }
    }
    
    // Validate VLAN ID against VLAN group if both exist
    if (tableName === 'vlans' && values.vid && values.group_id && values.selectedVlanGroup) {
      const validationResult = validateVlanIdAgainstGroup(parseInt(values.vid), values.selectedVlanGroup);
      if (!validationResult.isValid && validationResult.errorMessage) {
        errors.vid = validationResult.errorMessage;
      }
    }
    
    return errors;
  };
  
  // Prepare data for submission
  const prepareSubmissionData = (values: Record<string, any>) => {
    const submissionData = { ...values };
    
    // Remove any temporary form properties that shouldn't be sent to the API
    delete submissionData.selectedVlanGroup;
    
    // Convert empty strings to null for numeric fields and slug fields
    schema.forEach(field => {
      if ((field.type === 'number' && submissionData[field.name] === '') || 
          (field.name === 'slug' && submissionData[field.name] === '')) {
        submissionData[field.name] = null;
      }
    });
    
    // Special handling for VLAN groups
    if (tableName === 'vlan_groups' && submissionData.vlanIdRanges) {
      // Store the raw ranges string
      submissionData.vlan_id_ranges = submissionData.vlanIdRanges.replace(/\s+/g, ''); // Remove spaces
      delete submissionData.vlanIdRanges;
      
      // Also calculate min_vid and max_vid for validation
      try {
        const ranges = parseVlanIdRanges(submissionData.vlan_id_ranges);
        if (ranges) {
          submissionData.min_vid = ranges.min_vid;
          submissionData.max_vid = ranges.max_vid;
        }
      } catch (error) {
        console.error('Error parsing VLAN ID ranges:', error);
      }
    }
    
    return submissionData;
  };
  
  // Use form state hook
  const formState = useFormState({
    initialValues,
    validate
  });
  
  // Create mutation for submitting form
  const mutation = useBaseMutation({
    url: item ? `${tableName}/${item.id}` : tableName,
    type: item ? 'update' : 'create',
    invalidateQueries: [tableName, 'references'],
    onSuccess: () => {
      if (onSuccess) {
        onSuccess();
      }
    }
  });
  
  // Submit handler that prepares data before submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Validate form
    const errors = formState.validateForm();
    if (Object.keys(errors).length > 0) {
      return false;
    }
    
    // Prepare data for submission
    const submissionData = prepareSubmissionData(formState.formData);
    
    // Submit form
    try {
      await mutation.mutateAsync(submissionData);
      return true;
    } catch (error: any) {
      // Handle API errors
      if (error.response?.data) {
        const apiErrors: ValidationErrors = {};
        
        // Parse error structure from API
        if (error.response.data.detail) {
          if (Array.isArray(error.response.data.detail)) {
            error.response.data.detail.forEach((err: any) => {
              if (err.loc && err.loc[1]) {
                apiErrors[err.loc[1]] = err.msg;
              }
            });
          } else {
            apiErrors.general = error.response.data.detail;
          }
        } else if (error.response.data.message) {
          apiErrors.general = error.response.data.message;
        } else {
          apiErrors.general = 'An error occurred while submitting the form';
        }
        
        formState.setValidationErrors(apiErrors);
      } else {
        formState.setValidationErrors({
          general: error.message || 'An error occurred while submitting the form'
        });
      }
      return false;
    }
  };
  
  return {
    ...formState,
    isSubmitting: mutation.isPending,
    submitForm: handleSubmit,
    vlanIdRanges: formState.formData.vlanIdRanges as string,
    setVlanIdRanges: (value: string) => formState.handleChange('vlanIdRanges', value)
  };
} 