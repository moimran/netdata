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
  Text
} from '@mantine/core';
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
    }
    // Clear validation errors when modal reopens
    setValidationErrors({});
  }, [item, schema, show]);

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
        if (error.response?.data?.detail) {
          // Handle validation errors from the backend
          const errors: Record<string, string> = {};
          if (Array.isArray(error.response.data.detail)) {
            error.response.data.detail.forEach((err: any) => {
              if (err.loc && err.loc[1]) {
                errors[err.loc[1]] = err.msg;
              }
            });
          } else {
            errors['general'] = error.response.data.detail;
          }
          setValidationErrors(errors);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', tableName] });
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
      styles={(theme) => ({
        header: {
          backgroundColor: theme.colors.dark[7],
          color: theme.white
        },
        content: {
          backgroundColor: theme.colors.dark[7]
        }
      })}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <Stack pos="relative" spacing="md">
          <LoadingOverlay visible={isLoading || mutation.isPending || loading} />
          
          {validationErrors['general'] && (
            <Text color="red" size="sm">{validationErrors['general']}</Text>
          )}
          
          {schema.map(column => {
            if (column.name === 'id') return null;

            // Handle reference fields (foreign keys)
            if (column.reference) {
              const referenceData = getReferenceData(column.reference);
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

          <Group position="right" mt="md">
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
