import { Stack, ActionIcon, Tooltip } from '@mantine/core';
import { IPAMTable } from './IPAMTable';
import { useNavigate } from 'react-router-dom';
import { IconTerminal2 } from '@tabler/icons-react';

export function DeviceView() {
  const navigate = useNavigate();

  // Custom actions renderer for the device table
  const renderDeviceActions = (device: any) => {
    return (
      <>
        <Tooltip label="Connect to device">
          <ActionIcon
            color="blue"
            onClick={() => navigate(`/terminal/${device.id}`)}
            title="Connect"
            variant="light"
            radius="md"
          >
            <IconTerminal2 size={16} />
          </ActionIcon>
        </Tooltip>
      </>
    );
  };

  return (
    <Stack gap="md">
      {/* Device table */}
      <IPAMTable 
        tableName="devices" 
        customActionsRenderer={renderDeviceActions} 
      />
    </Stack>
  );
}
