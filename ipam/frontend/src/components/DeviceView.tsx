import { Stack, ActionIcon, Tooltip, Group } from '@mantine/core';
import { IPAMTable } from './IPAMTable';
import { IconExternalLink, IconEdit } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export function DeviceView() {

  const navigate = useNavigate();

  // Custom actions renderer for the device table
  const renderDeviceActions = (device: any) => {
    return (
      <Group gap="xs">
        <Tooltip label="Connect to device">
          <ActionIcon
            color="green"
            onClick={async () => {
              try {
                // Generate a random UUID for the session
                const sessionId = crypto.randomUUID();
                
                // Call the backend API to get connection details and establish the session
                const response = await fetch(`/api/v1/devices/connect`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    device_id: device.id,
                    session_id: sessionId
                  })
                });
                
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.detail || 'Failed to connect to device');
                }
                
                const data = await response.json();
                console.log('Connection response:', data);
                
                // Open the WebSSH interface using the URL from the response
                if (data.websocket_url) {
                  window.open(
                    data.websocket_url,
                    '_blank',
                    'noopener=yes,noreferrer=yes'
                  );
                } else {
                  // Fallback if no websocket_url is provided
                  window.open(
                    `http://localhost:8022/?device_id=${device.id}&session_id=${data.session_id || sessionId}`,
                    '_blank',
                    'noopener=yes,noreferrer=yes'
                  );
                }
              } catch (error: any) {
                console.error('Error connecting to device:', error);
                alert(`Failed to connect to device: ${error.message || 'Unknown error'}`);
              }
            }}
            title="Connect to device"
            variant="light"
            radius="md"
          >
            <IconExternalLink size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Edit device">
          <ActionIcon
            color="yellow"
            onClick={() => navigate(`/devices/edit/${device.id}`)}
            title="Edit device"
            variant="light"
            radius="md"
          >
            <IconEdit size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  };

  return (
    <Stack gap="md">
      {/* Device table */}
      <IPAMTable 
        tableName="devices" 
        customActionsRenderer={renderDeviceActions} 
      />
      
      {/* Terminal functionality now handled by webssh-rs */}
    </Stack>
  );
}
