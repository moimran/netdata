import { useState } from 'react';
import {
  Card,
  Title,
  Text,
  Group,
  Button,
  Stack,
  ActionIcon,
  Modal,
  MultiSelect,
  Loader,
  Alert,
  Box,
  Tabs,
  Table
} from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';
import { IconArrowLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import {
  useVRFDetail,
  useVRFRouteTargets,
  useAvailableRouteTargets,
  useAddVRFRouteTargets,
  useRemoveVRFRouteTarget,
  RouteTarget
} from '../../../hooks';

export function VRFDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string | null>('import');
  const [showAddTargetsModal, setShowAddTargetsModal] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  // Fetch VRF details using our new hook
  const {
    data: vrf,
    isLoading: isLoadingVRF,
    isError: isErrorVRF
  } = useVRFDetail(id);

  // Fetch import targets for this VRF
  const {
    data: importTargets,
    isLoading: isLoadingImportTargets,
    isError: isErrorImportTargets,
    refetch: refetchImportTargets
  } = useVRFRouteTargets(id, 'import');

  // Fetch export targets for this VRF
  const {
    data: exportTargets,
    isLoading: isLoadingExportTargets,
    isError: isErrorExportTargets,
    refetch: refetchExportTargets
  } = useVRFRouteTargets(id, 'export');

  // Fetch available targets for the add modal
  const {
    data: availableTargets,
    isLoading: isLoadingAvailableTargets,
    refetch: refetchAvailableTargets
  } = useAvailableRouteTargets(
    id,
    activeTab as 'import' | 'export',
    activeTab === 'import' ? importTargets : exportTargets
  );

  // Mutation to add route targets to VRF
  const addTargetsMutation = useAddVRFRouteTargets(id, activeTab as 'import' | 'export');

  // Mutation to remove route target from VRF
  const removeTargetMutation = useRemoveVRFRouteTarget(id);

  // Handlers
  const handleAddTargets = () => {
    if (selectedTargets.length === 0) return;

    const targetIds = selectedTargets.map(id => parseInt(id, 10));
    addTargetsMutation.mutate({ targetIds }, {
      onSuccess: () => {
        refetchImportTargets();
        refetchExportTargets();
        refetchAvailableTargets();
        setShowAddTargetsModal(false);
        setSelectedTargets([]);
      }
    });
  };

  const handleRemoveTarget = (targetId: number, type: 'import' | 'export') => {
    if (window.confirm(`Are you sure you want to remove this ${type} target?`)) {
      removeTargetMutation.mutate({ targetId, type }, {
        onSuccess: () => {
          refetchImportTargets();
          refetchExportTargets();
          refetchAvailableTargets();
        }
      });
    }
  };

  const handleOpenAddModal = (tab: string) => {
    setActiveTab(tab);
    setSelectedTargets([]);
    setShowAddTargetsModal(true);
  };

  // Loading and error states
  if (isLoadingVRF) {
    return (
      <Box display="flex" style={{ justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Loader size="xl" />
      </Box>
    );
  }

  if (isErrorVRF) {
    return (
      <Alert color="red" title="Error">
        Failed to load VRF details. Please try again.
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <Group>
        <Button
          leftSection={<IconArrowLeft size={16} />}
          variant="outline"
          onClick={() => navigate('/vrfs')}
        >
          Back to VRFs
        </Button>
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={3} mb="md">VRF Details</Title>

        <Table>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td style={{ fontWeight: 'bold', width: '25%' }}>Name</Table.Td>
              <Table.Td title={vrf?.name || ''}>{vrf?.name}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td style={{ fontWeight: 'bold' }}>Route Distinguisher</Table.Td>
              <Table.Td title={vrf?.rd || '-'}>{vrf?.rd || '-'}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td style={{ fontWeight: 'bold' }}>Enforce Unique</Table.Td>
              <Table.Td title={vrf?.enforce_unique ? 'Yes' : 'No'}>{vrf?.enforce_unique ? 'Yes' : 'No'}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td style={{ fontWeight: 'bold' }}>Description</Table.Td>
              <Table.Td title={vrf?.description || '-'}>{vrf?.description || '-'}</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Card>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Tabs defaultValue="import" value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="md">
            <Tabs.Tab value="import">Import Route Targets</Tabs.Tab>
            <Tabs.Tab value="export">Export Route Targets</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="import">
            <Group justify="space-between" mb="md">
              <Title order={4}>Import Route Targets</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => handleOpenAddModal('import')}
              >
                Add Import Targets
              </Button>
            </Group>

            {isLoadingImportTargets ? (
              <Box display="flex" style={{ justifyContent: 'center', padding: '20px' }}>
                <Loader />
              </Box>
            ) : isErrorImportTargets ? (
              <Alert color="red" title="Error">
                Failed to load import targets. Please try again.
              </Alert>
            ) : importTargets?.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                No import route targets defined for this VRF.
              </Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {importTargets?.map((target: RouteTarget) => (
                    <Table.Tr key={target.id}>
                      <Table.Td title={target.name}>{target.name}</Table.Td>
                      <Table.Td title={target.description || '-'}>{target.description || '-'}</Table.Td>
                      <Table.Td>
                        <ActionIcon
                          color="red"
                          onClick={() => handleRemoveTarget(target.id, 'import')}
                          loading={removeTargetMutation.isPending && removeTargetMutation.variables?.targetId === target.id && removeTargetMutation.variables?.type === 'import'}
                          title="Remove Import Target"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="export">
            <Group justify="space-between" mb="md">
              <Title order={4}>Export Route Targets</Title>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => handleOpenAddModal('export')}
              >
                Add Export Targets
              </Button>
            </Group>

            {isLoadingExportTargets ? (
              <Box display="flex" style={{ justifyContent: 'center', padding: '20px' }}>
                <Loader />
              </Box>
            ) : isErrorExportTargets ? (
              <Alert color="red" title="Error">
                Failed to load export targets. Please try again.
              </Alert>
            ) : exportTargets?.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                No export route targets defined for this VRF.
              </Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {exportTargets?.map((target: RouteTarget) => (
                    <Table.Tr key={target.id}>
                      <Table.Td title={target.name}>{target.name}</Table.Td>
                      <Table.Td title={target.description || '-'}>{target.description || '-'}</Table.Td>
                      <Table.Td>
                        <ActionIcon
                          color="red"
                          onClick={() => handleRemoveTarget(target.id, 'export')}
                          loading={removeTargetMutation.isPending && removeTargetMutation.variables?.targetId === target.id && removeTargetMutation.variables?.type === 'export'}
                          title="Remove Export Target"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Tabs.Panel>
        </Tabs>
      </Card>

      {/* Modal for adding targets */}
      <Modal
        opened={showAddTargetsModal}
        onClose={() => setShowAddTargetsModal(false)}
        title={`Add ${activeTab === 'import' ? 'Import' : 'Export'} Route Targets`}
        size="lg"
      >
        {isLoadingAvailableTargets ? (
          <Box display="flex" style={{ justifyContent: 'center', padding: '20px' }}>
            <Loader />
          </Box>
        ) : availableTargets?.length === 0 ? (
          <Alert color="blue" title="No Targets Available">
            All route targets are already associated with this VRF.
          </Alert>
        ) : (
          <>
            <MultiSelect
              label="Select Route Targets"
              data={availableTargets?.map(target => ({
                value: target.id.toString(),
                label: target.name
              })) || []}
              value={selectedTargets}
              onChange={setSelectedTargets}
              placeholder="Select one or more route targets"
              searchable
              nothingFoundMessage="No matching targets found"
              mb="md"
            />

            <Group justify="flex-end">
              <Button variant="outline" onClick={() => setShowAddTargetsModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddTargets}
                disabled={selectedTargets.length === 0}
                loading={addTargetsMutation.isPending}
              >
                Add Targets
              </Button>
            </Group>
          </>
        )}
      </Modal>
    </Stack>
  );
}
