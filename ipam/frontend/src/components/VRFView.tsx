import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Title, 
  Text, 
  Group, 
  Button, 
  ActionIcon, 
  Tooltip
} from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { IPAMTable } from './IPAMTable';

export function VRFView() {
  const navigate = useNavigate();
  
  // Custom renderer for the actions column to add a "View Details" button
  const renderCustomActions = (item: any) => {
    return (
      <Group gap="xs" justify="center">
        <Tooltip label="View VRF Details">
          <ActionIcon 
            color="blue" 
            onClick={() => navigate(`/vrfs/${item.id}`)}
            variant="light"
            radius="md"
          >
            <IconEye size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    );
  };
  
  return (   
      <IPAMTable 
        tableName="vrfs" 
        customActionsRenderer={renderCustomActions}
      />
  );
}
