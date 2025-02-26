import { useState } from 'react';
import { 
  Card, 
  Group, 
  Title, 
  Button, 
  Stack, 
  Text, 
  Badge, 
  Grid, 
  TextInput,
  Select,
  ActionIcon,
  Tooltip,
  Table,
  Box,
  Loader,
  Alert,
  Pagination,
  Switch
} from '@mantine/core';
import { IconPlus, IconSearch, IconFilter, IconRefresh, IconEdit, IconTrash, IconNetwork } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { IPAMModal } from './IPAMModal';
import { TABLE_SCHEMAS } from './IPAMTable';

const API_BASE_URL = 'http://localhost:9001/api/v1';

export function VRFView() {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTenant, setFilterTenant] = useState<string>('');
  const queryClient = useQueryClient();
  
  const pageSize = 20;
  const schema = TABLE_SCHEMAS['vrfs'] || [];

  // Fetch Tenants for filtering
  const { data: tenants } = useQuery({
    queryKey: ['reference', 'tenants'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/tenants`);
      return response.data;
    }
  });

  // Fetch VRFs
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['table', 'vrfs', page, searchQuery, filterTenant],
    queryFn: async () => {
      let url = `${API_BASE_URL}/vrfs`;
      
      // Add query parameters
      const params = new URLSearchParams();
      
      if (page > 1) {
        params.append('skip', ((page - 1) * pageSize).toString());
      }
      
      params.append('limit', pageSize.toString());
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      if (filterTenant) {
        params.append('tenant_id', filterTenant);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url);
      return response.data;
    }
  });

  // Fetch prefix counts for each VRF
  const { data: prefixCounts } = useQuery({
    queryKey: ['vrf-prefix-counts'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/vrfs/prefix-counts`);
      return response.data || {};
    },
    enabled: !isLoading && !!data?.items?.length
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`${API_BASE_URL}/vrfs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', 'vrfs'] });
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
    if (window.confirm('Are you sure you want to delete this VRF?')) {
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
    setFilterTenant('');
    setPage(1);
    refetch();
  };

  const totalPages = data?.total 
    ? Math.ceil(data.total / pageSize) 
    : 1;

  // Get prefix count for a VRF
  const getPrefixCount = (vrfId: number) => {
    if (!prefixCounts) return 0;
    return prefixCounts[vrfId] || 0;
  };

  return (
    <Stack spacing="md">
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group position="apart" mb="md">
          <Title order={3}>Virtual Routing and Forwarding (VRFs)</Title>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={handleAddClick}
          >
            Add VRF
          </Button>
        </Group>

        <form onSubmit={handleSearch}>
          <Grid mb="md">
            <Grid.Col span={8}>
              <TextInput
                placeholder="Search by name, RD, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<IconSearch size={16} />}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select
                placeholder="Filter by Tenant"
                value={filterTenant}
                onChange={setFilterTenant}
                data={[
                  { value: '', label: 'All Tenants' },
                  ...((tenants?.items || tenants?.data || tenants || []).map((tenant: any) => ({
                    value: tenant.id.toString(),
                    label: tenant.name
                  })))
                ]}
                clearable
                icon={<IconNetwork size={16} />}
              />
            </Grid.Col>
          </Grid>
          <Group position="right" mb="md">
            <Button type="submit">Apply Filters</Button>
            <Button variant="outline" onClick={handleClearFilters}>Clear</Button>
            <Tooltip label="Refresh data">
              <ActionIcon 
                color="blue" 
                variant="light" 
                onClick={() => refetch()}
              >
                <IconRefresh size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </form>

        {isLoading ? (
          <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
            <Loader />
          </Box>
        ) : isError ? (
          <Alert color="red" title="Error">
            Failed to load VRFs. Please try again.
          </Alert>
        ) : data?.items?.length === 0 ? (
          <Text align="center" color="dimmed" py="xl">
            No VRFs found. Try adjusting your filters or add a new VRF.
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Name</th>
                <th>RD</th>
                <th>Tenant</th>
                <th>Enforce Unique</th>
                <th>Prefixes</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((item: any) => (
                <tr key={item.id}>
                  <td>
                    <Text weight={500}>{item.name}</Text>
                  </td>
                  <td>{item.rd || '-'}</td>
                  <td>{item.tenant?.name || '-'}</td>
                  <td>
                    <Badge color={item.enforce_unique ? 'green' : 'gray'}>
                      {item.enforce_unique ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td>
                    <Badge>{getPrefixCount(item.id)}</Badge>
                  </td>
                  <td>{item.description || '-'}</td>
                  <td>
                    <Group spacing="xs">
                      <ActionIcon 
                        color="blue" 
                        onClick={() => handleEditClick(item)}
                        title="Edit"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        color="red" 
                        onClick={() => handleDeleteClick(item.id)}
                        title="Delete"
                        loading={deleteMutation.isPending}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {data?.total > 0 && (
          <Group position="right" mt="md">
            <Pagination 
              total={totalPages} 
              value={page} 
              onChange={setPage} 
            />
            <Text size="sm" color="dimmed">
              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, data.total)} of {data.total} items
            </Text>
          </Group>
        )}
      </Card>

      <IPAMModal
        show={showModal}
        onHide={handleModalClose}
        tableName="vrfs"
        schema={schema}
        item={selectedItem}
      />
    </Stack>
  );
}
