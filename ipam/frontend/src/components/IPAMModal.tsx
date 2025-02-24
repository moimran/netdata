import React, { useState } from 'react';
import { Modal, TextInput, Select, Button, Stack, LoadingOverlay } from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { TableName } from '../types';

const API_BASE_URL = 'http://localhost:8000/api/v1';

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
  const [formData, setFormData] = useState(() => {
    if (item) {
      return { ...item };
    }
    return schema.reduce((acc, col) => {
      if (col.name !== 'id') {
        acc[col.name] = '';
      }
      return acc;
    }, {} as Record<string, any>);
  });

  // Get all unique reference tables
  const referenceTableNames = [...new Set(schema
    .filter(col => col.reference)
    .map(col => col.reference!)
  )];

  // Create a query for each unique reference table
  const referenceQueries = referenceTableNames.map(tableName => {
    return useQuery({
      queryKey: ['reference', tableName],
      queryFn: async () => {
        const response = await axios.get(`${API_BASE_URL}/${tableName}`);
        return { tableName, data: response.data };
      }
    });
  });

  const isLoading = referenceQueries.some(query => query.isLoading);
  const hasError = referenceQueries.some(query => query.isError);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (item) {
        await axios.put(`${API_BASE_URL}/${tableName}/${item.id}`, data);
      } else {
        await axios.post(`${API_BASE_URL}/${tableName}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', tableName] });
      onHide();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const getReferenceData = (referenceName: string) => {
    const query = referenceQueries.find(q => q.data?.tableName === referenceName);
    return query?.data?.data || [];
  };

  if (hasError) {
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
    >
      <form onSubmit={handleSubmit}>
        <Stack pos="relative">
          <LoadingOverlay visible={isLoading} />
          {schema.map(column => {
            if (column.name === 'id') return null;

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

            if (column.name === 'status') {
              return (
                <Select
                  key={column.name}
                  label="Status"
                  data={[
                    { value: 'active', label: 'Active' },
                    { value: 'reserved', label: 'Reserved' },
                    { value: 'deprecated', label: 'Deprecated' }
                  ]}
                  value={formData[column.name] || 'active'}
                  onChange={(value) => setFormData({ 
                    ...formData, 
                    [column.name]: value || 'active' 
                  })}
                  required={column.required}
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
          <Button type="submit" loading={mutation.isPending}>
            {item ? 'Update' : 'Create'}
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
