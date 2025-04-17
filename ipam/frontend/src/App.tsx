import React, { Suspense } from 'react';
import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/views/Dashboard';
import { MainNavigation } from './components/layout/MainNavigation';
import { PrefixView } from './components/views/PrefixView';
import { IPView } from './components/views/IPView';
import { VLANView } from './components/views/VLANView';
import { VLANGroupView } from './components/views/VLANGroupView';
import { RouteTargetView } from './components/views/RouteTargetView';
import { VRFView } from './components/views/VRFView';
import { RackView } from './components/views/RackView';
import { DeviceView } from './components/views/DeviceView';
import { SiteView } from './components/views/SiteView';
import { RIRView } from './components/views/RIRView';
import { UserView } from './components/views/UserView';
import { ASNView } from './components/views/ASNView';
import { TenantView } from './components/views/TenantView';
import { LoginView } from './components/views/LoginView';
import { CredentialView } from './components/views/CredentialView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { VRFDetailView } from './components/views/details/VRFDetailView';
import { VLANGroupDetailView } from './components/views/details/VLANGroupDetailView';
import { ICON_ACTIVE, TEXT_PRIMARY, DARK_BG, DARK_CARD_BG, DARK_BORDER } from './theme/colors';
import { IconNetwork } from '@tabler/icons-react';
import { RegionsView } from './components/views/RegionsView';
import { LocationsView } from './components/views/LocationsView';
import { SiteGroupsView } from './components/views/SiteGroupsView';
import { AggregatesView } from './components/views/AggregatesView';
import { IPAddressView } from './components/views/IPAddressView';
import { IPRangesView } from './components/views/IPRangesView';
import { RolesView } from './components/views/RolesView';
import { VRFImportTargetsView } from './components/views/VRFImportTargetsView';
import { VRFExportTargetsView } from './components/views/VRFExportTargetsView';
import { ASNRangeView } from './components/views/ASNRangeView';
import { InterfacesView } from './components/views/InterfacesView';
import { IPAMTableMRTView } from './components/views/IPAMTableMRTView';

// Loading component for suspense fallback
const LoadingComponent = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '400px',
    color: TEXT_PRIMARY
  }}>
    <div style={{ textAlign: 'center' }}>
      <IconNetwork size={40} color={ICON_ACTIVE} style={{ marginBottom: '16px' }} />
      <div>Loading...</div>
    </div>
  </div>
);

function App() {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        main: {
          backgroundColor: DARK_BG,
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
      <AppShell.Header>
        <Header burgerProps={{ opened, toggle }} />
      </AppShell.Header>

      <AppShell.Navbar p={0}>
        <ScrollArea>
          <MainNavigation />
        </ScrollArea>
      </AppShell.Navbar>

      <AppShell.Main>
        <ErrorBoundary>
          <Suspense fallback={<LoadingComponent />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />

              {/* Organization */}
              <Route path="/regions" element={<RegionsView />} />
              <Route path="/site-groups" element={<SiteGroupsView />} />
              <Route path="/sites" element={<SiteView />} />
              <Route path="/locations" element={<LocationsView />} />

              {/* IP Management */}
              <Route path="/rirs" element={<RIRView />} />
              <Route path="/aggregates" element={<AggregatesView />} />
              <Route path="/prefixes" element={<PrefixView />} />
              <Route path="/ip-ranges" element={<IPRangesView />} />
              <Route path="/ip-addresses" element={<IPAddressView />} />
              <Route path="/ips" element={<IPView />} />
              <Route path="/vrfs" element={<VRFView />} />
              <Route path="/vrfs/:id" element={<VRFDetailView />} />
              <Route path="/route-targets" element={<RouteTargetView />} />
              <Route path="/vrf-import-targets" element={<VRFImportTargetsView />} />
              <Route path="/vrf-export-targets" element={<VRFExportTargetsView />} />
              <Route path="/roles" element={<RolesView />} />
              <Route path="/vlans" element={<VLANView />} />
              <Route path="/vlan-groups" element={<VLANGroupView />} />
              <Route path="/vlan-groups/:id" element={<VLANGroupDetailView />} />
              <Route path="/asns" element={<ASNView />} />
              <Route path="/asn-ranges" element={<ASNRangeView />} />

              {/* Devices */}
              <Route path="/devices" element={<DeviceView />} />
              <Route path="/interfaces" element={<InterfacesView />} />
              <Route path="/credentials" element={<CredentialView />} />
              <Route path="/racks" element={<RackView />} />

              {/* Administration */}
              <Route path="/tenants" element={<TenantView />} />
              <Route path="/users" element={<UserView />} />
              <Route path="/login" element={<LoginView />} />

              {/* Migration to Mantine React Table is complete */}
              {/* All views now use the MRT implementation through the compatibility wrapper */}

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
