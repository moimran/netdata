import { Box, NavLink, Text, Divider, Group, ThemeIcon, UnstyledButton, Collapse } from '@mantine/core';
import { Link, useLocation } from 'react-router-dom';
import React from 'react';
import {
  PRIMARY,
  PRIMARY_LIGHT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_BRIGHT,
  ICON_ACTIVE,
  ICON_INACTIVE
} from '../../theme/colors';
import {
  IconWorld,
  IconLayersIntersect,
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
  IconChevronRight,
  IconChevronDown,
  IconBuildingSkyscraper,
  IconUsers,
  IconWifi,
  IconKey,
  IconBrain,
  IconSearch
} from '@tabler/icons-react';

export function MainNavigation() {
  const location = useLocation();
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({});

  const toggleGroup = (groupTitle: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

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
        { icon: IconBuildingSkyscraper, label: 'Site Groups', path: '/site-groups' },
        { icon: IconBuildingFactory2, label: 'Sites', path: '/sites' },
        { icon: IconServer, label: 'Locations', path: '/locations' }
      ]
    },
    {
      title: 'IP Management',
      items: [
        { icon: IconWorld, label: 'RIRs', path: '/rirs' },
        { icon: IconDatabase, label: 'Aggregates', path: '/aggregates' },
        { icon: IconNetwork, label: 'Prefixes', path: '/prefixes' },
        { icon: IconBorderAll, label: 'IP Ranges', path: '/ip-ranges' },
        { icon: IconDeviceDesktopAnalytics, label: 'IP Addresses', path: '/ip-addresses' },
        { icon: IconRouter, label: 'VRFs', path: '/vrfs' },
        { icon: IconLayersIntersect, label: 'Route Targets', path: '/route-targets' },
        { icon: IconShield, label: 'Roles', path: '/roles' },
        { icon: IconWifi, label: 'VLANs', path: '/vlans' },
        { icon: IconBorderAll, label: 'VLAN Groups', path: '/vlan-groups' },
        { icon: IconNetworkOff, label: 'ASNs', path: '/asns' },
        { icon: IconLayersIntersect, label: 'ASN Ranges', path: '/asn-ranges' }
      ]
    },
    {
      title: 'Network Intelligence',
      items: [
        { icon: IconNetwork, label: 'Interfaces', path: '/interfaces' },
        { icon: IconSearch, label: 'ARP Table', path: '/arp-table' },
        { icon: IconBrain, label: 'Device Inventory', path: '/device-inventory' }
      ]
    },
    {
      title: 'Administration',
      items: [
        { icon: IconUsers, label: 'Tenants', path: '/tenants' },
        { icon: IconKey, label: 'Credentials', path: '/credentials' }
      ]
    }
  ];

  return (
    <Box py="md">
      <Box px="md" pb="md">
        <Group justify="center" mb="xs">
          <ThemeIcon size="xl" radius="xl" color={PRIMARY}>
            <IconNetwork size={24} />
          </ThemeIcon>
        </Group>
        <Text ta="center" size="xs" c={TEXT_BRIGHT} fw={600} mb="md">IP Address Management</Text>
      </Box>

      {navigationGroups.map((group, index) => (
        <Box key={index} mb="md">
          <UnstyledButton
            onClick={() => toggleGroup(group.title)}
            style={{ width: '100%' }}
            px="md"
            mb="xs"
          >
            <Group justify="space-between">
              <Text
                tt="uppercase"
                c={TEXT_BRIGHT}
                fw={700}
                size="xs"
              >
                {group.title}
              </Text>
              <IconChevronDown
                size={14}
                color={TEXT_BRIGHT}
                style={{
                  transform: collapsedGroups[group.title] ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms ease'
                }}
              />
            </Group>
          </UnstyledButton>

          <Collapse in={!collapsedGroups[group.title]}>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                component={Link}
                to={item.path}
                label={
                  <Text c={location.pathname === item.path ? TEXT_PRIMARY : TEXT_SECONDARY} fw={500}>
                    {item.label}
                  </Text>
                }
                leftSection={
                  <ThemeIcon variant="light" color={location.pathname === item.path ? PRIMARY : 'dark'} size="md">
                    <item.icon size={16} stroke={1.5} color={location.pathname === item.path ? ICON_ACTIVE : ICON_INACTIVE} />
                  </ThemeIcon>
                }
                rightSection={location.pathname === item.path && <IconChevronRight size={14} color={ICON_ACTIVE} />}
                active={location.pathname === item.path}
                color={location.pathname === item.path ? PRIMARY : "dark"}
                pl="md"
                py="xs"
                mb={5}
                className="main-nav-link"
              />
            ))}
          </Collapse>

          {index < navigationGroups.length - 1 && <Divider my="sm" color={PRIMARY_LIGHT} />}
        </Box>
      ))}
    </Box>
  );
}
