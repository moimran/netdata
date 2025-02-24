import { useState } from 'react';
import { 
  Table,
  Button,
  Group,
  Title,
  Card,
  Text,
  Badge,
  ActionIcon,
  Stack
} from '@mantine/core';
import { IconEdit, IconTrash, IconPlus } from '@tabler/icons-react';
import { IPAMModal } from './IPAMModal';
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

const TABLE_SCHEMAS: Record<TableName, Column[]> = {
  regions: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  site_groups: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  sites: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'status', type: 'string', required: true },
    { name: 'region_id', type: 'number', reference: 'regions' },
    { name: 'site_group_id', type: 'number', reference: 'site_groups' },
    { name: 'description', type: 'string' }
  ],
  locations: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'site_id', type: 'number', reference: 'sites' },
    { name: 'status', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  vlans: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'vid', type: 'number', required: true },
    { name: 'status', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  vrfs: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'rd', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  rirs: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  aggregates: [
    { name: 'id', type: 'number' },
    { name: 'prefix', type: 'string', required: true },
    { name: 'rir_id', type: 'number', reference: 'rirs' },
    { name: 'description', type: 'string' }
  ],
  roles: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  prefixes: [
    { name: 'id', type: 'number' },
    { name: 'prefix', type: 'string', required: true },
    { name: 'vrf_id', type: 'number', reference: 'vrfs' },
    { name: 'site_id', type: 'number', reference: 'sites' },
    { name: 'role_id', type: 'number', reference: 'roles' },
    { name: 'status', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  ip_ranges: [
    { name: 'id', type: 'number' },
    { name: 'start_address', type: 'string', required: true },
    { name: 'end_address', type: 'string', required: true },
    { name: 'description', type: 'string' },
    { name: 'vrf_id', type: 'number', reference: 'vrfs' }
  ],
  ip_addresses: [
    { name: 'id', type: 'number' },
    { name: 'address', type: 'string', required: true },
    { name: 'prefix_id', type: 'number', reference: 'prefixes', required: true },
    { name: 'status', type: 'string', required: true },
    { name: 'dns_name', type: 'string' },
    { name: 'description', type: 'string' }
  ]
};

interface IPAMTableProps {
  tableName: TableName;
}

export function IPAMTable({ tableName }: IPAMTableProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch table data
  const { data: tableData = [], isLoading } = useQuery({
    queryKey: ['table', tableName],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/${tableName}`);
      return response.data;
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`${API_BASE_URL}/${tableName}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', tableName] });
    }
  });

  const formatTableName = (name: string) => {
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getColumns = () => {
    const schema = TABLE_SCHEMAS[tableName];
    if (!schema) return [];
    return schema.filter(col => !col.name.startsWith('_') && col.name !== 'created_at');
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setShowModal(false);
    queryClient.invalidateQueries({ queryKey: ['table', tableName] });
  };

  const getStatusBadge = (value: string) => {
    const color = value === 'active' ? 'green' : 
                 value === 'reserved' ? 'yellow' : 
                 value === 'deprecated' ? 'red' : 'gray';
    return <Badge color={color}>{value}</Badge>;
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <Stack>
      <Group justify="space-between" align="center" p="md">
        <Title order={2}>{formatTableName(tableName)}</Title>
        <Button
          leftSection={<IconPlus size={20} />}
          onClick={() => setShowModal(true)}
        >
          Add New
        </Button>
      </Group>

      <Card>
        <Table
          withBorder
          borderRadius="sm"
          withColumnBorders
          striped
          highlightOnHover
          styles={(theme) => ({
            root: {
              backgroundColor: theme.colors.dark[7],
              color: theme.white
            },
            thead: {
              backgroundColor: theme.colors.dark[8],
              th: {
                color: theme.white,
                borderBottom: `1px solid ${theme.colors.dark[4]}`
              }
            },
            tbody: {
              tr: {
                color: theme.white,
                borderBottom: `1px solid ${theme.colors.dark[4]}`,
                td: {
                  color: theme.white,
                  borderBottom: `1px solid ${theme.colors.dark[4]}`
                },
                '&:nth-of-type(odd)': {
                  backgroundColor: theme.colors.dark[7]
                },
                '&:nth-of-type(even)': {
                  backgroundColor: theme.colors.dark[6]
                },
                '&:hover': {
                  backgroundColor: theme.colors.dark[5],
                  cursor: 'pointer'
                }
              }
            }
          })}
        >
          <Table.Thead>
            <Table.Tr>
              {getColumns().map(column => (
                <Table.Th key={column.name}>{formatTableName(column.name)}</Table.Th>
              ))}
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {tableData?.length > 0 ? (
              tableData.map((item: any) => (
                <Table.Tr key={item.id}>
                  {getColumns().map(column => (
                    <Table.Td key={column.name}>
                      {column.name === 'status' ? 
                        getStatusBadge(item[column.name]) : 
                        String(item[column.name] ?? '')}
                    </Table.Td>
                  ))}
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        color="blue"
                        onClick={() => handleEdit(item)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() => handleDelete(item.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={getColumns().length + 1} style={{ textAlign: 'center' }}>
                  No data available
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Card>

      {showModal && (
        <IPAMModal
          show={showModal}
          onHide={handleCloseModal}
          tableName={tableName}
          schema={TABLE_SCHEMAS[tableName]}
          item={selectedItem}
        />
      )}
    </Stack>
  );
}
