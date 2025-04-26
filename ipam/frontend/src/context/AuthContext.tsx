import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';
import axios from 'axios';

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

    // DEBUG: Log authentication state changes
    useEffect(() => {
        console.log('Auth state changed:', {
            token: token ? 'exists' : 'null',
            user: user ? user.username : 'null',
            isAuthenticated
        });
    }, [token, user, isAuthenticated]);

    // Setup axios interceptor for authentication
    useEffect(() => {
        console.log('Setting up interceptors with token:', token ? 'exists' : 'null');
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
                    console.log('401 response detected, logging out');
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
            console.log('Token exists, refreshing user data');
            refreshUser();
        } else {
            console.log('No token, skipping user refresh');
            setIsLoading(false);
        }
    }, [token]);

    // Login function
    const login = async (username: string, password: string) => {
        console.log('Login attempt for:', username);
        setIsLoading(true);
        setError(null);
        try {
            // Using absolute URL to bypass baseURL
            const response = await axios.post('/api/v1/auth/login', { username, password });
            console.log('Login response:', response.data);
            const { access_token, user_id, tenant_id } = response.data;

            // Store token
            localStorage.setItem('token', access_token);
            console.log('Token stored in localStorage');

            // Important: Set token first, then immediately use it to get user data
            setToken(access_token);

            // Get full user data - use the token directly rather than relying on state update
            try {
                console.log('Fetching user data immediately after login');
                const userResponse = await axios.get('/api/v1/auth/me', {
                    headers: {
                        Authorization: `Bearer ${access_token}`
                    }
                });
                console.log('User data received:', userResponse.data);

                // Update user and authentication state in one step
                setUser(userResponse.data);
                setIsAuthenticated(true);
                console.log('Authentication state updated manually after login');
            } catch (userErr) {
                console.error('Error fetching user data after login:', userErr);
                throw userErr; // Re-throw to be caught by the main catch block
            }
        } catch (err: any) {
            console.error('Login error full details:', err);
            setError(err.response?.data?.detail || 'Login failed');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Logout function
    const logout = () => {
        console.log('Logging out');
        localStorage.removeItem('token');
        localStorage.removeItem('currentTenantId');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    };

    // Refresh user data
    const refreshUser = async () => {
        console.log('Refreshing user data with token:', token ? 'exists' : 'null');
        setIsLoading(true);
        try {
            // Using absolute URL to bypass baseURL, but with the token
            const response = await axios.get('/api/v1/auth/me', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            console.log('User data received:', response.data);
            setUser(response.data);
            setIsAuthenticated(true);
            console.log('User authenticated, isAuthenticated set to true');
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