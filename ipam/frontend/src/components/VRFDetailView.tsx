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
  Tabs
} from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import { apiClient } from '../api/client';
import { tableStyles } from './TableStyles';

interface RouteTarget {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

interface VRF {
  id: number;
  name: string;
  rd: string | null;
  description: string | null;
  enforce_unique: boolean;
  tenant_id: number | null;
}

export function VRFDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string | null>('import');
  const [showAddTargetsModal, setShowAddTargetsModal] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  
  // Fetch VRF details
  const { 
    data: vrf, 
    isLoading: isLoadingVRF, 
    isError: isErrorVRF 
  } = useQuery({
    queryKey: ['vrfs', id],
    queryFn: async () => {
      const response = await apiClient.get(`vrfs/${id}`);
      return response.data;
    }
  });
  
  // Fetch import targets for this VRF
  const { 
    data: importTargets, 
    isLoading: isLoadingImportTargets, 
    isError: isErrorImportTargets,
    refetch: refetchImportTargets
  } = useQuery({
    queryKey: ['vrf_import_targets', id],
    queryFn: async () => {
      // First get the junction table entries
      const junctionResponse = await apiClient.get(`vrf_import_targets`, {
        params: { vrf_id: id }
      });
      
      const junctionItems = junctionResponse.data.items || [];
      
      if (junctionItems.length === 0) {
        return [];
      }
      
      // Then get the actual route target objects
      const targetIds = junctionItems.map((item: any) => item.route_target_id);
      
      // Fetch each route target
      const targets = await Promise.all(
        targetIds.map(async (targetId: number) => {
          const response = await apiClient.get(`route_targets/${targetId}`);
          return response.data;
        })
      );
      
      return targets;
    }
  });
  
  // Fetch export targets for this VRF
  const { 
    data: exportTargets, 
    isLoading: isLoadingExportTargets, 
    isError: isErrorExportTargets,
    refetch: refetchExportTargets
  } = useQuery({
    queryKey: ['vrf_export_targets', id],
    queryFn: async () => {
      // First get the junction table entries
      const junctionResponse = await apiClient.get(`vrf_export_targets`, {
        params: { vrf_id: id }
      });
      
      const junctionItems = junctionResponse.data.items || [];
      
      if (junctionItems.length === 0) {
        return [];
      }
      
      // Then get the actual route target objects
      const targetIds = junctionItems.map((item: any) => item.route_target_id);
      
      // Fetch each route target
      const targets = await Promise.all(
        targetIds.map(async (targetId: number) => {
          const response = await apiClient.get(`route_targets/${targetId}`);
          return response.data;
        })
      );
      
      return targets;
    }
  });
  
  // Fetch all route targets not already associated with this VRF for the add modal
  const { 
    data: availableTargets, 
    isLoading: isLoadingAvailableTargets,
    refetch: refetchAvailableTargets
  } = useQuery({
    queryKey: ['route_targets', 'available_for_vrf', id, activeTab],
    queryFn: async () => {
      // Get all route targets
      const response = await apiClient.get(`route_targets`);
      const allTargets = response.data.items || [];
      
      // Filter out targets that are already associated with this VRF
      const currentTargets = activeTab === 'import' ? importTargets : exportTargets;
      const currentTargetIds = currentTargets ? currentTargets.map((target: RouteTarget) => target.id) : [];
      
      return allTargets.filter((target: RouteTarget) => !currentTargetIds.includes(target.id));
    },
    enabled: showAddTargetsModal && !!importTargets && !!exportTargets // Only fetch when modal is open and other data is loaded
  });
  
  // Mutation to add route targets to VRF
  const addTargetsMutation = useMutation({
    mutationFn: async (targetIds: number[]) => {
      // Create junction table entries
      await Promise.all(targetIds.map(targetId => {
        const junctionTable = activeTab === 'import' ? 'vrf_import_targets' : 'vrf_export_targets';
        return apiClient.post(junctionTable, { 
          vrf_id: parseInt(id!), 
          route_target_id: targetId 
        });
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vrf_import_targets'] });
      queryClient.invalidateQueries({ queryKey: ['vrf_export_targets'] });
      refetchImportTargets();
      refetchExportTargets();
      refetchAvailableTargets();
      setShowAddTargetsModal(false);
      setSelectedTargets([]);
    }
  });
  
  // Mutation to remove route target from VRF
  const removeTargetMutation = useMutation({
    mutationFn: async ({ targetId, type }: { targetId: number, type: 'import' | 'export' }) => {
      const junctionTable = type === 'import' ? 'vrf_import_targets' : 'vrf_export_targets';
      
      // Find the junction table entry
      const junctionResponse = await apiClient.get(junctionTable, {
        params: { 
          vrf_id: id,
          route_target_id: targetId
        }
      });
      
      const junctionItems = junctionResponse.data.items || [];
      
      if (junctionItems.length === 0) {
        throw new Error('Junction table entry not found');
      }
      
      // Delete the junction table entry
      // Note: In a real API, you might have a more direct way to delete this
      // For example: DELETE /vrf_import_targets?vrf_id=X&route_target_id=Y
      const junctionId = junctionItems[0].id;
      await apiClient.delete(`${junctionTable}/${junctionId}`);
    },
    onSuccess: (_, variables) => {
      if (variables.type === 'import') {
        queryClient.invalidateQueries({ queryKey: ['vrf_import_targets'] });
        refetchImportTargets();
      } else {
        queryClient.invalidateQueries({ queryKey: ['vrf_export_targets'] });
        refetchExportTargets();
      }
    }
  });
  
  const handleAddTargets = () => {
    const targetIds = selectedTargets.map(id => parseInt(id));
    addTargetsMutation.mutate(targetIds);
  };
  
  const handleRemoveTarget = (targetId: number, type: 'import' | 'export') => {
    if (window.confirm(`Are you sure you want to remove this ${type} target?`)) {
      removeTargetMutation.mutate({ targetId, type });
    }
  };
  
  const handleOpenAddModal = (tab: string) => {
    setActiveTab(tab);
    setShowAddTargetsModal(true);
  };
  
  if (isLoadingVRF) {
    return (
      <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
        <Loader />
      </Box>
    );
  }
  
  if (isErrorVRF) {
    return (
      <Alert color="red" title="Error">
        Failed to load VRF. Please try again.
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
                onClick={() => navigate('/vrfs')}
              >
                Back to VRFs
              </Button>
              <Title order={3}>{vrf.name}</Title>
            </Group>
            <Text color="dimmed" size="sm">Manage route targets for this VRF</Text>
          </Box>
        </Group>
        
        <Card withBorder p="md" radius="md" mb="md">
          <Title order={4} mb="sm">VRF Details</Title>
          <Stack gap="xs">
            <Group>
              <Text fw={500}>Name:</Text>
              <Text>{vrf.name}</Text>
            </Group>
            {vrf.rd && (
              <Group>
                <Text fw={500}>Route Distinguisher:</Text>
                <Text>{vrf.rd}</Text>
              </Group>
            )}
            <Group>
              <Text fw={500}>Enforce Unique:</Text>
              <Text>{vrf.enforce_unique ? 'Yes' : 'No'}</Text>
            </Group>
            {vrf.description && (
              <Group>
                <Text fw={500}>Description:</Text>
                <Text>{vrf.description}</Text>
              </Group>
            )}
          </Stack>
        </Card>
        
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="import">Import Targets</Tabs.Tab>
            <Tabs.Tab value="export">Export Targets</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="import" pt="xs">
            <Group justify="flex-end" mb="md">
              <Button 
                leftSection={<IconPlus size={16} />} 
                onClick={() => handleOpenAddModal('import')}
                radius="md"
                variant="filled"
              >
                Add Import Targets
              </Button>
            </Group>
            
            {isLoadingImportTargets ? (
              <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
                <Loader />
              </Box>
            ) : isErrorImportTargets ? (
              <Alert color="red" title="Error">
                Failed to load import targets. Please try again.
              </Alert>
            ) : !importTargets || importTargets.length === 0 ? (
              <Text ta="center" c="dimmed" py="xl">
                No import targets for this VRF. Add import targets using the button above.
              </Text>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th style={tableStyles.header}>Name</th>
                    <th style={tableStyles.header}>Description</th>
                    <th style={tableStyles.header}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {importTargets?.map((target: RouteTarget) => (
                    <tr key={target.id}>
                      <td style={tableStyles.cell}>{target.name}</td>
                      <td style={tableStyles.cell}>{target.description || '-'}</td>
                      <td style={{ ...tableStyles.cell, ...tableStyles.actionsCell }}>
                        <ActionIcon 
                          color="red" 
                          onClick={() => handleRemoveTarget(target.id, 'import')}
                          title="Remove import target"
                          loading={removeTargetMutation.isPending}
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
          </Tabs.Panel>

          <Tabs.Panel value="export" pt="xs">
            <Group justify="flex-end" mb="md">
              <Button 
                leftSection={<IconPlus size={16} />} 
                onClick={() => handleOpenAddModal('export')}
                radius="md"
                variant="filled"
              >
                Add Export Targets
              </Button>
            </Group>
            
            {isLoadingExportTargets ? (
              <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
                <Loader />
              </Box>
            ) : isErrorExportTargets ? (
              <Alert color="red" title="Error">
                Failed to load export targets. Please try again.
              </Alert>
            ) : !exportTargets || exportTargets.length === 0 ? (
              <Text ta="center" c="dimmed" py="xl">
                No export targets for this VRF. Add export targets using the button above.
              </Text>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th style={tableStyles.header}>Name</th>
                    <th style={tableStyles.header}>Description</th>
                    <th style={tableStyles.header}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exportTargets?.map((target: RouteTarget) => (
                    <tr key={target.id}>
                      <td style={tableStyles.cell}>{target.name}</td>
                      <td style={tableStyles.cell}>{target.description || '-'}</td>
                      <td style={{ ...tableStyles.cell, ...tableStyles.actionsCell }}>
                        <ActionIcon 
                          color="red" 
                          onClick={() => handleRemoveTarget(target.id, 'export')}
                          title="Remove export target"
                          loading={removeTargetMutation.isPending}
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
          </Tabs.Panel>
        </Tabs>
      </Card>
      
      {/* Modal for adding route targets */}
      <Modal
        opened={showAddTargetsModal}
        onClose={() => setShowAddTargetsModal(false)}
        title={`Add ${activeTab === 'import' ? 'Import' : 'Export'} Targets`}
        size="lg"
      >
        {isLoadingAvailableTargets ? (
          <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
            <Loader />
          </Box>
        ) : !availableTargets || availableTargets.length === 0 ? (
          <Text ta="center" c="dimmed" py="xl">
            No available route targets to add. All route targets are already associated with this VRF.
          </Text>
        ) : (
          <Stack>
            <MultiSelect
              label={`Select ${activeTab === 'import' ? 'import' : 'export'} targets to add`}
              placeholder="Choose route targets"
              data={availableTargets ? availableTargets.map((target: RouteTarget) => ({
                value: target.id.toString(),
                label: target.name
              })) : []}
              value={selectedTargets}
              onChange={setSelectedTargets}
              searchable
              clearable
            />
            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={() => setShowAddTargetsModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddTargets} 
                loading={addTargetsMutation.isPending}
                disabled={selectedTargets.length === 0}
              >
                Add to VRF
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
