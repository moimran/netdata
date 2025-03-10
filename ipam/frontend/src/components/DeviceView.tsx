import { Stack, ActionIcon, Tooltip, Group } from '@mantine/core';
import { IPAMTable } from './IPAMTable';
import { TabbedTerminal, TabbedTerminalRef } from './TabbedTerminal';
import { useTabbedTerminal } from '../hooks/useTabbedTerminal';
import { useRef, useEffect } from 'react';
import { IconTerminal2, IconExternalLink, IconEdit } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export function DeviceView() {
  const { 
    terminalVisible,
    setTerminalRef, 
    connectToDevice 
  } = useTabbedTerminal();

  // Create a ref to store the terminal component's addSession method
  const terminalComponentRef = useRef<TabbedTerminalRef>(null);

  // Set the terminal ref when the component mounts
  useEffect(() => {
    setTerminalRef(terminalComponentRef.current);
  }, [setTerminalRef]);

  const navigate = useNavigate();

  // Custom actions renderer for the device table
  const renderDeviceActions = (device: any) => {
    return (
      <Group gap="xs">
        <Tooltip label="Connect in tab">
          <ActionIcon
            color="blue"
            onClick={() => connectToDevice(device.id, device.name)}
            title="Connect in tab"
            variant="light"
            radius="md"
          >
            <IconTerminal2 size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Connect in new window">
          <ActionIcon
            color="green"
            onClick={() => navigate(`/terminal/${device.id}`)}
            title="Connect in new window"
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
      
      {/* Terminal with tabs */}
      <TabbedTerminal 
        visible={terminalVisible} 
        ref={terminalComponentRef}
      />
    </Stack>
  );
}
