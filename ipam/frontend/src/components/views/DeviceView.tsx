import { Stack, ActionIcon, Tooltip } from '@mantine/core';
import { UnifiedTable } from '../tables';
import { IPAMModal } from '../ui/IPAMModal';
import { IconExternalLink } from '@tabler/icons-react';
import { useState } from 'react';
import TableContainer from '../tables/TableContainer';
// Using the unified table styles from TableContainer

export function DeviceView() {
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  // Custom actions renderer for the device table
  const renderDeviceActions = (device: any) => {
    return (
      <>
        <Tooltip label="Connect to device">
          <ActionIcon
            color="green"
            variant="light"
            radius="md"
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
                    'width=800,height=600,noopener,noreferrer'
                  );
                } else {
                  // Fallback if no websocket_url is provided
                  window.open(
                    `http://localhost:8022/?device_id=${device.id}&session_id=${data.session_id || sessionId}`,
                    '_blank',
                    'width=800,height=600,noopener,noreferrer'
                  );
                }
              } catch (error: any) {
                console.error('Error connecting to device:', error);
                alert(`Failed to connect to device: ${error.message || 'Unknown error'}`);
              }
            }}
          >
            <IconExternalLink size={16} />
          </ActionIcon>
        </Tooltip>
      </>
    );
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedDevice(null);
  };

  return (
    <Stack gap="md">
      {/* Device table - Temporarily Commented Out */}
      {/* <TableContainer title="Devices">
        <UnifiedTable
          tableName="devices"
          customActionsRenderer={renderDeviceActions}
        />
      </TableContainer> */}

      {/* Device Inventory table */}
      <TableContainer title="Device Inventory">
        <UnifiedTable
          tableName="device_inventory"
        />
      </TableContainer>

      {/* Edit device modal */}
      {showModal && (
        <IPAMModal
          tableName="devices"
          data={selectedDevice}
          onClose={handleModalClose}
        />
      )}

      {/* Terminal functionality now handled by webssh-rs */}
    </Stack>
  );
}
