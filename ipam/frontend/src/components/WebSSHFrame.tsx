import { useEffect, useRef, useState } from 'react';
import { Box, Button, Container, Group, LoadingOverlay, Paper, Text, Title } from '@mantine/core';
import { useParams, useNavigate } from 'react-router-dom';

interface DeviceDetails {
  ip_address: string;
  username: string;
  password: string;
  enable_password?: string;
  device_name?: string;
}

export function WebSSHFrame() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails | null>(null);

  // Get device details and set up the iframe
  useEffect(() => {
    async function getDeviceDetails() {
      if (!deviceId) return;
      
      try {
        setLoading(true);
        setError(null);

        // Import the API client
        const { apiClient } = await import('../api/client');

        // Get device connection details
        try {
          console.log(`Getting connection details for device ${deviceId}`);
          const response = await apiClient.get(`/devices/${deviceId}/connection-details`);
          const deviceInfo = response.data;
          console.log("Got device connection details:", deviceInfo);
          
          // Store device details in state
          setDeviceDetails(deviceInfo);
          
          // Set a timeout to hide the loading overlay after a few seconds
          setTimeout(() => {
            setLoading(false);
          }, 3000);
          
        } catch (err) {
          console.error("Error getting device connection details:", err);
          setError('Failed to get device connection details');
          setLoading(false);
        }
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setLoading(false);
      }
    }

    getDeviceDetails();
  }, [deviceId]);

  const handleGoBack = () => {
    navigate('/devices');
  };

  return (
    <Container size="xl" py="xl">
      <Paper shadow="sm" p="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Terminal - {deviceDetails?.device_name || `Device ${deviceId}`}</Title>
          <Button variant="outline" onClick={handleGoBack}>Back to Devices</Button>
        </Group>
        
        <Box pos="relative" h={700} style={{ borderRadius: '5px', overflow: 'hidden' }}>
          <LoadingOverlay visible={loading} />
          {error && (
            <Box p="xs" bg="red.1" c="red.8" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
              <Text size="sm">{error}</Text>
            </Box>
          )}
          <iframe 
            ref={iframeRef}
            src={deviceDetails ? 
              `http://localhost:8888?hostname=${encodeURIComponent(deviceDetails.ip_address)}&username=${encodeURIComponent(deviceDetails.username)}&password=${encodeURIComponent(deviceDetails.password)}` : 
              "http://localhost:8888"
            }
            style={{ 
              width: '100%', 
              height: '100%', 
              border: 'none'
            }}
            title="WebSSH Terminal"
          />
        </Box>
      </Paper>
    </Container>
  );
}
