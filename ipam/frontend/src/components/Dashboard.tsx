import { Grid, Card, Text, Group, RingProgress, Stack } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export function Dashboard() {
  const { data: prefixes = [] } = useQuery({
    queryKey: ['prefixes'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:8000/api/regions');
      return response.data;
    }
  });

  const { data: ipAddresses = [] } = useQuery({
    queryKey: ['ipAddresses'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:8000/api/ip-addresses');
      return response.data;
    }
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:8000/api/sites');
      return response.data;
    }
  });

  const { data: vrfs = [] } = useQuery({
    queryKey: ['vrfs'],
    queryFn: async () => {
      const response = await axios.get('http://localhost:8000/api/vrfs');
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
      color: 'orange',
    },
    {
      title: 'VRFs',
      value: vrfs.length,
      color: 'grape',
    },
  ];

  return (
    <Grid>
      {stats.map((stat) => (
        <Grid.Col key={stat.title} span={3}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group position="apart">
              <Stack spacing={0}>
                <Text size="xs" color="dimmed">
                  {stat.title}
                </Text>
                <Text size="xl" weight={700}>
                  {stat.value}
                </Text>
              </Stack>
              <RingProgress
                size={80}
                thickness={8}
                sections={[{ value: 100, color: stat.color }]}
              />
            </Group>
          </Card>
        </Grid.Col>
      ))}
    </Grid>
  );
}
