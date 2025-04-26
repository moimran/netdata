import { Suspense } from 'react';
import './App.css';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/views/Dashboard';
import { MainNavigation } from './components/layout/MainNavigation';
import PrefixView from './components/views/PrefixView';
import { IPView } from './components/views/IPView';
import { VLANView } from './components/views/VLANView';
import { VLANGroupView } from './components/views/VLANGroupView';
import { RouteTargetView } from './components/views/RouteTargetView';
import { VRFView } from './components/views/VRFView';
import { RackView } from './components/views/RackView';
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
import VRFImportTargetsView from './components/views/VRFImportTargetsView';
import VRFExportTargetsView from './components/views/VRFExportTargetsView';
import { ASNRangeView } from './components/views/ASNRangeView';
import { InterfacesView } from './components/views/InterfacesView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { ARPTableView } from './components/views/ARPTableView';
import { DeviceInventoryView } from './components/views/DeviceInventoryView';
// Import views as needed

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

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingComponent />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const [opened, { toggle }] = useDisclosure();
  const { isAuthenticated } = useAuth();

  // If not authenticated, only show login page
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

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
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

              {/* Organization */}
              <Route path="/regions" element={<ProtectedRoute><RegionsView /></ProtectedRoute>} />
              <Route path="/site-groups" element={<ProtectedRoute><SiteGroupsView /></ProtectedRoute>} />
              <Route path="/sites" element={<ProtectedRoute><SiteView /></ProtectedRoute>} />
              <Route path="/locations" element={<ProtectedRoute><LocationsView /></ProtectedRoute>} />

              {/* IP Management */}
              <Route path="/rirs" element={<ProtectedRoute><RIRView /></ProtectedRoute>} />
              <Route path="/aggregates" element={<ProtectedRoute><AggregatesView /></ProtectedRoute>} />
              <Route path="/prefixes" element={<ProtectedRoute><PrefixView /></ProtectedRoute>} />
              <Route path="/ip-ranges" element={<ProtectedRoute><IPRangesView /></ProtectedRoute>} />
              <Route path="/ip-addresses" element={<ProtectedRoute><IPAddressView /></ProtectedRoute>} />
              <Route path="/ips" element={<ProtectedRoute><IPView /></ProtectedRoute>} />
              <Route path="/vrfs" element={<ProtectedRoute><VRFView /></ProtectedRoute>} />
              <Route path="/vrfs/:id" element={<ProtectedRoute><VRFDetailView /></ProtectedRoute>} />
              <Route path="/route-targets" element={<ProtectedRoute><RouteTargetView /></ProtectedRoute>} />
              <Route path="/vrf-import-targets" element={<ProtectedRoute><VRFImportTargetsView /></ProtectedRoute>} />
              <Route path="/vrf-export-targets" element={<ProtectedRoute><VRFExportTargetsView /></ProtectedRoute>} />
              <Route path="/roles" element={<ProtectedRoute><RolesView /></ProtectedRoute>} />
              <Route path="/vlans" element={<ProtectedRoute><VLANView /></ProtectedRoute>} />
              <Route path="/vlan-groups" element={<ProtectedRoute><VLANGroupView /></ProtectedRoute>} />
              <Route path="/vlan-groups/:id" element={<ProtectedRoute><VLANGroupDetailView /></ProtectedRoute>} />
              <Route path="/asns" element={<ProtectedRoute><ASNView /></ProtectedRoute>} />
              <Route path="/asn-ranges" element={<ProtectedRoute><ASNRangeView /></ProtectedRoute>} />

              {/* Devices */}
              <Route path="/interfaces" element={<ProtectedRoute><InterfacesView /></ProtectedRoute>} />
              <Route path="/arp-table" element={<ProtectedRoute><ARPTableView /></ProtectedRoute>} />
              <Route path="/device-inventory" element={<ProtectedRoute><DeviceInventoryView /></ProtectedRoute>} />
              <Route path="/credentials" element={<ProtectedRoute><CredentialView /></ProtectedRoute>} />
              <Route path="/racks" element={<ProtectedRoute><RackView /></ProtectedRoute>} />

              {/* Administration */}
              <Route path="/tenants" element={<ProtectedRoute><TenantView /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute><UserView /></ProtectedRoute>} />
              <Route path="/login" element={<LoginView />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AppShell.Main>
    </AppShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <AppContent />
      </TenantProvider>
    </AuthProvider>
  );
}

export default App;
