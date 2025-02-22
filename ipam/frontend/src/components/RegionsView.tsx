import { useState } from 'react';
import { Title, Card, Text, Button, Group, Stack, TextInput, Modal, Select } from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import axios from 'axios';

interface Region {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  description: string | null;
  created_at: string;
}

export function RegionsView() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRegion, setNewRegion] = useState({
    name: '',
    slug: '',
    parent_id: null as number | null,
    description: ''
  });

  const queryClient = useQueryClient();

  // Fetch regions
  const { data: regions = [], isLoading } = useQuery<Region[]>({
    queryKey: ['regions'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:8000/api/regions');
      return response.data;
    }
  });

  // Create region mutation
  const createRegion = useMutation({
    mutationFn: async (regionData: Omit<Region, 'id' | 'created_at'>) => {
      const response = await axios.post('http://localhost:8000/api/regions', regionData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      setCreateModalOpen(false);
      setNewRegion({ name: '', slug: '', parent_id: null, description: '' });
      notifications.show({
        title: 'Success',
        message: 'Region created successfully',
        color: 'green'
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: 'Failed to create region',
        color: 'red'
      });
      console.error('Error creating region:', error);
    }
  });

  const handleCreateRegion = () => {
    createRegion.mutate(newRegion);
  };

  if (isLoading) {
    return <Text>Loading regions...</Text>;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Regions</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateModalOpen(true)}
        >
          Add Region
        </Button>
      </Group>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {regions.map((region) => (
          <Card key={region.id} shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4}>{region.name}</Title>
            <Text size="sm" c="dimmed">Slug: {region.slug}</Text>
            {region.description && (
              <Text size="sm" mt="xs">{region.description}</Text>
            )}
            <Text size="xs" c="dimmed" mt="md">
              Created: {new Date(region.created_at).toLocaleDateString()}
            </Text>
          </Card>
        ))}
      </div>

      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Region"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="Enter region name"
            value={newRegion.name}
            onChange={(e) => setNewRegion({ ...newRegion, name: e.target.value })}
            required
          />
          <TextInput
            label="Slug"
            placeholder="enter-slug"
            value={newRegion.slug}
            onChange={(e) => setNewRegion({ ...newRegion, slug: e.target.value })}
            required
          />
          <Select
            label="Parent Region"
            placeholder="Select parent region"
            value={newRegion.parent_id?.toString()}
            onChange={(value) => setNewRegion({ ...newRegion, parent_id: value ? parseInt(value) : null })}
            data={regions.map(r => ({ value: r.id.toString(), label: r.name }))}
            clearable
          />
          <TextInput
            label="Description"
            placeholder="Enter description"
            value={newRegion.description}
            onChange={(e) => setNewRegion({ ...newRegion, description: e.target.value })}
          />
          <Button onClick={handleCreateRegion} loading={createRegion.isPending}>
            Create Region
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
