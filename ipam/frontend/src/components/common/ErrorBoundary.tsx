import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, Button, Group, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component that catches errors in its child components
 * and displays a fallback UI instead of crashing the whole app
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({
            error: error,
            errorInfo: errorInfo
        });

        // Log error to an error reporting service
        console.error('Error caught by ErrorBoundary:', error, errorInfo);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <Stack spacing="md" p="xl">
                    <Alert
                        icon={<IconAlertCircle size="1.1rem" />}
                        title="Something went wrong"
                        color="red"
                        variant="filled"
                    >
                        <Text>An error occurred in this component.</Text>
                    </Alert>

                    <Title order={4}>Error Details</Title>
                    <Text component="pre" style={{ whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>
                        {this.state.error?.toString()}
                    </Text>

                    {this.state.errorInfo && (
                        <>
                            <Title order={4}>Component Stack</Title>
                            <Text component="pre" style={{ whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>
                                {this.state.errorInfo.componentStack}
                            </Text>
                        </>
                    )}

                    <Group position="center">
                        <Button
                            onClick={() => window.location.reload()}
                            color="red"
                        >
                            Reload Page
                        </Button>
                    </Group>
                </Stack>
            );
        }

        return this.props.children;
    }
}

/**
 * Higher-order component that wraps a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>
): React.FC<P> {
    return (props: P) => (
        <ErrorBoundary>
            <Component {...props} />
        </ErrorBoundary>
    );
} 