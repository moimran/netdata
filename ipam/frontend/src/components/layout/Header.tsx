import React from 'react';
import { Group, Avatar, Text, Box, Burger, Title } from '@mantine/core';
import { IconNetwork } from '@tabler/icons-react';
import { PRIMARY, TEXT_PRIMARY, ICON_ACTIVE } from '../../theme/colors';

interface HeaderProps {
    burgerProps?: {
        opened: boolean;
        toggle: () => void;
    };
}

export function Header({ burgerProps }: HeaderProps) {
    return (
        <Group justify="space-between" align="center" h="100%" p="md">
            <Group>
                {burgerProps && (
                    <Burger
                        opened={burgerProps.opened}
                        onClick={burgerProps.toggle}
                        color={TEXT_PRIMARY}
                        size="sm"
                        mr="xl"
                        hiddenFrom="sm"
                    />
                )}
                <Group gap="xs">
                    <IconNetwork size={30} color={ICON_ACTIVE} />
                    <Title order={1} c={TEXT_PRIMARY} style={{ fontWeight: 700 }}>IPAM System</Title>
                </Group>
            </Group>

            <Group>
                <Avatar color={PRIMARY} radius="xl">IP</Avatar>
                <Box visibleFrom="sm">
                    <Text c={TEXT_PRIMARY} fw={500}>Admin User</Text>
                    <Text c={TEXT_PRIMARY} size="xs">Administrator</Text>
                </Box>
            </Group>
        </Group>
    );
} 