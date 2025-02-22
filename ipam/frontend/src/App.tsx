import { Routes, Route } from 'react-router-dom';
import { AppShell, Title } from '@mantine/core';
import { MainNavigation } from './components/MainNavigation';
import { Dashboard } from './components/Dashboard';
import { RegionsView } from './components/RegionsView';
import { SitesView } from './components/SitesView';
import { IPAMView } from './components/IPAMView';
import { IPAMTable } from './components/IPAMTable';

function App() {
  return (
    <AppShell
      padding="md"
      navbar={{ width: 250, breakpoint: 'sm' }}
      header={{ height: 60 }}
    >
      <AppShell.Header p="xs">
        <Title order={1}>IPAM System</Title>
      </AppShell.Header>

      <AppShell.Navbar>
        <MainNavigation />
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/regions" element={<RegionsView />} />
          <Route path="/sites" element={<SitesView />} />
          <Route path="/ipam" element={<IPAMTable />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
