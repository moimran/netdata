import React from 'react';
import { Select, Text, Group, Loader } from '@mantine/core';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';

interface TenantSelectorProps {
    compact?: boolean;
}

export const TenantSelector: React.FC<TenantSelectorProps> = ({ compact = false }) => {
    const { currentTenant, availableTenants, isLoading, setCurrentTenant } = useTenant();
    const { user } = useAuth();

    // Only show selector for superusers or users with multiple tenants
    if (!user || (!user.is_superuser && (!currentTenant || availableTenants.length <= 1))) {
        return null;
    }

    // If loading, show a loader
    if (isLoading) {
        return <Loader size="sm" />;
    }

    // Convert tenants to options format for Select
    const tenantOptions = availableTenants.map((tenant) => ({
        value: tenant.id,
        label: tenant.name,
    }));

    // Add "All Tenants" option for superusers
    if (user.is_superuser) {
        tenantOptions.unshift({
            value: 'all',
            label: 'All Tenants',
        });
    }

    // Handle tenant change
    const handleTenantChange = (tenantId: string | null) => {
        if (!tenantId || tenantId === 'all') {
            setCurrentTenant(null);
        } else {
            const selectedTenant = availableTenants.find((t) => t.id === tenantId);
            if (selectedTenant) {
                setCurrentTenant(selectedTenant);
            }
        }
    };

    return (
        <Group spacing={compact ? 'xs' : 'md'}>
            {!compact && <Text size="sm">Tenant:</Text>}
            <Select
                placeholder="Select Tenant"
                data={tenantOptions}
                value={currentTenant?.id || 'all'}
                onChange={handleTenantChange}
                sx={{ minWidth: compact ? 120 : 200 }}
                size={compact ? 'xs' : 'sm'}
            />
        </Group>
    );
}; 