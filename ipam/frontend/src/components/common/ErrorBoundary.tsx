import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, Title, Text, Button, Group, Alert } from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
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
            error: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log the error to an error reporting service
        console.error('Error caught by ErrorBoundary:', error, errorInfo);

        // Here you could send the error to your error reporting service
        // Example: reportError(error, errorInfo);
    }

    handleReset = (): void => {
        if (this.props.onReset) {
            this.props.onReset();
        }

        this.setState({
            hasError: false,
            error: null
        });
    }

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                    <Alert
                        icon={<IconAlertCircle size="1.1rem" />}
                        title="Something went wrong"
                        color="red"
                        variant="filled"
                        mb="md"
                    >
                        We encountered an error while rendering this component.
                    </Alert>

                    <Title order={3} mb="sm">Error Details</Title>
                    <Text color="dimmed" mb="md">
                        {this.state.error?.message || 'Unknown error'}
                    </Text>

                    <Group justify="flex-end">
                        <Button
                            leftSection={<IconRefresh size={16} />}
                            onClick={this.handleReset}
                        >
                            Try Again
                        </Button>
                    </Group>
                </Card>
            );
        }

        return this.props.children;
    }
}

/**
 * Higher-order component that wraps a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: ReactNode,
    onReset?: () => void
): React.FC<P> {
    return (props: P) => (
        <ErrorBoundary fallback={fallback} onReset={onReset}>
            <Component {...props} />
        </ErrorBoundary>
    );
} 