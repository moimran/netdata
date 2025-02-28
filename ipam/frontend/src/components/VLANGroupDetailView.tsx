import { useState, useEffect } from 'react';
import { 
  Card, 
  Title, 
  Text, 
  Group, 
  Button, 
  Stack, 
  Table, 
  ActionIcon, 
  Badge, 
  Modal,
  MultiSelect,
  Loader,
  Alert,
  Box,
  TextInput
} from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { apiClient } from '../api/client';
import { StatusBadge, tableStyles } from './TableStyles';

interface VLAN {
  id: number;
  name: string;
  slug: string;
  vid: number;
  status: string;
  description: string | null;
  group_id: number | null;
}

interface VLANGroup {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  min_vid: number;
  max_vid: number;
}

export function VLANGroupDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddVLANsModal, setShowAddVLANsModal] = useState(false);
  const [selectedVLANs, setSelectedVLANs] = useState<string[]>([]);
  
  // Fetch VLAN group details
  const { 
    data: vlanGroup, 
    isLoading: isLoadingGroup, 
    isError: isErrorGroup 
  } = useQuery({
    queryKey: ['vlan_groups', id],
    queryFn: async () => {
      const response = await apiClient.get(`vlan_groups/${id}`);
      return response.data;
    }
  });
  
  // Fetch VLANs in this group
  const { 
    data: vlansInGroup, 
    isLoading: isLoadingVLANs, 
    isError: isErrorVLANs,
    refetch: refetchVLANsInGroup
  } = useQuery({
    queryKey: ['vlans', 'in_group', id],
    queryFn: async () => {
      const response = await apiClient.get(`vlans`, {
        params: { group_id: id }
      });
      return response.data.items || [];
    }
  });
  
  // Fetch all VLANs not in this group for the add modal
  const { 
    data: availableVLANs, 
    isLoading: isLoadingAvailableVLANs,
    refetch: refetchAvailableVLANs
  } = useQuery({
    queryKey: ['vlans', 'available_for_group', id],
    queryFn: async () => {
      const response = await apiClient.get(`vlans`, {
        params: { group_id: 'null' } // Get VLANs not assigned to any group
      });
      return response.data.items || [];
    },
    enabled: showAddVLANsModal // Only fetch when modal is open
  });
  
  // Mutation to add VLANs to group
  const addVLANsMutation = useMutation({
    mutationFn: async (vlanIds: number[]) => {
      // Update each VLAN to set its group_id
      await Promise.all(vlanIds.map(vlanId => 
        apiClient.patch(`vlans/${vlanId}`, { group_id: parseInt(id!) })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vlans'] });
      refetchVLANsInGroup();
      refetchAvailableVLANs();
      setShowAddVLANsModal(false);
      setSelectedVLANs([]);
    }
  });
  
  // Mutation to remove VLAN from group
  const removeVLANMutation = useMutation({
    mutationFn: async (vlanId: number) => {
      await apiClient.patch(`vlans/${vlanId}`, { group_id: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vlans'] });
      refetchVLANsInGroup();
    }
  });
  
  const handleAddVLANs = () => {
    const vlanIds = selectedVLANs.map(id => parseInt(id));
    addVLANsMutation.mutate(vlanIds);
  };
  
  const handleRemoveVLAN = (vlanId: number) => {
    if (window.confirm('Are you sure you want to remove this VLAN from the group?')) {
      removeVLANMutation.mutate(vlanId);
    }
  };
  
  if (isLoadingGroup) {
    return (
      <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
        <Loader />
      </Box>
    );
  }
  
  if (isErrorGroup) {
    return (
      <Alert color="red" title="Error">
        Failed to load VLAN group. Please try again.
      </Alert>
    );
  }
  
  return (
    <Stack gap="md">
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="lg">
          <Box>
            <Group mb={5}>
              <Button 
                variant="subtle" 
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => navigate('/vlan-groups')}
              >
                Back to VLAN Groups
              </Button>
              <Title order={3}>{vlanGroup.name}</Title>
            </Group>
            <Text color="dimmed" size="sm">Manage VLANs in this group</Text>
          </Box>
          <Button 
            leftSection={<IconPlus size={16} />} 
            onClick={() => setShowAddVLANsModal(true)}
            radius="md"
            variant="filled"
          >
            Add VLANs to Group
          </Button>
        </Group>
        
        <Card withBorder p="md" radius="md" mb="md">
          <Title order={4} mb="sm">Group Details</Title>
          <Stack gap="xs">
            <Group>
              <Text fw={500}>Name:</Text>
              <Text>{vlanGroup.name}</Text>
            </Group>
            <Group>
              <Text fw={500}>Slug:</Text>
              <Text>{vlanGroup.slug}</Text>
            </Group>
            <Group>
              <Text fw={500}>VID Range:</Text>
              <Text>{vlanGroup.min_vid} - {vlanGroup.max_vid}</Text>
            </Group>
            {vlanGroup.description && (
              <Group>
                <Text fw={500}>Description:</Text>
                <Text>{vlanGroup.description}</Text>
              </Group>
            )}
          </Stack>
        </Card>
        
        <Card withBorder p="md" radius="md" mb="md">
          <Title order={4} mb="sm">VLAN ID Ranges</Title>
          <Text size="sm" color="dimmed" mb="md">
            Specify one or more numeric ranges separated by commas. Example: 1-5,20-30
          </Text>
          <Group>
            <TextInput
              placeholder="e.g., 1-100,200-300"
              value={`${vlanGroup.min_vid}-${vlanGroup.max_vid}`}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                // In a real implementation, this would update the VLAN group's min_vid and max_vid
                // based on the parsed ranges
                console.log("VLAN ID ranges changed:", e.target.value);
              }}
              style={{ flexGrow: 1 }}
            />
            <Button>Update Ranges</Button>
          </Group>
          <Text size="sm" color="dimmed" mt="xs">
            Note: Changing these ranges will not affect existing VLANs, but will determine which VIDs are available when creating new VLANs in this group.
          </Text>
        </Card>
        
        <Title order={4} mb="sm">VLANs in this Group</Title>
        
        {isLoadingVLANs ? (
          <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
            <Loader />
          </Box>
        ) : isErrorVLANs ? (
          <Alert color="red" title="Error">
            Failed to load VLANs. Please try again.
          </Alert>
        ) : vlansInGroup.length === 0 ? (
          <Text ta="center" c="dimmed" py="xl">
            No VLANs in this group. Add VLANs using the button above.
          </Text>
        ) : (
          <Table>
            <thead>
              <tr>
                <th style={tableStyles.header}>Name</th>
                <th style={tableStyles.header}>VID</th>
                <th style={tableStyles.header}>Status</th>
                <th style={tableStyles.header}>Description</th>
                <th style={tableStyles.header}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vlansInGroup?.map((vlan: VLAN) => (
                <tr key={vlan.id}>
                  <td style={tableStyles.cell}>{vlan.name}</td>
                  <td style={tableStyles.cell}>{vlan.vid}</td>
                  <td style={tableStyles.cell}>
                    <StatusBadge status={vlan.status} />
                  </td>
                  <td style={tableStyles.cell}>{vlan.description || '-'}</td>
                  <td style={{ ...tableStyles.cell, ...tableStyles.actionsCell }}>
                    <ActionIcon 
                      color="red" 
                      onClick={() => handleRemoveVLAN(vlan.id)}
                      title="Remove from group"
                      loading={removeVLANMutation.isPending}
                      variant="light"
                      radius="md"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      
      {/* Modal for adding VLANs to the group */}
      <Modal
        opened={showAddVLANsModal}
        onClose={() => setShowAddVLANsModal(false)}
        title="Add VLANs to Group"
        size="lg"
      >
        {isLoadingAvailableVLANs ? (
          <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
            <Loader />
          </Box>
        ) : availableVLANs?.length === 0 ? (
          <Text ta="center" c="dimmed" py="xl">
            No available VLANs to add. All VLANs are already assigned to groups.
          </Text>
        ) : (
          <Stack>
            <MultiSelect
              label="Select VLANs to add"
              placeholder="Choose VLANs"
              data={availableVLANs ? availableVLANs.map((vlan: VLAN) => ({
                value: vlan.id.toString(),
                label: `${vlan.name} (VID: ${vlan.vid})`
              })) : []}
              value={selectedVLANs}
              onChange={setSelectedVLANs}
              searchable
              clearable
            />
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={() => setShowAddVLANsModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddVLANs} 
                loading={addVLANsMutation.isPending}
                disabled={selectedVLANs.length === 0}
              >
                Add to Group
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
