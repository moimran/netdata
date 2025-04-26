import React from 'react';
import { Title, Paper } from '@mantine/core';
import { IPAMTable } from '../tables/IPAMTable';
import { DARK_CARD_BG } from '../../theme/colors';

export function DeviceInventoryView() {
    return (
        <>
            <Title order={2} mb="md">Device Inventory</Title>
            <Paper bg={DARK_CARD_BG} p="md">
                <IPAMTable tableName="device_inventory" />
            </Paper>
        </>
    );
} 