import React from 'react';
import { Group, Avatar, Text, Box, Burger, Title, Menu, Button } from '@mantine/core';
import { IconNetwork, IconLogout, IconUser, IconChevronDown } from '@tabler/icons-react';
import { PRIMARY, TEXT_PRIMARY, ICON_ACTIVE } from '../../theme/colors';
import { TenantSelector } from '../TenantSelector';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
    burgerProps?: {
        opened: boolean;
        toggle: () => void;
    };
}

export function Header({ burgerProps }: HeaderProps) {
    const { user, logout } = useAuth();

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
                <TenantSelector />

                <Menu
                    position="bottom-end"
                    withArrow
                    arrowPosition="center"
                    shadow="md"
                >
                    <Menu.Target>
                        <Group style={{ cursor: 'pointer' }}>
                            <Avatar color={PRIMARY} radius="xl">
                                {user?.username.substring(0, 2).toUpperCase() || 'IP'}
                            </Avatar>
                            <Box visibleFrom="sm">
                                <Group gap={5}>
                                    <Text c={TEXT_PRIMARY} fw={500}>
                                        {user?.username || 'Guest'}
                                    </Text>
                                    <IconChevronDown size={14} color={TEXT_PRIMARY} />
                                </Group>
                                <Text c={TEXT_PRIMARY} size="xs">
                                    {user?.is_superuser ? 'Administrator' : 'User'}
                                    {user?.tenant_name ? ` - ${user.tenant_name}` : ''}
                                </Text>
                            </Box>
                        </Group>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item leftSection={<IconUser size={16} />}>
                            Profile
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                            leftSection={<IconLogout size={16} />}
                            color="red"
                            onClick={logout}
                        >
                            Logout
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            </Group>
        </Group>
    );
} 