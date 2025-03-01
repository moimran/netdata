import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  TextInput, 
  Select, 
  Button, 
  Stack, 
  LoadingOverlay, 
  Switch,
  Textarea,
  Group,
  Divider,
  Text,
  Alert
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TableName } from '../types';
import { API_URL, apiClient } from '../api/client';

const API_BASE_URL = API_URL;

interface Column {
  name: string;
  type: string;
  required?: boolean;
  reference?: string;
}

interface IPAMModalProps {
  show: boolean;
  onHide: () => void;
  tableName: TableName;
  schema: Column[];
  item?: any;
}

export function IPAMModal({ show, onHide, tableName, schema, item }: IPAMModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [vlanIdRanges, setVlanIdRanges] = useState('');
  const [selectedVlanGroup, setSelectedVlanGroup] = useState<any>(null);

  // Prepare form values based on the schema and item
  useEffect(() => {
    if (!schema) return;
    
    const initialValues: Record<string, any> = {};
    
    // Add default values for each field in the schema
    schema.forEach(field => {
      if (field.name === 'id') return; // Skip ID field
      
      // Special case for name and slug fields which are required
      if (field.name === 'name' && !item?.name) {
        initialValues[field.name] = '';
      } else if (field.name === 'slug' && !item?.slug) {
        initialValues[field.name] = '';
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
        initialValues['slug'] = item?.slug || '';
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
      
      // For VLANs, load the VLAN group if one is selected
      if (tableName === 'vlans' && item.group_id) {
        // We'll set the selectedVlanGroup when the reference data is loaded
        const referenceTableNames = schema
          .filter(col => col.reference)
          .map(col => col.reference!);
          
        if (referenceTableNames.includes('vlan_groups')) {
          // The reference data will be loaded by the useQuery hook
          // We'll set the selectedVlanGroup in a separate useEffect
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
  }, [item, schema, show, tableName]);

  const referenceTableNames = [...new Set(schema
    .filter(col => col.reference)
    .map(col => col.reference!)
  )];

  // Use a single query to fetch all reference data
  const { data: referenceQueryData, isLoading, isError } = useQuery({
    queryKey: ['references', referenceTableNames],
    queryFn: async () => {
      const results: Record<string, any> = {};
      
      // Use Promise.all to fetch all reference data in parallel
      await Promise.all(referenceTableNames.map(async (refTableName) => {
        try {
          const response = await apiClient.get(`${refTableName}`);
          results[refTableName] = response.data;
        } catch (error) {
          console.error(`Error fetching ${refTableName}:`, error);
          results[refTableName] = { items: [] };
        }
      }));
      
      return results;
    },
    enabled: show && referenceTableNames.length > 0 // Only fetch when modal is open and there are tables to fetch
  });
  
  // Process reference data
  const referenceData = referenceQueryData || {};
  
  // Set the selectedVlanGroup when reference data is loaded
  useEffect(() => {
    if (tableName === 'vlans' && item?.group_id && referenceData.vlan_groups) {
      const vlanGroups = referenceData.vlan_groups.items || referenceData.vlan_groups.data || referenceData.vlan_groups || [];
      if (Array.isArray(vlanGroups)) {
        const selectedGroup = vlanGroups.find((group: any) => String(group.id) === String(item.group_id));
        if (selectedGroup) {
          setSelectedVlanGroup(selectedGroup);
          
          // Validate VLAN ID against the group's ranges if both exist
          if (item.vid) {
            validateVlanIdAgainstGroup(item.vid, selectedGroup);
          }
        }
      }
    }
  }, [tableName, item, referenceData]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
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
        const errors: Record<string, string> = {};
        
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
      
      // Always invalidate the standard table query
      queryClient.invalidateQueries({ queryKey: ['table', tableName] });
      
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
      }
      
      // Close the modal
      onHide();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate required fields
    const errors: Record<string, string> = {};
    
    schema.forEach(field => {
      if (field.required && !formData[field.name]) {
        errors[field.name] = 'This field is required';
      }
    });
    
    // Validate VLAN ID against VLAN group if both exist
    if (tableName === 'vlans' && formData.vid && formData.group_id && selectedVlanGroup) {
      // Perform validation but don't add errors to the errors object
      // The validateVlanIdAgainstGroup function will update the validationErrors state directly
      validateVlanIdAgainstGroup(parseInt(formData.vid), selectedVlanGroup);
    }
    
    // Parse VLAN ID ranges for VLAN groups
    if (tableName === 'vlan_groups' && vlanIdRanges) {
      try {
        // Store the raw ranges string
        formData.vlan_id_ranges = vlanIdRanges.replace(/\s+/g, ''); // Remove any spaces
        
        // Also calculate min_vid and max_vid for validation
        const ranges = parseVlanIdRanges(vlanIdRanges);
        if (ranges) {
          formData.min_vid = ranges.min_vid;
          formData.max_vid = ranges.max_vid;
        } else {
          errors.vlanIdRanges = 'Invalid VLAN ID ranges format';
        }
      } catch (error: any) {
        errors.vlanIdRanges = error.message || 'Invalid VLAN ID ranges format';
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }
    
    // Format data before submission
    const submissionData = { ...formData };
    
    // Convert empty strings to null for numeric fields
    schema.forEach(field => {
      if (field.type === 'number' && submissionData[field.name] === '') {
        submissionData[field.name] = null;
      }
    });
    
    mutation.mutate(submissionData, {
      onError: (error: any) => {
        setLoading(false);
        
        // If there's a network error and no validation errors were set in the mutation function
        if (error.message === 'Network Error' && !Object.keys(validationErrors).length) {
          setValidationErrors({
            general: 'Network error: Unable to connect to the server. Please check your connection and try again.'
          });
        }
      },
      onSuccess: () => {
        setLoading(false);
      }
    });
  };

  const getReferenceData = (referenceName: string) => {
    const refData = referenceData[referenceName];
    if (!refData) return [];
    
    // Handle different data structures
    return refData.items || refData.data || refData || [];
  };

  // Get status options based on table type
  const getStatusOptions = () => {
    if (tableName === 'prefixes') {
      return [
        { value: 'active', label: 'Active' },
        { value: 'reserved', label: 'Reserved' },
        { value: 'deprecated', label: 'Deprecated' },
        { value: 'container', label: 'Container' }
      ];
    } else if (tableName === 'ip_addresses') {
      return [
        { value: 'active', label: 'Active' },
        { value: 'reserved', label: 'Reserved' },
        { value: 'deprecated', label: 'Deprecated' },
        { value: 'dhcp', label: 'DHCP' },
        { value: 'slaac', label: 'SLAAC' }
      ];
    } else {
      return [
        { value: 'active', label: 'Active' },
        { value: 'reserved', label: 'Reserved' },
        { value: 'deprecated', label: 'Deprecated' }
      ];
    }
  };
  
  // Function to validate if a VLAN ID is within the ranges of a VLAN group
  const validateVlanIdAgainstGroup = (vlanId: number, vlanGroup: any) => {
    if (!vlanId || !vlanGroup) return;
    
    // Get the VLAN ID ranges from the group
    let ranges = vlanGroup.vlan_id_ranges;
    
    // If no ranges are defined, use min_vid and max_vid
    if (!ranges && vlanGroup.min_vid && vlanGroup.max_vid) {
      ranges = `${vlanGroup.min_vid}-${vlanGroup.max_vid}`;
    }
    
    if (!ranges) return; // No ranges to validate against
    
    // Check if the VLAN ID is within any of the ranges
    const rangeArray = ranges.split(',').map((r: string) => r.trim());
    let isInRange = false;
    
    for (const range of rangeArray) {
      if (range.includes('-')) {
        // It's a range like "1-5"
        const [start, end] = range.split('-').map((n: string) => parseInt(n.trim()));
        if (vlanId >= start && vlanId <= end) {
          isInRange = true;
          break;
        }
      } else {
        // It's a single number like "10"
        const num = parseInt(range);
        if (vlanId === num) {
          isInRange = true;
          break;
        }
      }
    }
    
    // Set validation error if not in range
    if (!isInRange) {
      setValidationErrors(prev => ({
        ...prev,
        vid: `VLAN ID ${vlanId} is not within the allowed ranges (${ranges}) for the selected VLAN group`
      }));
    } else {
      // Clear the error if it exists
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.vid;
        return newErrors;
      });
    }
  };
  
  // Parse VLAN ID ranges (e.g., "1-5,20-30") into min_vid and max_vid
  const parseVlanIdRanges = (rangesStr: string): { min_vid: number, max_vid: number } | null => {
    try {
      // Split by commas to get individual ranges
      const ranges = rangesStr.split(',').map(r => r.trim());
      
      // Extract all numbers from the ranges
      const allNumbers: number[] = [];
      
      for (const range of ranges) {
        if (range.includes('-')) {
          // It's a range like "1-5"
          const [start, end] = range.split('-').map(n => parseInt(n.trim()));
          if (isNaN(start) || isNaN(end) || start < 1 || end > 4094 || start > end) {
            throw new Error(`Invalid range: ${range}`);
          }
          allNumbers.push(start, end);
        } else {
          // It's a single number like "10"
          const num = parseInt(range);
          if (isNaN(num) || num < 1 || num > 4094) {
            throw new Error(`Invalid number: ${range}`);
          }
          allNumbers.push(num);
        }
      }
      
      if (allNumbers.length === 0) {
        throw new Error('No valid numbers found');
      }
      
      // Find min and max
      return {
        min_vid: Math.min(...allNumbers),
        max_vid: Math.max(...allNumbers)
      };
    } catch (error) {
      console.error('Error parsing VLAN ID ranges:', error);
      return null;
    }
  };

  // Get role options for IP addresses
  const getRoleOptions = () => {
    return [
      { value: '', label: 'None' },
      { value: 'loopback', label: 'Loopback' },
      { value: 'secondary', label: 'Secondary' },
      { value: 'anycast', label: 'Anycast' },
      { value: 'vip', label: 'VIP' },
      { value: 'vrrp', label: 'VRRP' },
      { value: 'hsrp', label: 'HSRP' },
      { value: 'glbp', label: 'GLBP' },
      { value: 'carp', label: 'CARP' }
    ];
  };

  if (isError) {
    return (
      <Modal opened={show} onClose={onHide} title="Error">
        <div>Failed to load reference data. Please try again.</div>
      </Modal>
    );
  }

  return (
    <Modal 
      opened={show} 
      onClose={onHide} 
      title={`${item ? 'Edit' : 'Add'} ${tableName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`}
      styles={{
        header: { backgroundColor: '#1A1B1E', color: 'white' },
        content: { backgroundColor: '#1A1B1E' }
      }}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <Stack pos="relative" gap="md">
          <LoadingOverlay visible={isLoading || mutation.isPending || loading} />
          
          {validationErrors['general'] && (
            <Alert 
              title="Error" 
              color="red" 
              variant="filled" 
              mb="md"
              withCloseButton={false}
              icon={<IconAlertCircle size="1.1rem" />}
            >
              {validationErrors['general']}
            </Alert>
          )}
          
          {/* Special handling for VLAN ID ranges in VLAN groups */}
          {tableName === 'vlan_groups' && (
            <TextInput
              label="VLAN ID Ranges"
              placeholder="e.g., 1-100,200-300"
              description="Specify one or more numeric ranges separated by commas. Example: 1-5,20-30"
              value={vlanIdRanges}
              onChange={(e) => setVlanIdRanges(e.target.value)}
              error={validationErrors.vlanIdRanges}
              styles={(theme) => ({
                input: {
                  backgroundColor: theme.colors.dark[6],
                  color: theme.white,
                  '&::placeholder': {
                    color: theme.colors.gray[5]
                  }
                },
                label: {
                  color: theme.white
                }
              })}
            />
          )}
          
          {schema.map(column => {
            if (column.name === 'id') return null;
            
            // Skip min_vid, max_vid, and vlan_id_ranges for VLAN groups as we handle them with the VLAN ID Ranges field
            if (tableName === 'vlan_groups' && (column.name === 'min_vid' || column.name === 'max_vid' || column.name === 'vlan_id_ranges')) {
              return null;
            }

            // Handle reference fields (foreign keys)
            if (column.reference) {
              const referenceData = getReferenceData(column.reference);
              
              // Special handling for VLAN group selection in VLANs
              if (tableName === 'vlans' && column.name === 'group_id') {
                return (
                  <Select
                    key={column.name}
                    label="VLAN Group"
                    placeholder="Select VLAN Group"
                    data={[
                      { value: '', label: 'None' },
                      ...referenceData.map((item: any) => ({
                        value: item.id.toString(),
                        label: item.name || String(item.id)
                      }))
                    ]}
                    value={formData[column.name]?.toString() || ''}
                    onChange={(value) => {
                      // Update the form data
                      setFormData({ 
                        ...formData, 
                        [column.name]: value ? parseInt(value) : null 
                      });
                      
                      // Find and store the selected VLAN group
                      if (value) {
                        // Convert both IDs to strings for comparison to avoid type mismatches
                        const selectedGroup = referenceData.find((item: any) => String(item.id) === String(value));
                        setSelectedVlanGroup(selectedGroup);
                        
                        // Validate VLAN ID against the group's ranges if both exist
                        if (selectedGroup && formData.vid) {
                          validateVlanIdAgainstGroup(formData.vid, selectedGroup);
                        }
                      } else {
                        setSelectedVlanGroup(null);
                        // Clear any validation errors related to VLAN ID ranges
                        setValidationErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.vid;
                          return newErrors;
                        });
                      }
                    }}
                    required={column.required}
                    error={validationErrors[column.name]}
                    styles={(theme) => ({
                      input: {
                        backgroundColor: theme.colors.dark[6],
                        color: theme.white,
                        '&::placeholder': {
                          color: theme.colors.gray[5]
                        }
                      },
                      label: {
                        color: theme.white
                      },
                      item: {
                        '&[data-selected]': {
                          backgroundColor: theme.colors.blue[8],
                          color: theme.white
                        },
                        '&[data-hovered]': {
                          backgroundColor: theme.colors.dark[5]
                        }
                      }
                    })}
                  />
                );
              }
              
              return (
                <Select
                  key={column.name}
                  label={column.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  placeholder={`Select ${column.reference}`}
                  data={[
                    { value: '', label: 'None' },
                    ...referenceData.map((item: any) => ({
                      value: item.id.toString(),
                      label: item.name || item.prefix || item.address || item.rd || item.slug || String(item.id)
                    }))
                  ]}
                  value={formData[column.name]?.toString() || ''}
                  onChange={(value) => setFormData({ 
                    ...formData, 
                    [column.name]: value ? parseInt(value) : null 
                  })}
                  required={column.required}
                  error={validationErrors[column.name]}
                  styles={(theme) => ({
                    input: {
                      backgroundColor: theme.colors.dark[6],
                      color: theme.white,
                      '&::placeholder': {
                        color: theme.colors.gray[5]
                      }
                    },
                    label: {
                      color: theme.white
                    },
                    item: {
                      '&[data-selected]': {
                        backgroundColor: theme.colors.blue[8],
                        color: theme.white
                      },
                      '&[data-hovered]': {
                        backgroundColor: theme.colors.dark[5]
                      }
                    }
                  })}
                />
              );
            }

            // Handle status fields
            if (column.name === 'status') {
              return (
                <Select
                  key={column.name}
                  label="Status"
                  data={getStatusOptions()}
                  value={formData[column.name] || 'active'}
                  onChange={(value) => setFormData({ 
                    ...formData, 
                    [column.name]: value || 'active' 
                  })}
                  required={column.required}
                  error={validationErrors[column.name]}
                  styles={(theme) => ({
                    input: {
                      backgroundColor: theme.colors.dark[6],
                      color: theme.white
                    },
                    label: {
                      color: theme.white
                    },
                    item: {
                      '&[data-selected]': {
                        backgroundColor: theme.colors.blue[8],
                        color: theme.white
                      },
                      '&[data-hovered]': {
                        backgroundColor: theme.colors.dark[5]
                      }
                    }
                  })}
                />
              );
            }

            // Handle role field for IP addresses
            if (column.name === 'role' && tableName === 'ip_addresses') {
              return (
                <Select
                  key={column.name}
                  label="Role"
                  data={getRoleOptions()}
                  value={formData[column.name] || ''}
                  onChange={(value) => setFormData({ 
                    ...formData, 
                    [column.name]: value || null 
                  })}
                  error={validationErrors[column.name]}
                  styles={(theme) => ({
                    input: {
                      backgroundColor: theme.colors.dark[6],
                      color: theme.white
                    },
                    label: {
                      color: theme.white
                    },
                    item: {
                      '&[data-selected]': {
                        backgroundColor: theme.colors.blue[8],
                        color: theme.white
                      },
                      '&[data-hovered]': {
                        backgroundColor: theme.colors.dark[5]
                      }
                    }
                  })}
                />
              );
            }

            // Handle boolean fields
            if (column.type === 'boolean') {
              return (
                <Switch
                  key={column.name}
                  label={column.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  checked={!!formData[column.name]}
                  onChange={(e) => setFormData({
                    ...formData,
                    [column.name]: e.currentTarget.checked
                  })}
                  styles={(theme) => ({
                    label: {
                      color: theme.white
                    }
                  })}
                />
              );
            }

            // Handle description fields with textarea
            if (column.name === 'description') {
              return (
                <Textarea
                  key={column.name}
                  label="Description"
                  placeholder="Enter description"
                  value={formData[column.name] || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    [column.name]: e.target.value 
                  })}
                  error={validationErrors[column.name]}
                  styles={(theme) => ({
                    input: {
                      backgroundColor: theme.colors.dark[6],
                      color: theme.white,
                      '&::placeholder': {
                        color: theme.colors.gray[5]
                      }
                    },
                    label: {
                      color: theme.white
                    }
                  })}
                />
              );
            }

            // Handle name and slug fields
            if (column.name === 'name' || column.name === 'slug') {
              return (
                <TextInput
                  key={column.name}
                  label={column.name.charAt(0).toUpperCase() + column.name.slice(1)}
                  value={formData[column.name] || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    [column.name]: e.target.value 
                  })}
                  required={column.required}
                  error={validationErrors[column.name]}
                  styles={(theme) => ({
                    input: {
                      backgroundColor: theme.colors.dark[6],
                      color: theme.white,
                      '&::placeholder': {
                        color: theme.colors.gray[5]
                      }
                    },
                    label: {
                      color: theme.white
                    }
                  })}
                />
              );
            }

            // Special handling for VLAN ID (vid) field in VLANs
            if (tableName === 'vlans' && column.name === 'vid') {
              return (
                <TextInput
                  key={column.name}
                  label="VLAN ID"
                  value={formData[column.name] || ''}
                  onChange={(e) => {
                    const newVid = parseInt(e.target.value);
                    setFormData({ 
                      ...formData, 
                      [column.name]: e.target.value 
                    });
                    
                    // Validate against selected VLAN group if one is selected
                    if (!isNaN(newVid) && selectedVlanGroup) {
                      validateVlanIdAgainstGroup(newVid, selectedVlanGroup);
                    }
                  }}
                  required={column.required}
                  error={validationErrors[column.name]}
                  styles={(theme) => ({
                    input: {
                      backgroundColor: theme.colors.dark[6],
                      color: theme.white,
                      '&::placeholder': {
                        color: theme.colors.gray[5]
                      }
                    },
                    label: {
                      color: theme.white
                    }
                  })}
                />
              );
            }
            
            // Default text input for other fields
            return (
              <TextInput
                key={column.name}
                label={column.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                value={formData[column.name] || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  [column.name]: e.target.value 
                })}
                required={column.required}
                error={validationErrors[column.name]}
                styles={(theme) => ({
                  input: {
                    backgroundColor: theme.colors.dark[6],
                    color: theme.white,
                    '&::placeholder': {
                      color: theme.colors.gray[5]
                    }
                  },
                  label: {
                    color: theme.white
                  }
                })}
              />
            );
          })}

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={onHide} color="gray">
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending || loading}>
              {item ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
