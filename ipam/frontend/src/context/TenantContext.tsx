import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    description?: string;
}

interface TenantContextType {
    currentTenant: Tenant | null;
    availableTenants: Tenant[];
    isLoading: boolean;
    error: string | null;
    setCurrentTenant: (tenant: Tenant | null) => void;
    refreshTenants: () => Promise<void>;
}

// Create the context with a default value
const TenantContext = createContext<TenantContextType>({
    currentTenant: null,
    availableTenants: [],
    isLoading: false,
    error: null,
    setCurrentTenant: () => { },
    refreshTenants: async () => { },
});

// Custom hook to use the tenant context
export const useTenant = () => useContext(TenantContext);

interface TenantProviderProps {
    children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
    const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
    const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Function to load available tenants
    const refreshTenants = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Get user's tenant from auth endpoint
            const userResponse = await apiClient.get('/api/v1/auth/me');

            // Get all available tenants (for superusers) or just the user's tenant
            const tenantsResponse = await apiClient.get('/api/v1/tenants/');

            // Set available tenants
            setAvailableTenants(tenantsResponse.data);

            // If user has a tenant_id, set it as current
            if (userResponse.data.tenant_id) {
                const userTenant = tenantsResponse.data.find(
                    (t: Tenant) => t.id === userResponse.data.tenant_id
                );

                if (userTenant) {
                    setCurrentTenant(userTenant);
                }
            }
        } catch (err) {
            setError('Failed to load tenant information');
            console.error('Error loading tenant information:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Load tenants when component mounts
    useEffect(() => {
        refreshTenants();
    }, []);

    // Function to change current tenant
    const handleSetCurrentTenant = (tenant: Tenant | null) => {
        setCurrentTenant(tenant);
        // You could store this in localStorage for persistence
        if (tenant) {
            localStorage.setItem('currentTenantId', tenant.id);
        } else {
            localStorage.removeItem('currentTenantId');
        }
    };

    const value = {
        currentTenant,
        availableTenants,
        isLoading,
        error,
        setCurrentTenant: handleSetCurrentTenant,
        refreshTenants,
    };

    return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}; 