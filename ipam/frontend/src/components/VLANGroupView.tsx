import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Title, 
  Text, 
  Group,
  ActionIcon, 
  Tooltip
} from '@mantine/core';
import { IconEye } from '@tabler/icons-react';
import { UnifiedTable } from './tables';

export function VLANGroupView() {
  const navigate = useNavigate();
  
  // Custom renderer for the actions column to add a "View Details" button
  const renderCustomActions = (item: any) => {
    return (
      <Group gap="xs" justify="center">
        <Tooltip label="View Group Details">
          <ActionIcon 
            color="blue" 
            onClick={() => navigate(`/vlan-groups/${item.id}`)}
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
          <Title order={3} mb={5}>VLAN Groups</Title>
          <Text color="dimmed" size="sm">
            Manage your VLAN groups and their associated VLANs
          </Text>
        </div>
      </Group>
      
      <UnifiedTable 
        tableName="vlan_groups" 
        customActionsRenderer={renderCustomActions}
      />
    </Card>
  );
}
