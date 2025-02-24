import React from 'react';
import { Box, NavLink } from '@mantine/core';
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
  IconMap2
} from '@tabler/icons-react';

export function MainNavigation() {
  const location = useLocation();

  const navigationItems = [
    { icon: IconBuildingFactory2, label: 'Sites', path: '/sites' },
    { icon: IconMap2, label: 'Regions', path: '/regions' },
    { icon: IconServer, label: 'Locations', path: '/locations' },
    { icon: IconNetwork, label: 'Prefixes', path: '/prefixes' },
    { icon: IconRouter, label: 'Vrfs', path: '/vrfs' },
    { icon: IconWorld, label: 'Rirs', path: '/rirs' },
    { icon: IconDatabase, label: 'Aggregates', path: '/aggregates' },
    { icon: IconShield, label: 'Roles', path: '/roles' },
    { icon: IconBorderAll, label: 'Ip Ranges', path: '/ip-ranges' },
    { icon: IconDeviceDesktopAnalytics, label: 'Ip Addresses', path: '/ip-addresses' }
  ];

  return (
    <Box p="md">
      {navigationItems.map((item) => (
        <NavLink
          key={item.path}
          component={Link}
          to={item.path}
          label={item.label}
          leftSection={<item.icon size="1rem" stroke={1.5} />}
          active={location.pathname === item.path}
          styles={(theme) => ({
            root: {
              marginBottom: '0.5rem',
              color: theme.white,
              '&[data-active]': {
                backgroundColor: theme.colors.blue[8],
              },
              '&:hover': {
                backgroundColor: theme.colors.dark[6],
              }
            },
            label: {
              color: 'inherit'
            },
            section: {
              color: 'inherit'
            }
          })}
        />
      ))}
    </Box>
  );
}
