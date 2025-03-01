import { useState, useEffect } from 'react';
import { FormData, ValidationErrors, Column } from '../types';
import { parseVlanIdRanges, validateVlanIdAgainstGroup } from '../utils/validation';

interface UseFormDataProps {
  schema: Column[];
  item?: any;
  tableName: string;
}

interface UseFormDataReturn {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  validationErrors: ValidationErrors;
  setValidationErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  vlanIdRanges: string;
  setVlanIdRanges: React.Dispatch<React.SetStateAction<string>>;
  selectedVlanGroup: any;
  setSelectedVlanGroup: React.Dispatch<React.SetStateAction<any>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  validateForm: () => ValidationErrors;
  handleVlanIdChange: (newVid: number) => void;
  prepareSubmissionData: () => FormData;
}

export const useFormData = ({ schema, item, tableName }: UseFormDataProps): UseFormDataReturn => {
  const [formData, setFormData] = useState<FormData>({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [vlanIdRanges, setVlanIdRanges] = useState('');
  const [selectedVlanGroup, setSelectedVlanGroup] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Prepare form values based on the schema and item
  useEffect(() => {
    if (!schema) return;
    
    const initialValues: Record<string, any> = {};
    
    // Add default values for each field in the schema
    schema.forEach(field => {
      if (field.name === 'id') return; // Skip ID field
      
  // Special case for name field which is required
  if (field.name === 'name' && !item?.name) {
    initialValues[field.name] = '';
  } else if (field.name === 'slug') {
    // For slug field, set to null to trigger auto-generation in the backend
    initialValues[field.name] = item?.slug || null;
  } else {
    initialValues[field.name] = item?.[field.name] ?? null;
  }
    });
    
    // Add name and slug fields for Prefix and IPAddress if they don't exist in schema
    if (tableName === 'prefixes' || tableName === 'ip_addresses') {
      if (!initialValues.hasOwnProperty('name')) {
        initialValues['name'] = item?.name || '';
      }
      if (!initialValues.hasOwnProperty('slug')) {
        initialValues['slug'] = item?.slug || null;
      }
    }
    
    setFormData(initialValues);
  }, [schema, item, tableName]);

  // Initialize form data when modal opens or item changes
  useEffect(() => {
    if (item) {
      // For editing existing items
      setFormData({ ...item });
      
      // Initialize VLAN ID ranges for VLAN groups
      if (tableName === 'vlan_groups') {
        if (item.vlan_id_ranges) {
          // If we have stored ranges, use them
          setVlanIdRanges(item.vlan_id_ranges);
        } else if (item.min_vid && item.max_vid) {
          // Fallback to min_vid-max_vid if no stored ranges
          setVlanIdRanges(`${item.min_vid}-${item.max_vid}`);
        }
      }
    } else {
      // For creating new items, set defaults
      const initialData = schema.reduce((acc, col) => {
        if (col.name !== 'id') {
          if (col.type === 'boolean') {
            acc[col.name] = false;
          } else if (col.name === 'status') {
            acc[col.name] = 'active';
          } else if (col.name === 'slug') {
            // Set slug to null to trigger auto-generation in the backend
            acc[col.name] = null;
          } else {
            acc[col.name] = '';
          }
        }
        return acc;
      }, {} as Record<string, any>);
      setFormData(initialData);
      
      // Set default VLAN ID ranges for VLAN groups
      if (tableName === 'vlan_groups') {
        setVlanIdRanges('1-4094');
      }
    }
    // Clear validation errors when modal reopens
    setValidationErrors({});
  }, [item, schema, tableName]);

  // Validate VLAN ID against the selected VLAN group
  const handleVlanIdChange = (newVid: number) => {
    if (!isNaN(newVid) && selectedVlanGroup) {
      const validationResult = validateVlanIdAgainstGroup(newVid, selectedVlanGroup);
      if (!validationResult.isValid && validationResult.errorMessage) {
        setValidationErrors(prev => ({
          ...prev,
          vid: validationResult.errorMessage
        }));
      } else {
        // Clear the error if it exists
        setValidationErrors(prev => {
          const newErrors: ValidationErrors = { ...prev };
          if ('vid' in newErrors) {
            delete newErrors.vid;
          }
          return newErrors;
        });
      }
    }
  };

  // Validate form before submission
  const validateForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    // Validate required fields
    schema.forEach(field => {
      if (field.required && !formData[field.name]) {
        errors[field.name] = 'This field is required';
      }
    });
    
    // Validate VLAN ID against VLAN group if both exist
    if (tableName === 'vlans' && formData.vid && formData.group_id && selectedVlanGroup) {
      const validationResult = validateVlanIdAgainstGroup(parseInt(formData.vid), selectedVlanGroup);
      if (!validationResult.isValid && validationResult.errorMessage) {
        errors.vid = validationResult.errorMessage;
      }
    }
    
    // Parse VLAN ID ranges for VLAN groups
    if (tableName === 'vlan_groups' && vlanIdRanges) {
      try {
        const ranges = parseVlanIdRanges(vlanIdRanges);
        if (!ranges) {
          errors.vlanIdRanges = 'Invalid VLAN ID ranges format';
        }
      } catch (error: any) {
        errors.vlanIdRanges = error.message || 'Invalid VLAN ID ranges format';
      }
    }
    
    return errors;
  };

  // Prepare data for submission
  const prepareSubmissionData = (): FormData => {
    const submissionData = { ...formData };
    
    // Convert empty strings to null for numeric fields and slug fields
    schema.forEach(field => {
      if ((field.type === 'number' && submissionData[field.name] === '') || 
          (field.name === 'slug' && submissionData[field.name] === '')) {
        submissionData[field.name] = null;
      }
    });
    
    // Parse VLAN ID ranges for VLAN groups
    if (tableName === 'vlan_groups' && vlanIdRanges) {
      // Store the raw ranges string
      submissionData.vlan_id_ranges = vlanIdRanges.replace(/\s+/g, ''); // Remove any spaces
      
      // Also calculate min_vid and max_vid for validation
      const ranges = parseVlanIdRanges(vlanIdRanges);
      if (ranges) {
        submissionData.min_vid = ranges.min_vid;
        submissionData.max_vid = ranges.max_vid;
      }
    }
    
    return submissionData;
  };

  return {
    formData,
    setFormData,
    validationErrors,
    setValidationErrors,
    vlanIdRanges,
    setVlanIdRanges,
    selectedVlanGroup,
    setSelectedVlanGroup,
    loading,
    setLoading,
    validateForm,
    handleVlanIdChange,
    prepareSubmissionData
  };
};
