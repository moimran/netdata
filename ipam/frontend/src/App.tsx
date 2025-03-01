import { Routes, Route } from 'react-router-dom';
import { AppShell, Title, MantineProvider, Group, Avatar, Text, Box, Burger, ScrollArea, useMantineTheme } from '@mantine/core';
import { MainNavigation } from './components/MainNavigation';
import { Dashboard } from './components/Dashboard';
import { IPAMView } from './components/IPAMView';
import { RegionsView } from './components/RegionsView';
import { IPAddressView } from './components/IPAddressView';
import { PrefixView } from './components/PrefixView';
import { VRFView } from './components/VRFView';
import { ASNView } from './components/ASNView';
import { ASNRangeView } from './components/ASNRangeView';
import { VRFDetailView } from './components/VRFDetailView';
import { useState } from 'react';
import { IconNetwork } from '@tabler/icons-react';
import type { TableName } from './types';
import {
  PRIMARY,
  PRIMARY_LIGHT,
  DARK_BG,
  DARK_CARD_BG,
  DARK_BORDER,
  TEXT_PRIMARY,
  ICON_ACTIVE
} from './theme/colors';

function AppContent() {
  const [opened, setOpened] = useState(false);
  const theme = useMantineTheme();

  return (
    <AppShell
      padding="md"
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      header={{ height: 70 }}
      styles={{
        main: {
          backgroundColor: DARK_BG
        },
        header: {
          backgroundColor: DARK_CARD_BG
        },
        navbar: {
          backgroundColor: DARK_CARD_BG,
          borderRight: `1px solid ${DARK_BORDER}`
        }
      }}
    >
      <AppShell.Header p="md">
        <Group justify="space-between" align="center" h="100%">
          <Group>
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              color={TEXT_PRIMARY}
              size="sm"
              mr="xl"
              hiddenFrom="sm"
            />
            <Group gap="xs">
              <IconNetwork size={30} color={ICON_ACTIVE} />
              <Title order={1} c={TEXT_PRIMARY} style={{ fontWeight: 700 }}>IPAM System</Title>
            </Group>
          </Group>
          
          <Group>
            <Avatar color={PRIMARY} radius="xl">IP</Avatar>
            <Box visibleFrom="sm">
              <Text c={TEXT_PRIMARY} fw={500}>Admin User</Text>
              <Text c={TEXT_PRIMARY} size="xs">Administrator</Text>
            </Box>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={0}>
        <ScrollArea>
          <MainNavigation />
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/regions" element={<RegionsView />} />
          <Route path="/site-groups" element={<IPAMView tableName="site_groups" />} />
          <Route path="/sites" element={<IPAMView tableName="sites" />} />
          <Route path="/locations" element={<IPAMView tableName="locations" />} />
          <Route path="/vrfs" element={<VRFView />} />
          <Route path="/vrfs/:id" element={<VRFDetailView />} />
          <Route path="/route-targets" element={<IPAMView tableName="route_targets" />} />
          <Route path="/vrf-import-targets" element={<IPAMView tableName="vrf_import_targets" />} />
          <Route path="/vrf-export-targets" element={<IPAMView tableName="vrf_export_targets" />} />
          <Route path="/rirs" element={<IPAMView tableName="rirs" />} />
          <Route path="/aggregates" element={<IPAMView tableName="aggregates" />} />
          <Route path="/roles" element={<IPAMView tableName="roles" />} />
          <Route path="/prefixes" element={<PrefixView />} />
          <Route path="/ip-ranges" element={<IPAMView tableName="ip_ranges" />} />
          <Route path="/ip-addresses" element={<IPAddressView />} />
          <Route path="/vlans" element={<IPAMView tableName="vlans" />} />
          <Route path="/vlan-groups" element={<IPAMView tableName="vlan_groups" />} />
          <Route path="/devices" element={<IPAMView tableName="devices" />} />
          <Route path="/interfaces" element={<IPAMView tableName="interfaces" />} />
          <Route path="/asns" element={<ASNView />} />
          <Route path="/asn-ranges" element={<ASNRangeView />} />
          <Route path="/tenants" element={<IPAMView tableName="tenants" />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

function App() {
  return (
    <MantineProvider
      theme={{
        primaryColor: 'teal',
        defaultRadius: 'md',
        colors: {
          // Vibrant colors for dark theme
          blue: [
            '#e6f7ff',
            '#bae7ff',
            '#91d5ff',
            '#69c0ff',
            '#40a9ff',
            '#1890ff',
            '#096dd9',
            '#0050b3',
            '#003a8c',
            '#002766',
          ],
          violet: [
            '#f3e8ff',
            '#e9d5ff',
            '#d8b4fe',
            '#c084fc',
            '#a855f7',
            '#9333ea',
            '#7e22ce',
            '#6b21a8',
            '#581c87',
            '#4c1d95',
          ],
          teal: [
            '#ccfbf1',
            '#99f6e4',
            '#5eead4',
            '#2dd4bf',
            '#14b8a6',
            '#0d9488',
            '#0f766e',
            '#115e59',
            '#134e4a',
            '#042f2e',
          ],
          dark: [
            '#C1C2C5',
            '#A6A7AB',
            '#909296',
            '#5C5F66',
            '#373A40',
            '#2C2E33',
            '#25262B',
            '#1A1B1E',
            '#141517',
            '#101113',
          ],
        },
        fontFamily: 'Roboto, sans-serif',
        headings: {
          fontFamily: 'Roboto, sans-serif',
          fontWeight: '700',
        },
        components: {
          Button: {
            defaultProps: {
              variant: 'filled',
            },
            styles: {
              root: {
                fontWeight: 600,
              },
            },
          },
          Card: {
            styles: {
              root: {
                backgroundColor: DARK_CARD_BG,
                borderColor: DARK_BORDER,
              },
            },
          },
          NavLink: {
            styles: {
              root: {
                '&:hover': {
                  backgroundColor: '#14b8a6 !important',
                },
              },
            },
          },
        },
      }}
    >
      <AppContent />
    </MantineProvider>
  );
}

export default App;
