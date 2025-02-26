import { Grid, Card, Text, Group, RingProgress, Stack } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9001/api/v1';

export function Dashboard() {
  const { data: prefixes = [] } = useQuery({
    queryKey: ['prefixes'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/prefixes`);
      return response.data;
    }
  });

  const { data: ipAddresses = [] } = useQuery({
    queryKey: ['ip_addresses'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/ip_addresses`);
      return response.data;
    }
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/sites`);
      return response.data;
    }
  });

  const { data: vrfs = [] } = useQuery({
    queryKey: ['vrfs'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/vrfs`);
      return response.data;
    }
  });

  const stats = [
    {
      title: 'Total Prefixes',
      value: prefixes.length,
      color: 'blue',
    },
    {
      title: 'IP Addresses',
      value: ipAddresses.length,
      color: 'green',
    },
    {
      title: 'Sites',
      value: sites.length,
      color: 'grape',
    },
    {
      title: 'VRFs',
      value: vrfs.length,
      color: 'orange',
    },
  ];

  return (
    <Stack>
      <Text size="xl" fw={700}>Dashboard</Text>
      <Grid>
        {stats.map((stat) => (
          <Grid.Col span={{ base: 12, md: 6, lg: 3 }} key={stat.title}>
            <Card withBorder padding="lg">
              <Group justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text size="xs" c="dimmed">{stat.title}</Text>
                  <Text fw={700} size="xl">{stat.value}</Text>
                </Stack>
                <RingProgress
                  size={80}
                  roundCaps
                  thickness={8}
                  sections={[{ value: 100, color: stat.color }]}
                />
              </Group>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    </Stack>
  );
}
