import React from 'react';
import { Box, NavLink, Text, Divider, Group, ThemeIcon, Title } from '@mantine/core';
import { Link, useLocation } from 'react-router-dom';
import { 
  IconWorld,
  IconLayersIntersect,
  IconBuilding,
  IconMapPin,
  IconNetwork,
  IconServer,
  IconDatabase,
  IconShield,
  IconBorderAll,
  IconNetworkOff,
  IconDeviceDesktopAnalytics,
  IconRouter,
  IconBuildingFactory2,
  IconMap2,
  IconDashboard,
  IconChevronRight
} from '@tabler/icons-react';

export function MainNavigation() {
  const location = useLocation();

  const navigationGroups = [
    {
      title: 'Dashboard',
      items: [
        { icon: IconDashboard, label: 'Dashboard', path: '/' }
      ]
    },
    {
      title: 'Organization',
      items: [
        { icon: IconMap2, label: 'Regions', path: '/regions' },
        { icon: IconBuildingFactory2, label: 'Sites', path: '/sites' },
        { icon: IconServer, label: 'Locations', path: '/locations' }
      ]
    },
    {
      title: 'IP Management',
      items: [
        { icon: IconNetwork, label: 'Prefixes', path: '/prefixes' },
        { icon: IconRouter, label: 'VRFs', path: '/vrfs' },
        { icon: IconWorld, label: 'RIRs', path: '/rirs' },
        { icon: IconDatabase, label: 'Aggregates', path: '/aggregates' },
        { icon: IconShield, label: 'Roles', path: '/roles' },
        { icon: IconBorderAll, label: 'IP Ranges', path: '/ip-ranges' },
        { icon: IconDeviceDesktopAnalytics, label: 'IP Addresses', path: '/ip-addresses' },
        { icon: IconNetworkOff, label: 'ASNs', path: '/asns' },
        { icon: IconLayersIntersect, label: 'ASN Ranges', path: '/asn-ranges' }
      ]
    }
  ];

  return (
    <Box py="md">
      <Box px="md" pb="md">
        <Group position="center" mb="xs">
          <ThemeIcon size="xl" radius="xl" color="blue">
            <IconNetwork size={24} />
          </ThemeIcon>
        </Group>
        <Text align="center" size="xs" color="dimmed" mb="md">IP Address Management</Text>
      </Box>

      {navigationGroups.map((group, index) => (
        <Box key={index} mb="md">
          <Text
            transform="uppercase"
            color="dimmed"
            weight={700}
            size="xs"
            px="md"
            mb="xs"
          >
            {group.title}
          </Text>
          
          {group.items.map((item) => (
            <NavLink
              key={item.path}
              component={Link}
              to={item.path}
              label={item.label}
              leftSection={
                <ThemeIcon variant="light" color={location.pathname === item.path ? 'blue' : 'gray'} size="md">
                  <item.icon size={16} stroke={1.5} />
                </ThemeIcon>
              }
              rightSection={location.pathname === item.path && <IconChevronRight size={14} />}
              active={location.pathname === item.path}
              variant={location.pathname === item.path ? "filled" : "light"}
              color="blue"
              pl="md"
              py="xs"
              mb={5}
            />
          ))}
          
          {index < navigationGroups.length - 1 && <Divider my="sm" />}
        </Box>
      ))}
    </Box>
  );
}
