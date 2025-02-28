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
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={3} mb={5}>VRFs</Title>
          <Text color="dimmed" size="sm">
            Manage your VRFs and their associated route targets
          </Text>
        </div>
      </Group>
      
      <IPAMTable 
        tableName="vrfs" 
        customActionsRenderer={renderCustomActions}
      />
    </Card>
  );
}
