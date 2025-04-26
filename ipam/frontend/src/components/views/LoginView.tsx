import { useState } from 'react';
import { TextInput, PasswordInput, Button, Stack, Card, Title, Text, Group, Alert } from '@mantine/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAuth } from '../../context/AuthContext';

export function LoginView() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login, isLoading, error } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Get the redirect path or default to home
    const from = (location.state as any)?.from?.pathname || '/';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await login(username, password);
            // Redirect will happen automatically once authentication state updates
        } catch (err) {
            // Error is handled by the auth context
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 'calc(100vh - 140px)'
        }}>
            <Card shadow="sm" p="xl" withBorder style={{ width: '100%', maxWidth: 400 }}>
                <Title order={2} mb="md" ta="center">Login to IPAM</Title>

                {error && (
                    <Alert
                        icon={<IconAlertCircle size={16} />}
                        title="Authentication Error"
                        color="red"
                        mb="md"
                    >
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleLogin}>
                    <Stack>
                        <TextInput
                            label="Username"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />

                        <PasswordInput
                            label="Password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <Button type="submit" loading={isLoading} mt="md">
                            Login
                        </Button>

                        <Group position="apart" mt="xs">
                            <Text size="xs" color="dimmed">Forgot password?</Text>
                            <Text size="xs" color="blue">Reset</Text>
                        </Group>
                    </Stack>
                </form>
            </Card>
        </div>
    );
} 