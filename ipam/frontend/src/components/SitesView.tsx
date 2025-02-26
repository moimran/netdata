import { useState } from 'react';
import { Title, Card, Text, Button, Group, Stack, TextInput, Modal, Select } from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import axios from 'axios';

interface Site {
  id: number;
  name: string;
  slug: string;
  status: string;
  region_id: number | null;
  site_group_id: number | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  created_at: string;
}

interface Region {
  id: number;
  name: string;
}

interface SiteGroup {
  id: number;
  name: string;
}

export function SitesView() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSite, setNewSite] = useState({
    name: '',
    slug: '',
    status: 'active',
    region_id: null as number | null,
    site_group_id: null as number | null,
    latitude: null as number | null,
    longitude: null as number | null,
    address: ''
  });

  const queryClient = useQueryClient();

  // Fetch sites
  const { data: sitesData, isLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:9001/api/v1/sites');
      return response.data;
    }
  }); 

  // Ensure sites is always an array
  const sites = sitesData?.items || sitesData?.data || sitesData || [];

  // Fetch regions for dropdown
  const { data: regionsData } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:9001/api/v1/regions');
      return response.data;
    }
  });

  // Ensure regions is always an array
  const regions = regionsData?.items || regionsData?.data || regionsData || [];

  // Fetch site groups for dropdown
  const { data: siteGroupsData } = useQuery({
    queryKey: ['siteGroups'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:9001/api/v1/site_groups');
      return response.data;
    }
  });

  // Ensure siteGroups is always an array
  const siteGroups = siteGroupsData?.items || siteGroupsData?.data || siteGroupsData || [];

  // Create site mutation
  const createSite = useMutation({
    mutationFn: async (siteData: typeof newSite) => {
      // Convert empty strings to null for numeric fields
      const formattedData = { ...siteData };
      
      // Ensure all numeric fields are either null or valid numbers
      if (formattedData.region_id === "" || formattedData.region_id === undefined) formattedData.region_id = null;
      if (formattedData.site_group_id === "" || formattedData.site_group_id === undefined) formattedData.site_group_id = null;
      if (formattedData.latitude === "" || formattedData.latitude === undefined) formattedData.latitude = null;
      if (formattedData.longitude === "" || formattedData.longitude === undefined) formattedData.longitude = null;
      
      console.log("Submitting site data:", formattedData);
      const response = await axios.post('http://localhost:9001/api/v1/sites', formattedData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setCreateModalOpen(false);
      setNewSite({
        name: '',
        slug: '',
        status: 'active',
        region_id: null,
        site_group_id: null,
        latitude: null,
        longitude: null,
        address: ''
      });
      notifications.show({
        title: 'Success',
        message: 'Site created successfully',
        color: 'green'
      });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error',
        message: 'Failed to create site',
        color: 'red'
      });
      console.error('Error creating site:', error);
    }
  });

  const handleCreateSite = () => {
    createSite.mutate(newSite);
  };

  if (isLoading) {
    return <Text>Loading sites...</Text>;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Sites</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateModalOpen(true)}
        >
          Add Site
        </Button>
      </Group>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {sites.map((site) => (
          <Card key={site.id} shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4}>{site.name}</Title>
            <Text size="sm" c="dimmed">Slug: {site.slug}</Text>
            {site.address && (
              <Text size="sm" mt="xs">{site.address}</Text>
            )}
            <Text size="xs" c="dimmed" mt="md">
              Created: {new Date(site.created_at).toLocaleDateString()}
            </Text>
          </Card>
        ))}
      </div>

      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Site"
      >
        <Stack gap="md">
          <TextInput
            label="Name"
            placeholder="Enter site name"
            value={newSite.name}
            onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
            required
          />
          <TextInput
            label="Slug"
            placeholder="enter-slug"
            value={newSite.slug}
            onChange={(e) => setNewSite({ ...newSite, slug: e.target.value })}
            required
          />
          <Select
            label="Region"
            placeholder="Select region"
            value={newSite.region_id?.toString()}
            onChange={(value) => setNewSite({ ...newSite, region_id: value ? parseInt(value) : null })}
            data={regions.map(r => ({ value: r.id.toString(), label: r.name }))}
            clearable
          />
          <Select
            label="Site Group"
            placeholder="Select site group"
            value={newSite.site_group_id?.toString() || null}
            onChange={(value) => setNewSite({ ...newSite, site_group_id: value ? parseInt(value) : null })}
            data={siteGroups.map(g => ({ value: g.id.toString(), label: g.name }))}
            clearable
          />
          <TextInput
            label="Latitude"
            placeholder="Enter latitude"
            value={newSite.latitude?.toString() || ''}
            onChange={(e) => setNewSite({ ...newSite, latitude: e.target.value ? parseFloat(e.target.value) : null })}
          />
          <TextInput
            label="Longitude"
            placeholder="Enter longitude"
            value={newSite.longitude?.toString() || ''}
            onChange={(e) => setNewSite({ ...newSite, longitude: e.target.value ? parseFloat(e.target.value) : null })}
          />
          <TextInput
            label="Address"
            placeholder="Enter address"
            value={newSite.address || ''}
            onChange={(e) => setNewSite({ ...newSite, address: e.target.value })}
          />
          <Button onClick={handleCreateSite} loading={createSite.isPending}>
            Create Site
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
