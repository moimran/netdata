import { useState } from 'react';
import { Title, Card, Text, Button, Group, Stack, TextInput, Modal, Select, Table, ActionIcon, Box, Loader, Alert, Badge, Pagination } from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconTrash, IconSearch, IconFilter, IconRefresh } from '@tabler/icons-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9001/api/v1';

export function ASNView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    asn: '',
    name: '',
    description: '',
    slug: '',
    rir_id: ''
  });

  const queryClient = useQueryClient();

  // Function to generate a slug from a name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with a single one
      .trim();
  };

  // Fetch RIRs for the dropdown
  const { data: rirs = [] } = useQuery({
    queryKey: ['rirs'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/rirs`);
      return response.data.items || [];
    }
  });

  // Fetch ASNs
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['asns', page, perPage, searchQuery],
    queryFn: async () => {
      let url = `${API_BASE_URL}/asns?page=${page}&per_page=${perPage}`;
      if (searchQuery) {
        url += `&search=${searchQuery}`;
      }
      const response = await axios.get(url);
      return response.data;
    }
  });

  const totalPages = data?.total_pages || 1;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (newItem: any) => {
      const response = await axios.post(`${API_BASE_URL}/asns`, newItem);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asns'] });
      setIsModalOpen(false);
      notifications.show({
        title: 'Success',
        message: 'ASN created successfully',
        color: 'green'
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.detail || 'Failed to create ASN',
        color: 'red'
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await axios.put(`${API_BASE_URL}/asns/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asns'] });
      setIsModalOpen(false);
      notifications.show({
        title: 'Success',
        message: 'ASN updated successfully',
        color: 'green'
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.detail || 'Failed to update ASN',
        color: 'red'
      });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await axios.delete(`${API_BASE_URL}/asns/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asns'] });
      notifications.show({
        title: 'Success',
        message: 'ASN deleted successfully',
        color: 'green'
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.detail || 'Failed to delete ASN',
        color: 'red'
      });
    }
  });

  const handleCreateClick = () => {
    setEditingItem(null);
    setFormData({
      asn: '',
      name: '',
      description: '',
      slug: '',
      rir_id: ''
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setFormData({
      asn: item.asn.toString(),
      name: item.name,
      description: item.description || '',
      slug: item.slug || '',
      rir_id: item.rir?.id?.toString() || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    if (window.confirm('Are you sure you want to delete this ASN?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      asn: parseInt(formData.asn),
      name: formData.name,
      description: formData.description || null,
      slug: formData.slug,
      rir_id: formData.rir_id ? parseInt(formData.rir_id) : null
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Format ASN in ASDOT notation if it's a 32-bit ASN
  const formatASN = (asn: number) => {
    if (asn > 65535) {
      return `${Math.floor(asn / 65536)}.${asn % 65536}`;
    }
    return asn.toString();
  };

  return (
    <Stack spacing="md">
      <Group position="apart">
        <Title order={2}>Autonomous System Numbers (ASNs)</Title>
        <Button 
          leftSection={<IconPlus size={16} />} 
          onClick={handleCreateClick}
        >
          Add ASN
        </Button>
      </Group>

      <Card shadow="sm" p="lg" radius="md" withBorder>
        <form>
          <Group position="apart">
            <TextInput
              placeholder="Search ASNs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftSection={<IconSearch size={16} />}
              style={{ width: '300px' }}
            />
            <Group>
              <Button 
                variant="light" 
                leftSection={<IconFilter size={16} />}
                onClick={() => refetch()}
              >
                Filter
              </Button>
              <ActionIcon 
                variant="light" 
                color="blue" 
                onClick={() => refetch()}
                radius="md"
                size="lg"
              >
                <IconRefresh size={18} />
              </ActionIcon>
            </Group>
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
        <Text align="center" color="dimmed" py="xl">
          No ASNs found. Try adjusting your filters or add a new ASN.
        </Text>
      ) : (
        <Box style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover style={{ border: '1px solid #ddd', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ backgroundColor: '#f8f9fa', fontWeight: 600, fontSize: '0.85rem', padding: '12px 15px', textTransform: 'uppercase', border: '1px solid #ddd' }}>ASN</th>
                <th style={{ backgroundColor: '#f8f9fa', fontWeight: 600, fontSize: '0.85rem', padding: '12px 15px', textTransform: 'uppercase', border: '1px solid #ddd' }}>Name</th>
                <th style={{ backgroundColor: '#f8f9fa', fontWeight: 600, fontSize: '0.85rem', padding: '12px 15px', textTransform: 'uppercase', border: '1px solid #ddd' }}>RIR</th>
                <th style={{ backgroundColor: '#f8f9fa', fontWeight: 600, fontSize: '0.85rem', padding: '12px 15px', textTransform: 'uppercase', border: '1px solid #ddd' }}>Description</th>
                <th style={{ backgroundColor: '#f8f9fa', fontWeight: 600, fontSize: '0.85rem', padding: '12px 15px', textTransform: 'uppercase', border: '1px solid #ddd', width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((item: any) => (
                <tr key={item.id}>
                  <td style={{ padding: '12px 15px', border: '1px solid #ddd' }}>
                    <Text weight={500}>{formatASN(item.asn)}</Text>
                  </td>
                  <td style={{ padding: '12px 15px', border: '1px solid #ddd' }}>{item.name}</td>
                  <td style={{ padding: '12px 15px', border: '1px solid #ddd' }}>{item.rir?.name || '-'}</td>
                  <td style={{ padding: '12px 15px', border: '1px solid #ddd' }}>{item.description || '-'}</td>
                  <td style={{ padding: '12px 15px', border: '1px solid #ddd', width: '100px', textAlign: 'center' }}>
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
        </Box>
      )}

      {data?.total > 0 && (
        <Group position="apart" mt="md">
          <Text size="sm">
            Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, data.total)} of {data.total} entries
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

      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Edit ASN" : "Add New ASN"}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <Stack spacing="md">
            <TextInput
              label="ASN Number"
              placeholder="e.g., 65000"
              required
              value={formData.asn}
              onChange={(e) => setFormData({ ...formData, asn: e.target.value })}
            />
            <TextInput
              label="Name"
              placeholder="e.g., Example Network"
              required
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData({ 
                  ...formData, 
                  name: name,
                  slug: generateSlug(name)
                });
              }}
            />
            <TextInput
              label="Slug"
              placeholder="e.g., example-network"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
            <Select
              label="RIR"
              placeholder="Select RIR"
              data={rirs.map((rir: any) => ({ value: rir.id.toString(), label: rir.name }))}
              value={formData.rir_id}
              onChange={(value) => setFormData({ ...formData, rir_id: value || '' })}
              clearable
            />
            <TextInput
              label="Description"
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Group position="right" mt="md">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? "Update" : "Create"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
