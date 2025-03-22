import { IPAMView } from './IPAMView';
import { Stack, ActionIcon, Tooltip } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export function VLANGroupView() {
    // Render custom actions for VLAN groups similar to VRFView
    const renderCustomActions = (item: any) => {
        return (
            <Tooltip label="View Details">
                <ActionIcon
                    color="teal"
                    variant="light"
                    component={Link}
                    to={`/vlan-groups/${item.id}`}
                >
                    <IconExternalLink size={16} />
                </ActionIcon>
            </Tooltip>
        );
    };

    return (
        <Stack>
            <IPAMView tableName="vlan_groups" customActionsRenderer={renderCustomActions} />
        </Stack>
    );
} 