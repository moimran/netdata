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
import { StyledTable, TableHeader, tableStyles } from '../TableStyles';
import { IconEdit, IconTrash, IconPlus, IconSearch, IconFilter, IconRefresh } from '@tabler/icons-react';
import { IPAMModal } from '../IPAMModal';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TableName } from '../../types';
import { apiClient } from '../../api/client';
import { TABLE_SCHEMAS } from './schemas';
import { formatCellValue, renderUtilizationBar } from './utils';
import { useReferenceData } from './hooks';

interface IPAMTableProps {
  tableName: TableName;
  customActionsRenderer?: (item: any) => React.ReactNode;
}

export function IPAMTable({ tableName, customActionsRenderer }: IPAMTableProps) {
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
  const { data, isLoading, isError, refetch } = useQuery({
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
          <Box className="ipam-table-header">
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

        <Card withBorder p="xs" radius="md" mb="md" bg="gray.0" className="ipam-search-container">
          <form onSubmit={handleSearch}>
            <Group mb="xs" align="flex-end" gap="md">
              <TextInput
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftSection={<IconSearch size={16} />}
                className="ipam-search-input"
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
                className="ipam-filter-select"
              />
              
              {filterField && (
                <TextInput
                  placeholder="Filter value"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  style={{ width: '200px' }}
                  radius="md"
                  className="ipam-filter-input"
                />
              )}
              
              <Button type="submit" radius="md" className="ipam-apply-button">Apply Filters</Button>
              <Button variant="outline" onClick={handleClearFilters} radius="md" className="ipam-clear-button">Clear</Button>
              <Tooltip label="Refresh data">
                <ActionIcon 
                  color="blue" 
                  variant="light" 
                  onClick={() => refetch()}
                  radius="md"
                  size="lg"
                  className="ipam-refresh-button"
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
        ) : data?.total === 0 ? (
            <Text ta="center" c="dimmed" py="xl">
            No items found. Try adjusting your filters or add a new item.
          </Text>
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <StyledTable>
              <TableHeader 
                columns={[
                  ...schema.map(col => {
                    // Rename columns for better display
                    if (col.name === 'vlan_id_ranges') {
                      return 'VLAN IDs';
                    } else if (col.name === 'group_id') {
                      return 'VLAN Group';
                    } else if (col.name === 'tenant_id') {
                      return 'Tenant';
                    } else if (col.name === 'site_id') {
                      return 'Site';
                    } else if (col.name === 'role_id') {
                      return 'Role';
                    } else if (col.name === 'interface_id') {
                      return 'Interface';
                    } else if (col.name === 'prefix_id') {
                      return 'Prefix';
                    } 
                    else if (tableName === 'locations' && col.name === 'name') {
                      return 'Location';
                    } else if (tableName === 'locations' && col.name === 'parent_id') {
                      return 'Parent Location';
                    
                    }else if (col.name.endsWith('_id')) {
                      // For other _id fields, remove the _id suffix and capitalize
                      return col.name.replace('_id', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    }
                    return col.name;
                  }),
                  // Add utilization column for prefixes and ip_ranges tables
                  ...(tableName === 'prefixes' || tableName === 'ip_ranges' ? ['Utilization'] : [])
                ]} 
              />
              <tbody>
                {data?.items?.map((item: any) => (
                  <tr key={item.id}>
                    {schema.map(column => (
                      <td key={column.name} style={tableStyles.cell}>
                        {formatCellValue(column, item[column.name], referenceData, item, tableName)}
                      </td>
                    ))}
                    {/* Add utilization column for prefixes and ip_ranges tables */}
                    {tableName === 'prefixes' && (
                      <td style={tableStyles.cell}>
                        {renderUtilizationBar(item.prefix)}
                      </td>
                    )}
                    {tableName === 'ip_ranges' && (
                      <td style={tableStyles.cell}>
                        {renderUtilizationBar(`${item.start_address}-${item.end_address}`, true)}
                      </td>
                    )}
                    <td style={{ ...tableStyles.cell, ...tableStyles.actionsCell }}>
                      {customActionsRenderer ? (
                        // Use custom renderer if provided
                        customActionsRenderer(item)
                      ) : (
                        // Default actions
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
                      )}
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
        key={`${tableName}-modal-${selectedItem ? selectedItem.id : 'new'}-${showModal}`}
        show={showModal}
        onHide={handleModalClose}
        tableName={tableName}
        schema={schema}
        item={selectedItem}
      />
    </Stack>
  );
}
