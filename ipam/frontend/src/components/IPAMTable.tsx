import { useState } from 'react';
import { 
  Button,
  Group,
  Title,
  Card,
  Text,
  ActionIcon,
  Stack,
  Tooltip,
  Pagination,
  TextInput,
  Select,
  Box,
  Loader,
  Alert
} from '@mantine/core';
import { StyledTable, TableHeader, StatusBadge, tableStyles } from './TableStyles';
import { IconEdit, IconTrash, IconPlus, IconSearch, IconFilter, IconRefresh } from '@tabler/icons-react';
import { IPAMModal } from './IPAMModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { TableName } from '../types';
import { API_URL, apiClient } from '../api/client';

const API_BASE_URL = API_URL;

interface Column {
  name: string;
  type: string;
  required?: boolean;
  reference?: string;
}

export const TABLE_SCHEMAS: Record<TableName, Column[]> = {
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
    { name: 'slug', type: 'string', required: true },
    { name: 'vid', type: 'number', required: true },
    { name: 'status', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  vlan_groups: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' },
    { name: 'min_vid', type: 'number' },
    { name: 'max_vid', type: 'number' }
  ],
  vrfs: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'rd', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'enforce_unique', type: 'boolean' },
    { name: 'tenant_id', type: 'number', reference: 'tenants' }
  ],
  route_targets: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  vrf_import_targets: [
    { name: 'vrf_id', type: 'number', reference: 'vrfs', required: true },
    { name: 'route_target_id', type: 'number', reference: 'route_targets', required: true }
  ],
  vrf_export_targets: [
    { name: 'vrf_id', type: 'number', reference: 'vrfs', required: true },
    { name: 'route_target_id', type: 'number', reference: 'route_targets', required: true }
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
    { name: 'name', type: 'string' },
    { name: 'slug', type: 'string' },
    { name: 'prefix', type: 'string', required: true },
    { name: 'vrf_id', type: 'number', reference: 'vrfs' },
    { name: 'site_id', type: 'number', reference: 'sites' },
    { name: 'vlan_id', type: 'number', reference: 'vlans' },
    { name: 'tenant_id', type: 'number', reference: 'tenants' },
    { name: 'role_id', type: 'number', reference: 'roles' },
    { name: 'status', type: 'string', required: true },
    { name: 'is_pool', type: 'boolean' },
    { name: 'mark_utilized', type: 'boolean' },
    { name: 'description', type: 'string' }
  ],
  ip_ranges: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string' },
    { name: 'slug', type: 'string' },
    { name: 'start_address', type: 'string', required: true },
    { name: 'end_address', type: 'string', required: true },
    { name: 'vrf_id', type: 'number', reference: 'vrfs' },
    { name: 'tenant_id', type: 'number', reference: 'tenants' },
    { name: 'status', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  ip_addresses: [
    { name: 'id', type: 'number' },
    { name: 'address', type: 'string', required: true },
    { name: 'status', type: 'string', required: true },
    { name: 'role', type: 'string' },
    { name: 'dns_name', type: 'string' },
    { name: 'vrf_id', type: 'number', reference: 'vrfs' },
    { name: 'tenant_id', type: 'number', reference: 'tenants' },
    { name: 'nat_inside_id', type: 'number', reference: 'ip_addresses' },
    { name: 'assigned_object_type', type: 'string' },
    { name: 'assigned_object_id', type: 'number' },
    { name: 'description', type: 'string' }
  ],
  devices: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'description', type: 'string' },
    { name: 'location_id', type: 'number', reference: 'locations' }
  ],
  interfaces: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'description', type: 'string' },
    { name: 'device_id', type: 'number', reference: 'devices' }
  ],
  asns: [
    { name: 'id', type: 'number' },
    { name: 'asn', type: 'number', required: true },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' },
    { name: 'rir_id', type: 'number', reference: 'rirs' }
  ],
  asn_ranges: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'start', type: 'number', required: true },
    { name: 'end', type: 'number', required: true },
    { name: 'rir_id', type: 'number', reference: 'rirs' },
    { name: 'description', type: 'string' }
  ],
  tenants: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ]
};


// Helper function to format cell values for display
const formatCellValue = (column: Column, value: any, referenceData: Record<string, any[]>) => {
  if (value === null || value === undefined) return '-';
  
  if (column.name === 'status') {
    return <StatusBadge status={value} />;
  }
  
  if (column.type === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (column.reference && value) {
    const referenceTable = column.reference;
    const referenceItems = referenceData[referenceTable] || [];
    
    // Ensure referenceItems is an array before using find
    if (Array.isArray(referenceItems)) {
      const referencedItem = referenceItems.find((item: any) => item.id === value);
      
      if (referencedItem) {
        return referencedItem.name || referencedItem.prefix || referencedItem.address || referencedItem.rd || referencedItem.slug || value;
      }
    }
  }
  
  return String(value);
};

interface IPAMTableProps {
  tableName: TableName;
}

const useReferenceData = (referenceTableNames: string[]) => {
  const { data: referenceQueryData } = useQuery({
    queryKey: ['references', referenceTableNames],
    queryFn: async () => {
      const results: Record<string, any> = {};
      
      // Use Promise.all to fetch all reference data in parallel
      await Promise.all(referenceTableNames.map(async (refTableName) => {
        try {
          const response = await apiClient.get(`${refTableName}`);
          // Ensure we have a consistent data structure
          const responseData = response.data;
          
          // Store data in a consistent format
          if (Array.isArray(responseData)) {
            results[refTableName] = responseData;
          } else if (responseData?.items && Array.isArray(responseData.items)) {
            results[refTableName] = responseData.items;
          } else if (responseData?.data && Array.isArray(responseData.data)) {
            results[refTableName] = responseData.data;
          } else {
            // Default to empty array if we can't determine the structure
            results[refTableName] = [];
          }
        } catch (error) {
          console.error(`Error fetching ${refTableName}:`, error);
          results[refTableName] = [];
        }
      }));
      
      return results;
    },
    enabled: referenceTableNames.length > 0
  });
  
  return referenceQueryData || {};
};

export function IPAMTable({ tableName }: IPAMTableProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const queryClient = useQueryClient();
  
  const pageSize = 10;

  // Get table schema
  const schema = TABLE_SCHEMAS[tableName] || [];
  
  // Get filterable fields
  const filterableFields = schema
    .filter(col => col.name !== 'id' && col.name !== 'description')
    .map(col => ({ value: col.name, label: col.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }));

  // Fetch reference data for all tables
  const referenceTableNames = [...new Set(schema
    .filter(col => col.reference)
    .map(col => col.reference!)
  )];
  
  const referenceData = useReferenceData(referenceTableNames);

  // Fetch table data
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['table', tableName, page, searchQuery, filterField, filterValue],
    queryFn: async () => {
      // Add query parameters
      const params = new URLSearchParams();
      
      if (page > 1) {
        params.append('skip', ((page - 1) * pageSize).toString());
      }
      
      params.append('limit', pageSize.toString());
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      if (filterField && filterValue) {
        params.append(filterField, filterValue);
      }
      
      const response = await apiClient.get(`${tableName}`, { params });
      return response.data;
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`${tableName}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', tableName] });
    }
  });

  const handleAddClick = () => {
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleEditClick = (item: any) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleDeleteClick = (id: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    refetch();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterField('');
    setFilterValue('');
    setPage(1);
    refetch();
  };

  const totalPages = data?.total 
    ? Math.ceil(data.total / pageSize) 
    : 1;

  return (
    <Stack gap="md">
      <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between" mb="lg">
          <Box>
            <Title order={3} mb={5}>
              {tableName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </Title>
            <Text color="dimmed" size="sm">Manage your {tableName.replace(/_/g, ' ')} data</Text>
          </Box>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={handleAddClick}
            radius="md"
            variant="filled"
          >
            Add New
          </Button>
        </Group>

        <Card withBorder p="xs" radius="md" mb="md" bg="gray.0">
          <form onSubmit={handleSearch}>
            <Group mb="xs" align="flex-end" gap="md">
              <TextInput
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftSection={<IconSearch size={16} />}
                style={{ flexGrow: 1 }}
                radius="md"
              />
              
              <Select
                placeholder="Filter by field"
                value={filterField}
                onChange={(value) => setFilterField(value || '')}
                data={filterableFields}
                clearable
                leftSection={<IconFilter size={16} />}
                style={{ width: '200px' }}
                radius="md"
              />
              
              {filterField && (
                <TextInput
                  placeholder="Filter value"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  style={{ width: '200px' }}
                  radius="md"
                />
              )}
              
              <Button type="submit" radius="md">Apply Filters</Button>
              <Button variant="outline" onClick={handleClearFilters} radius="md">Clear</Button>
              <Tooltip label="Refresh data">
                <ActionIcon 
                  color="blue" 
                  variant="light" 
                  onClick={() => refetch()}
                  radius="md"
                  size="lg"
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </form>
        </Card>

        {isLoading ? (
          <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
            <Loader />
          </Box>
        ) : isError ? (
          <Alert color="red" title="Error">
            Failed to load data. Please try again.
          </Alert>
        ) : data?.items?.length === 0 ? (
            <Text ta="center" c="dimmed" py="xl">
            No items found. Try adjusting your filters or add a new item.
          </Text>
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <StyledTable>
              <TableHeader columns={schema.map(col => col.name)} />
              <tbody>
                {data?.items?.map((item: any) => (
                  <tr key={item.id}>
                    {schema.map(column => (
                      <td key={column.name} style={tableStyles.cell}>
                        {formatCellValue(column, item[column.name], referenceData)}
                      </td>
                    ))}
                    <td style={{ ...tableStyles.cell, ...tableStyles.actionsCell }}>
                      <Group gap="xs" justify="center">
                        <ActionIcon 
                          color="blue" 
                          onClick={() => handleEditClick(item)}
                          title="Edit"
                          variant="light"
                          radius="md"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon 
                          color="red" 
                          onClick={() => handleDeleteClick(item.id)}
                          title="Delete"
                          loading={deleteMutation.isPending}
                          variant="light"
                          radius="md"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </Box>
        )}

        {data?.total > 0 && (
          <Group justify="space-between" mt="lg">
            <Text size="sm" color="dimmed">
              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, data.total)} of {data.total} items
            </Text>
            <Pagination 
              total={totalPages} 
              value={page} 
              onChange={setPage} 
              radius="md"
              withControls
            />
          </Group>
        )}
      </Card>

      <IPAMModal
        show={showModal}
        onHide={handleModalClose}
        tableName={tableName}
        schema={schema}
        item={selectedItem}
      />
    </Stack>
  );
}
