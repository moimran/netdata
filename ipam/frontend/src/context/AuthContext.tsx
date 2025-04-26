import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';

export interface User {
    id: string;
    username: string;
    email: string;
    is_active: boolean;
    is_superuser: boolean;
    tenant_id: string | null;
    tenant_name: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: async () => { },
    logout: () => { },
    refreshUser: async () => { },
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Setup axios interceptor for authentication
    useEffect(() => {
        // Interceptor to add token to requests
        const requestInterceptor = apiClient.interceptors.request.use(
            (config) => {
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Interceptor to handle 401 responses
        const responseInterceptor = apiClient.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    logout();
                }
                return Promise.reject(error);
            }
        );

        // Cleanup interceptors when component unmounts
        return () => {
            apiClient.interceptors.request.eject(requestInterceptor);
            apiClient.interceptors.response.eject(responseInterceptor);
        };
    }, [token]);

    // Load user data if token exists
    useEffect(() => {
        if (token) {
            refreshUser();
        } else {
            setIsLoading(false);
        }
    }, [token]);

    // Login function
    const login = async (username: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.post('/api/v1/auth/login', { username, password });
            const { access_token, user_id, tenant_id } = response.data;

            // Store token
            localStorage.setItem('token', access_token);
            setToken(access_token);
            setIsAuthenticated(true);

            // Get full user data
            await refreshUser();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed');
            console.error('Login error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('currentTenantId');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    };

    // Refresh user data
    const refreshUser = async () => {
        setIsLoading(true);
        try {
            // Get user information
            const response = await apiClient.get('/api/v1/auth/me');
            setUser(response.data);
            setIsAuthenticated(true);
        } catch (err) {
            console.error('Error fetching user data:', err);
            // If we get an error, clear auth state
            logout();
        } finally {
            setIsLoading(false);
        }
    };

    const value = {
        user,
        token,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        refreshUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 