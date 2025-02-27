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
  Progress,
  Switch
} from '@mantine/core';
import { IconPlus, IconSearch, IconFilter, IconRefresh, IconEdit, IconTrash, IconNetwork, IconBuilding } from '@tabler/icons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { IPAMModal } from './IPAMModal';
import { TABLE_SCHEMAS } from './IPAMTable';

const API_BASE_URL = 'http://localhost:9001/api/v1';

// Helper function to get status badge color
const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'green';
    case 'reserved':
      return 'blue';
    case 'deprecated':
      return 'gray';
    case 'container':
      return 'indigo';
    default:
      return 'gray';
  }
};

// Helper function to get utilization color
const getUtilizationColor = (utilization: number) => {
  if (utilization >= 90) return 'red';
  if (utilization >= 70) return 'orange';
  if (utilization >= 50) return 'yellow';
  return 'green';
};

export function PrefixView() {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVrf, setFilterVrf] = useState<string>('');
  const [filterSite, setFilterSite] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [showContainersOnly, setShowContainersOnly] = useState(false);
  const queryClient = useQueryClient();
  
  const pageSize = 20;
  const schema = TABLE_SCHEMAS['prefixes'] || [];

  // Fetch VRFs for filtering
  const { data: vrfs } = useQuery({
    queryKey: ['reference', 'vrfs'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/vrfs`);
      return response.data;
    }
  });

  // Fetch Sites for filtering
  const { data: sites } = useQuery({
    queryKey: ['reference', 'sites'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/sites`);
      return response.data;
    }
  });

  // Fetch Roles for filtering
  const { data: roles } = useQuery({
    queryKey: ['reference', 'roles'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/roles`);
      return response.data;
    }
  });

  // Fetch Prefixes
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['table', 'prefixes', page, searchQuery, filterVrf, filterSite, filterStatus, filterRole, showContainersOnly],
    queryFn: async () => {
      let url = `${API_BASE_URL}/prefixes`;
      
      // Add query parameters
      const params = new URLSearchParams();
      
      if (page > 1) {
        params.append('skip', ((page - 1) * pageSize).toString());
      }
      
      params.append('limit', pageSize.toString());
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      
      if (filterVrf) {
        params.append('vrf_id', filterVrf);
      }
      
      if (filterSite) {
        params.append('site_id', filterSite);
      }
      
      if (filterStatus) {
        params.append('status', filterStatus);
      }
      
      if (filterRole) {
        params.append('role_id', filterRole);
      }
      
      if (showContainersOnly) {
        params.append('status', 'container');
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url);
      return response.data;
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`${API_BASE_URL}/prefixes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', 'prefixes'] });
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
    if (window.confirm('Are you sure you want to delete this prefix?')) {
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
    setFilterVrf('');
    setFilterSite('');
    setFilterStatus('');
    setFilterRole('');
    setShowContainersOnly(false);
    setPage(1);
    refetch();
  };

  const totalPages = data?.total 
    ? Math.ceil(data.total / pageSize) 
    : 1;

  return (
    <Stack spacing="md">
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group position="apart" mb="md">
          <Title order={3}>Prefixes</Title>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={handleAddClick}
          >
            Add Prefix
          </Button>
        </Group>

        <form onSubmit={handleSearch}>
          <Grid mb="md">
            <Grid.Col span={12}>
              <TextInput
                placeholder="Search by prefix or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<IconSearch size={16} />}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <Select
                placeholder="Filter by VRF"
                value={filterVrf}
                onChange={setFilterVrf}
                data={[
                  { value: '', label: 'All VRFs' },
                  ...((vrfs?.items || vrfs?.data || vrfs || []).map((vrf: any) => ({
                    value: vrf.id.toString(),
                    label: vrf.name || vrf.rd || String(vrf.id)
                  })))
                ]}
                clearable
                icon={<IconNetwork size={16} />}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <Select
                placeholder="Filter by Site"
                value={filterSite}
                onChange={setFilterSite}
                data={[
                  { value: '', label: 'All Sites' },
                  ...((sites?.items || sites?.data || sites || []).map((site: any) => ({
                    value: site.id.toString(),
                    label: site.name
                  })))
                ]}
                clearable
                icon={<IconBuilding size={16} />}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <Select
                placeholder="Filter by Status"
                value={filterStatus}
                onChange={setFilterStatus}
                data={[
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'reserved', label: 'Reserved' },
                  { value: 'deprecated', label: 'Deprecated' },
                  { value: 'container', label: 'Container' }
                ]}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <Select
                placeholder="Filter by Role"
                value={filterRole}
                onChange={setFilterRole}
                data={[
                  { value: '', label: 'All Roles' },
                  ...((roles?.items || roles?.data || roles || []).map((role: any) => ({
                    value: role.id.toString(),
                    label: role.name
                  })))
                ]}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <Switch
                label="Show containers only"
                checked={showContainersOnly}
                onChange={(e) => setShowContainersOnly(e.currentTarget.checked)}
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
            Failed to load prefixes. Please try again.
          </Alert>
        ) : data?.items?.length === 0 ? (
          <Text align="center" color="dimmed" py="xl">
            No prefixes found. Try adjusting your filters or add a new prefix.
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Prefix</th>
                <th>Name</th>
                <th>Status</th>
                <th>VRF</th>
                <th>Site</th>
                <th>Role</th>
                <th>Utilization</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((item: any) => {
                // Calculate a mock utilization for display purposes
                // In a real app, this would come from the backend
                const utilization = item.mark_utilized ? 100 : (item.child_count > 0 ? Math.min(item.child_count * 10, 100) : Math.floor(Math.random() * 100));
                
                return (
                  <tr key={item.id}>
                    <td>
                      <Text weight={500}>{item.prefix}</Text>
                      {item.is_pool && <Badge size="xs" ml={5}>Pool</Badge>}
                    </td>
                    <td>{item.name || '-'}</td>
                    <td>
                      <Badge color={getStatusColor(item.status)}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                    </td>
                    <td>{item.vrf?.name || 'Global'}</td>
                    <td>{item.site?.name || '-'}</td>
                    <td>{item.role?.name || '-'}</td>
                    <td style={{ width: '150px' }}>
                      <Group spacing={5} wrap="nowrap">
                        <Progress 
                          value={utilization} 
                          color={getUtilizationColor(utilization)}
                          size="sm"
                          style={{ width: '100px' }}
                        />
                        <Text size="xs">{utilization}%</Text>
                      </Group>
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
                );
              })}
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
        tableName="prefixes"
        schema={schema}
        item={selectedItem}
      />
    </Stack>
  );
}
