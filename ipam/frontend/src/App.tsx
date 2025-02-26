import { Routes, Route } from 'react-router-dom';
import { AppShell, Title, MantineProvider } from '@mantine/core';
import { MainNavigation } from './components/MainNavigation';
import { Dashboard } from './components/Dashboard';
import { IPAMView } from './components/IPAMView';
import { RegionsView } from './components/RegionsView';
import { IPAddressView } from './components/IPAddressView';
import { PrefixView } from './components/PrefixView';
import { VRFView } from './components/VRFView';
import type { TableName } from './types';

function AppContent() {
  return (
    <AppShell
      padding="md"
      navbar={{ width: 250, breakpoint: 'sm' }}
      header={{ height: 60 }}
      styles={(theme) => ({
        main: {
          backgroundColor: theme.colors.dark[7]
        },
        header: {
          backgroundColor: theme.colors.dark[7]
        },
        navbar: {
          backgroundColor: theme.colors.dark[8],
          borderRight: `1px solid ${theme.colors.dark[5]}`
        }
      })}
    >
      <AppShell.Header p="xs">
        <Title order={1} c="white">IPAM System</Title>
      </AppShell.Header>

      <AppShell.Navbar>
        <MainNavigation />
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/regions" element={<RegionsView />} />
          <Route path="/site-groups" element={<IPAMView tableName="site_groups" />} />
          <Route path="/sites" element={<IPAMView tableName="sites" />} />
          <Route path="/locations" element={<IPAMView tableName="locations" />} />
          <Route path="/vrfs" element={<VRFView />} />
          <Route path="/rirs" element={<IPAMView tableName="rirs" />} />
          <Route path="/aggregates" element={<IPAMView tableName="aggregates" />} />
          <Route path="/roles" element={<IPAMView tableName="roles" />} />
          <Route path="/prefixes" element={<PrefixView />} />
          <Route path="/ip-ranges" element={<IPAMView tableName="ip_ranges" />} />
          <Route path="/ip-addresses" element={<IPAddressView />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

function App() {
  return (
    <MantineProvider
      theme={{
        colorScheme: 'dark',
        primaryColor: 'blue',
        defaultRadius: 'sm',
        colors: {
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
      }}
      withGlobalStyles
    >
      <AppContent />
    </MantineProvider>
  );
}

export default App;
