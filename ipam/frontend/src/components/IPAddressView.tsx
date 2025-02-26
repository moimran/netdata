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
  Pagination
} from '@mantine/core';
import { IconPlus, IconSearch, IconFilter, IconRefresh, IconEdit, IconTrash, IconNetwork } from '@tabler/icons-react';
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
    case 'dhcp':
      return 'cyan';
    case 'slaac':
      return 'teal';
    default:
      return 'gray';
  }
};

// Helper function to get role badge color
const getRoleColor = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'loopback':
      return 'blue';
    case 'secondary':
      return 'teal';
    case 'anycast':
      return 'grape';
    case 'vip':
      return 'orange';
    case 'vrrp':
    case 'hsrp':
    case 'glbp':
    case 'carp':
      return 'pink';
    default:
      return 'gray';
  }
};

export function IPAddressView() {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVrf, setFilterVrf] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const queryClient = useQueryClient();
  
  const pageSize = 20;
  const schema = TABLE_SCHEMAS['ip_addresses'] || [];

  // Fetch VRFs for filtering
  const { data: vrfs } = useQuery({
    queryKey: ['reference', 'vrfs'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/vrfs`);
      return response.data;
    }
  });

  // Fetch IP addresses
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['table', 'ip_addresses', page, searchQuery, filterVrf, filterStatus, filterRole],
    queryFn: async () => {
      let url = `${API_BASE_URL}/ip_addresses`;
      
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
      
      if (filterStatus) {
        params.append('status', filterStatus);
      }
      
      if (filterRole) {
        params.append('role', filterRole);
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
      await axios.delete(`${API_BASE_URL}/ip_addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table', 'ip_addresses'] });
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
    if (window.confirm('Are you sure you want to delete this IP address?')) {
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
    setFilterStatus('');
    setFilterRole('');
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
          <Title order={3}>IP Addresses</Title>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={handleAddClick}
          >
            Add IP Address
          </Button>
        </Group>

        <form onSubmit={handleSearch}>
          <Grid mb="md">
            <Grid.Col span={12}>
              <TextInput
                placeholder="Search by address, DNS name, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<IconSearch size={16} />}
              />
            </Grid.Col>
            <Grid.Col span={4}>
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
            <Grid.Col span={4}>
              <Select
                placeholder="Filter by Status"
                value={filterStatus}
                onChange={setFilterStatus}
                data={[
                  { value: '', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'reserved', label: 'Reserved' },
                  { value: 'deprecated', label: 'Deprecated' },
                  { value: 'dhcp', label: 'DHCP' },
                  { value: 'slaac', label: 'SLAAC' }
                ]}
                clearable
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select
                placeholder="Filter by Role"
                value={filterRole}
                onChange={setFilterRole}
                data={[
                  { value: '', label: 'All Roles' },
                  { value: 'loopback', label: 'Loopback' },
                  { value: 'secondary', label: 'Secondary' },
                  { value: 'anycast', label: 'Anycast' },
                  { value: 'vip', label: 'VIP' },
                  { value: 'vrrp', label: 'VRRP' },
                  { value: 'hsrp', label: 'HSRP' },
                  { value: 'glbp', label: 'GLBP' },
                  { value: 'carp', label: 'CARP' }
                ]}
                clearable
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
            Failed to load IP addresses. Please try again.
          </Alert>
        ) : data?.items?.length === 0 ? (
          <Text align="center" color="dimmed" py="xl">
            No IP addresses found. Try adjusting your filters or add a new IP address.
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Status</th>
                <th>Role</th>
                <th>DNS Name</th>
                <th>VRF</th>
                <th>Tenant</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((item: any) => (
                <tr key={item.id}>
                  <td>
                    <Text weight={500}>{item.address}</Text>
                  </td>
                  <td>
                    <Badge color={getStatusColor(item.status)}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Badge>
                  </td>
                  <td>
                    {item.role ? (
                      <Badge color={getRoleColor(item.role)}>
                        {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{item.dns_name || '-'}</td>
                  <td>{item.vrf?.name || 'Global'}</td>
                  <td>{item.tenant?.name || '-'}</td>
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
        tableName="ip_addresses"
        schema={schema}
        item={selectedItem}
      />
    </Stack>
  );
}
