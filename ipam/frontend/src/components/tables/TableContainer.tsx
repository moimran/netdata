import { ReactNode } from 'react';
import { Card, Title, Stack, Text, Box } from '@mantine/core';
import '../IPAMTable/mrt-fixes.css';

interface TableContainerProps {
    children: ReactNode;
    title?: string;
    description?: string;
}

/**
 * TableContainer - A consistent container for all tables
 * 
 * This component provides a standard card-based container with consistent
 * styling for all tables in the application.
 * 
 * Usage:
 * ```tsx
 * <TableContainer title="IP Addresses">
 *   <IPAMTable tableName="ip_addresses" />
 * </TableContainer>
 * ```
 */
export function TableContainer({ children, title, description }: TableContainerProps) {
    return (
        <Stack spacing="xs" mb="xl">
            {(title || description) && (
                <Box mb={8} ml={4}>
                    {title && (
                        <Title order={3} className="ipam-table-title">
                            {title}
                        </Title>
                    )}
                    
                    {description && (
                        <Text size="sm" color="dimmed" className="ipam-table-description">
                            {description}
                        </Text>
                    )}
                </Box>
            )}
            
            <Card
                shadow="sm"
                p={0}
                radius="md"
                withBorder
                className="ipam-table-card"
                styles={{
                    root: {
                        backgroundColor: '#1A1B1E',
                        borderColor: '#374151'
                    }
                }}
            >
                {children}
            </Card>
        </Stack>
    );
}

export default TableContainer; 