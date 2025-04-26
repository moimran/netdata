import React from 'react';
import { Title, Paper } from '@mantine/core';
import { IPAMTable } from '../IPAMTable';
import { DARK_CARD_BG } from '../../theme/colors';

export function ARPTableView() {
    return (
        <>
            <Title order={2} mb="md">ARP Table</Title>
            <Paper bg={DARK_CARD_BG} p="md">
                <IPAMTable tableName="arp_table" />
            </Paper>
        </>
    );
} 