import { useState } from 'react';
import {
  Table,
  Group,
  Button,
  TextInput,
  Select,
  Modal,
  Stack,
  Text,
  Badge,
} from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface Prefix {
  id: number;
  prefix: string;
  vrf_id: number | null;
  status: string;
  description: string | null;
}

interface VRF {
  id: number;
  name: string;
  rd: string;
}

export function IPAMView() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    prefix: '',
    vrf_id: null as number | null,
    status: 'active',
    description: ''
  });

  const queryClient = useQueryClient();

  const { data: prefixes = [] } = useQuery<Prefix[]>({
    queryKey: ['prefixes'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:8000/api/v1/prefixes');
      return response.data;
    }
  });

  const { data: vrfs = [] } = useQuery<VRF[]>({
    queryKey: ['vrfs'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:8000/api/v1/vrfs');
      return response.data;
    }
  });

  const createPrefix = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await axios.post('http://localhost:8000/api/v1/prefixes', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prefixes'] });
      setIsModalOpen(false);
      setFormData({
        prefix: '',
        vrf_id: null,
        status: 'active',
        description: ''
      });
    }
  });

  return (
    <>
      <Group position="apart" mb="md">
        <Text size="xl" weight={700}>
          IP Address Management
        </Text>
        <Button onClick={() => setIsModalOpen(true)}>Add Prefix</Button>
      </Group>

      <Table>
        <thead>
          <tr>
            <th>Prefix</th>
            <th>VRF</th>
            <th>Status</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {prefixes.map((prefix) => (
            <tr key={prefix.id}>
              <td>{prefix.prefix}</td>
              <td>
                {prefix.vrf_id
                  ? vrfs.find((v) => v.id === prefix.vrf_id)?.name || 'Unknown'
                  : 'Global'}
              </td>
              <td>
                <Badge
                  color={
                    prefix.status === 'active'
                      ? 'green'
                      : prefix.status === 'reserved'
                      ? 'yellow'
                      : 'gray'
                  }
                >
                  {prefix.status}
                </Badge>
              </td>
              <td>{prefix.description || '-'}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Prefix"
      >
        <Stack>
          <TextInput
            label="Prefix"
            placeholder="e.g., 192.168.1.0/24"
            value={formData.prefix}
            onChange={(e) =>
              setFormData({ ...formData, prefix: e.target.value })
            }
          />
          <Select
            label="VRF"
            placeholder="Select VRF"
            value={formData.vrf_id?.toString()}
            onChange={(value) =>
              setFormData({ ...formData, vrf_id: value ? parseInt(value) : null })
            }
            data={[
              { value: '', label: 'Global' },
              ...vrfs.map((vrf) => ({
                value: vrf.id.toString(),
                label: vrf.name,
              })),
            ]}
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(value) =>
              setFormData({ ...formData, status: value || 'active' })
            }
            data={[
              { value: 'active', label: 'Active' },
              { value: 'reserved', label: 'Reserved' },
              { value: 'deprecated', label: 'Deprecated' },
            ]}
          />
          <TextInput
            label="Description"
            placeholder="Enter description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
          <Button onClick={() => createPrefix.mutate(formData)} loading={createPrefix.isPending}>
            Create Prefix
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
