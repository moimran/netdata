import { SharedTableComponent } from '../tables/SharedTableComponent';
import { useBaseMutation } from '../../hooks';
import { Stack, ActionIcon, Tooltip, Group } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export function VRFView() {
  // Render custom actions for each VRF
  const renderCustomActions = (item: any) => {
    return (
      <Tooltip label="View Details">
        <ActionIcon
          color="teal"
          variant="light"
          component={Link}
          to={`/vrfs/${item.id}`}
        >
          <IconExternalLink size={16} />
        </ActionIcon>
      </Tooltip>
    );
  };

  return (
    <Stack>
      <SharedTableComponent
        tableName="vrfs"
        customActionsRenderer={renderCustomActions}
      />
    </Stack>
  );
}
