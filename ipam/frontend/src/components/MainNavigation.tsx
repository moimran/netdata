import { Box, NavLink } from '@mantine/core';
import { IconDashboard, IconMap2, IconBuilding, IconNetwork } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';

export function MainNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { icon: IconDashboard, label: 'Dashboard', path: '/' },
    { icon: IconMap2, label: 'Regions', path: '/regions' },
    { icon: IconBuilding, label: 'Sites', path: '/sites' },
    { icon: IconNetwork, label: 'IPAM', path: '/ipam' },
  ];

  return (
    <Box w={250} p="xs">
      {navigationItems.map((item) => (
        <NavLink
          key={item.path}
          label={item.label}
          leftSection={<item.icon size={20} />}
          active={location.pathname === item.path}
          onClick={() => navigate(item.path)}
        />
      ))}
    </Box>
  );
}
