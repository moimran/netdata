import { useState } from 'react';
import { Title, Card, Text, Button, Group, Stack, TextInput, Modal, Select, Table, ActionIcon } from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9001/api/v1';

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
  const { data: regionsData, isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/regions`);
      return response.data;
    }
  });

  // Ensure regions is always an array
  const regions = regionsData?.items || regionsData?.data || regionsData || [];

  // Create region mutation
  const createRegion = useMutation({
    mutationFn: async (regionData: Omit<Region, 'id' | 'created_at'>) => {
      const response = await axios.post(`${API_BASE_URL}/regions`, regionData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      setCreateModalOpen(false);
      setNewRegion({ name: '', slug: '', parent_id: null, description: '' });
      notifications.show({
        title: 'Success',
        message: 'Region created successfully',
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.message,
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRegion.mutate(newRegion);
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={2} c="white">Regions</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateModalOpen(true)}
          variant="filled"
          color="blue"
        >
          Add Region
        </Button>
      </Group>

      <Card withBorder radius="sm">
        <Table
          horizontalSpacing="md"
          verticalSpacing="sm"
          striped
          highlightOnHover
          withTableBorder
          withColumnBorders
          styles={(theme) => ({
            root: {
              backgroundColor: theme.colors.dark[7],
              color: theme.white
            },
            thead: {
              backgroundColor: theme.colors.dark[6],
              th: {
                color: theme.white,
                padding: '12px 16px',
                fontWeight: 700,
                fontSize: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                borderBottom: `1px solid ${theme.colors.dark[4]}`
              }
            },
            tbody: {
              tr: {
                color: theme.white,
                td: {
                  padding: '12px 16px',
                  borderBottom: `1px solid ${theme.colors.dark[4]}`
                },
                '&:nth-of-type(odd)': {
                  backgroundColor: theme.colors.dark[7]
                },
                '&:nth-of-type(even)': {
                  backgroundColor: theme.colors.dark[6]
                },
                '&:hover': {
                  backgroundColor: theme.colors.dark[5]
                }
              }
            }
          })}
        >
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Slug</th>
              <th>Parent ID</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((region) => (
              <tr key={region.id}>
                <td>{region.id}</td>
                <td>{region.name}</td>
                <td>{region.slug}</td>
                <td>{region.parent_id || '-'}</td>
                <td>{region.description || '-'}</td>
                <td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color="blue" size="sm">
                      <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" size="sm">
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Region"
        styles={(theme) => ({
          header: {
            backgroundColor: theme.colors.dark[7],
            color: theme.white,
            padding: '16px 24px',
            fontWeight: 600
          },
          content: {
            backgroundColor: theme.colors.dark[7]
          },
          body: {
            padding: '24px'
          }
        })}
      >
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Name"
              value={newRegion.name}
              onChange={(e) => setNewRegion({ ...newRegion, name: e.target.value })}
              required
              styles={(theme) => ({
                input: {
                  backgroundColor: theme.colors.dark[6],
                  color: theme.white,
                  border: `1px solid ${theme.colors.dark[4]}`
                },
                label: {
                  color: theme.white,
                  marginBottom: '8px'
                }
              })}
            />
            <TextInput
              label="Slug"
              value={newRegion.slug}
              onChange={(e) => setNewRegion({ ...newRegion, slug: e.target.value })}
              required
              styles={(theme) => ({
                input: {
                  backgroundColor: theme.colors.dark[6],
                  color: theme.white,
                  border: `1px solid ${theme.colors.dark[4]}`
                },
                label: {
                  color: theme.white,
                  marginBottom: '8px'
                }
              })}
            />
            <Select
              label="Parent Region"
              value={newRegion.parent_id?.toString() || ''}
              onChange={(value) => setNewRegion({ ...newRegion, parent_id: value ? parseInt(value) : null })}
              data={[{ value: '', label: 'None' }, ...regions.map((region) => ({ value: region.id.toString(), label: region.name }))]}
              styles={(theme) => ({
                input: {
                  backgroundColor: theme.colors.dark[6],
                  color: theme.white,
                  border: `1px solid ${theme.colors.dark[4]}`
                },
                label: {
                  color: theme.white,
                  marginBottom: '8px'
                },
                dropdown: {
                  backgroundColor: theme.colors.dark[6],
                  border: `1px solid ${theme.colors.dark[4]}`
                },
                item: {
                  color: theme.white,
                  '&[data-selected]': {
                    backgroundColor: theme.colors.blue[7],
                    color: theme.white
                  },
                  '&[data-hovered]': {
                    backgroundColor: theme.colors.dark[5]
                  }
                }
              })}
            />
            <TextInput
              label="Description"
              value={newRegion.description}
              onChange={(e) => setNewRegion({ ...newRegion, description: e.target.value })}
              styles={(theme) => ({
                input: {
                  backgroundColor: theme.colors.dark[6],
                  color: theme.white,
                  border: `1px solid ${theme.colors.dark[4]}`
                },
                label: {
                  color: theme.white,
                  marginBottom: '8px'
                }
              })}
            />
            <Button type="submit" mt="md">Create</Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
