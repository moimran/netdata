import React, { useEffect, useState } from 'react';
import { SimpleGrid, Card, Text, Title, Group, Paper, ThemeIcon, Progress, Stack, Box, Divider } from '@mantine/core';
import { IconNetworkOff, IconServer, IconRouter, IconNetwork, IconWifi, IconArrowUpRight, IconArrowDownRight, IconUsers, IconBuildingFactory2 } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { PRIMARY, STATUS_ACTIVE } from '../../theme/colors';

const API_BASE_URL = 'http://localhost:9001/api/v1';

export function Dashboard() {
  const { data: prefixes = [], isLoading: prefixesLoading } = useQuery({
    queryKey: ['prefixes'],
    queryFn: async () => {
      const response = await apiClient.get('prefixes');
      return response.data;
    }
  });

  const { data: ipAddresses = [], isLoading: ipAddressesLoading } = useQuery({
    queryKey: ['ip_addresses'],
    queryFn: async () => {
      const response = await apiClient.get('ip_addresses');
      return response.data;
    }
  });

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const response = await apiClient.get('sites');
      return response.data;
    }
  });

  const { data: vrfs = [], isLoading: vrfsLoading } = useQuery({
    queryKey: ['vrfs'],
    queryFn: async () => {
      const response = await apiClient.get('vrfs');
      return response.data;
    }
  });

  // Mock data for trends - in a real app, you would calculate these from historical data
  const trends = {
    prefixes: { change: 5, isUp: true },
    ipAddresses: { change: 12, isUp: true },
    sites: { change: 0, isUp: false },
    vrfs: { change: 2, isUp: true }
  };

  // Mock utilization data - in a real app, you would calculate these
  const utilization = {
    ipv4: 68,
    ipv6: 23,
    vlan: 45
  };

  const stats = [
    {
      title: 'Total Prefixes',
      value: prefixes.length || 0,
      color: 'blue',
      icon: IconNetwork,
      trend: trends.prefixes,
      isLoading: prefixesLoading
    },
    {
      title: 'IP Addresses',
      value: ipAddresses.length || 0,
      color: 'green',
      icon: IconServer,
      trend: trends.ipAddresses,
      isLoading: ipAddressesLoading
    },
    {
      title: 'Sites',
      value: sites.length || 0,
      color: 'grape',
      icon: IconBuildingFactory2,
      trend: trends.sites,
      isLoading: sitesLoading
    },
    {
      title: 'VRFs',
      value: vrfs.length || 0,
      color: 'orange',
      icon: IconRouter,
      trend: trends.vrfs,
      isLoading: vrfsLoading
    },
  ];

  return (
    <Stack spacing="xl">
      <Box>
        <Title order={2} mb="md">Dashboard</Title>
        <Text color="dimmed" mb="xl">Welcome to your IP Address Management System</Text>
      </Box>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {stats.map((stat) => (
          <Card key={stat.title} withBorder shadow="sm" radius="md" p="md" style={{ overflow: 'visible' }}>
            <Group position="apart" align="flex-start" wrap="nowrap">
              <Box>
                <Text size="xs" color="dimmed" fw={500}>{stat.title}</Text>
                <Title order={3} fw={700} mt={5} mb={0}>
                  {stat.isLoading ? '-' : stat.value}
                </Title>
                <Group spacing={5} mt={5}>
                  <Text size="xs" color={stat.trend.isUp ? 'teal' : 'red'} fw={500}>
                    {stat.trend.change}%
                  </Text>
                  {stat.trend.isUp ? (
                    <IconArrowUpRight size={14} color="teal" />
                  ) : (
                    <IconArrowDownRight size={14} color="red" />
                  )}
                  <Text size="xs" color="dimmed">since last month</Text>
                </Group>
              </Box>
              <ThemeIcon size={48} radius="md" color={stat.color} variant="light">
                <stat.icon size={24} />
              </ThemeIcon>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Card withBorder shadow="sm" radius="md" p="md">
          <Title order={4} mb="md">Resource Utilization</Title>
          <Stack spacing="md">
            <Box>
              <Group position="apart" mb={5}>
                <Text size="sm">IPv4 Address Space</Text>
                <Text size="sm" fw={500}>{utilization.ipv4}%</Text>
              </Group>
              <Progress value={utilization.ipv4} color="blue" size="md" radius="xl" />
            </Box>

            <Box>
              <Group position="apart" mb={5}>
                <Text size="sm">IPv6 Address Space</Text>
                <Text size="sm" fw={500}>{utilization.ipv6}%</Text>
              </Group>
              <Progress value={utilization.ipv6} color="cyan" size="md" radius="xl" />
            </Box>

            <Box>
              <Group position="apart" mb={5}>
                <Text size="sm">VLAN Utilization</Text>
                <Text size="sm" fw={500}>{utilization.vlan}%</Text>
              </Group>
              <Progress value={utilization.vlan} color="grape" size="md" radius="xl" />
            </Box>
          </Stack>
        </Card>

        <Card withBorder shadow="sm" radius="md" p="md">
          <Title order={4} mb="md">IP Address Distribution</Title>
          <Group position="center" grow mt="xl">
            <Progress
              value={100}
              color="teal"
              size="xl"
              radius="xl"
              sections={[
                { value: 40, color: 'blue' },
                { value: 25, color: 'orange' },
                { value: 15, color: 'grape' },
                { value: 20, color: 'teal' },
              ]}
            />
          </Group>
          <Divider my="md" />
          <SimpleGrid cols={2} spacing="xs">
            <Group spacing="xs">
              <Box w={12} h={12} bg="blue" style={{ borderRadius: '50%' }} />
              <Text size="xs">Production (40%)</Text>
            </Group>
            <Group spacing="xs">
              <Box w={12} h={12} bg="orange" style={{ borderRadius: '50%' }} />
              <Text size="xs">Development (25%)</Text>
            </Group>
            <Group spacing="xs">
              <Box w={12} h={12} bg="grape" style={{ borderRadius: '50%' }} />
              <Text size="xs">Testing (15%)</Text>
            </Group>
            <Group spacing="xs">
              <Box w={12} h={12} bg="teal" style={{ borderRadius: '50%' }} />
              <Text size="xs">Management (20%)</Text>
            </Group>
          </SimpleGrid>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
