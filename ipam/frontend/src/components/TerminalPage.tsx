import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Paper, Title, Button, Group, LoadingOverlay } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { SSHTerminal } from './SSHTerminal';

export function TerminalPage() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const [deviceName, setDeviceName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDeviceName() {
      if (!deviceId) return;
      
      try {
        setLoading(true);
        
        // Import the API client
        const { apiClient } = await import('../api/client');
        
        // Get device details
        const response = await apiClient.get(`/devices/${deviceId}`);
        setDeviceName(response.data.name || `Device ${deviceId}`);
      } catch (err) {
        console.error("Error fetching device name:", err);
        setDeviceName(`Device ${deviceId}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDeviceName();
  }, [deviceId]);

  const handleGoBack = () => {
    navigate('/devices');
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (!deviceId) {
    return (
      <Container size="xl" py="xl">
        <Paper shadow="sm" p="md" withBorder>
          <Title order={3}>Invalid Device ID</Title>
          <Button mt="md" onClick={handleGoBack} leftSection={<IconArrowLeft size={16} />}>
            Back to Devices
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Paper shadow="sm" p="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>Terminal - {deviceName}</Title>
          <Button 
            variant="outline" 
            onClick={handleGoBack}
            leftSection={<IconArrowLeft size={16} />}
          >
            Back to Devices
          </Button>
        </Group>
        
        <div style={{ position: 'relative', height: 600 }}>
          <LoadingOverlay visible={loading} />
          <SSHTerminal 
            deviceId={parseInt(deviceId)} 
            deviceName={deviceName}
            onError={handleError}
          />
        </div>
      </Paper>
    </Container>
  );
}
