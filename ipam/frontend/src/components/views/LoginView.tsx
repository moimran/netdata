import { useState } from 'react';
import { TextInput, PasswordInput, Button, Stack, Card, Title, Text, Group } from '@mantine/core';
import { useNavigate } from 'react-router-dom';

export function LoginView() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // In a real app, this would be an actual API call
            // const response = await apiClient.post('/auth/login', { username, password });

            // For demo purposes, just accept any login
            localStorage.setItem('isAuthenticated', 'true');
            navigate('/');
        } catch (err) {
            setError('Invalid username or password');
        } finally {
            setLoading(false);
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
                <Title order={2} mb="md" ta="center">Login</Title>

                {error && (
                    <Text color="red" mb="md" ta="center">
                        {error}
                    </Text>
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

                        <Button type="submit" loading={loading} mt="md">
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