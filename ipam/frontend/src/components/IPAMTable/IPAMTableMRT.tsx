import { useMemo, useState, useCallback } from 'react';
import {
    MantineReactTable,
    useMantineReactTable,
    type MRT_ColumnDef,
    type MRT_ColumnFiltersState,
    type MRT_SortingState,
    type MRT_PaginationState,
    type MRT_Row,
    type MRT_Cell
} from 'mantine-react-table';
import { ActionIcon, Tooltip, Box, Button, Card, Text, Progress, Badge, Loader } from '@mantine/core';
import { IconEdit, IconTrash, IconPlus, IconSearch, IconRefresh, IconDownload } from '@tabler/icons-react';
import { IPAMModal } from '../ui/IPAMModal';
import { useBaseMutation, useTableData, useReferenceData } from '../../hooks';
import type { TableName } from '../../types';
import { TABLE_SCHEMAS } from './schemas';
import { formatCellValue } from './utils';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { ErrorBoundary } from '../common/ErrorBoundary';
// Styles imported in main.tsx
import TableHeaderWrapper from './TableHeaderWrapper';

// Helper function to determine the color of the utilization bar
const getUtilizationColor = (percentage: number): string => {
    if (percentage < 60) return 'green';
    if (percentage < 80) return 'yellow';
    return 'red';
};

// Custom utilization bar component
const UtilizationBar = ({ percentage }: { percentage: number }) => {
    const color = getUtilizationColor(percentage);
    return (
        <Box className="ipam-progress-bar">
            <Progress
                value={percentage}
                color={color}
                size="sm"
                radius="sm"
                striped={percentage > 80}
                animated={percentage > 90}
            />
            <Text size="xs" ta="right" mt={4} c="dimmed">
                {percentage.toFixed(1)}%
            </Text>
        </Box>
    );
};

// Custom status badge component
const StatusBadge = ({ status }: { status: string }) => {
    let color = 'teal';

    if (status === 'reserved') color = 'indigo';
    else if (status === 'deprecated') color = 'violet';

    return (
        <Badge
            className="ipam-status-badge"
            data-color={color}
            variant="filled"
            fullWidth
        >
            {status}
        </Badge>
    );
};

interface IPAMTableMRTProps {
    tableName: TableName;
    customActionsRenderer?: (item: any) => React.ReactNode;
}

export const IPAMTableMRT = ({ tableName, customActionsRenderer }: IPAMTableMRTProps) => {
    const [showModal, setShowModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [editingItemId, setEditingItemId] = useState<number | null>(null); // Track which item's detail is being fetched
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);
    const queryClient = useQueryClient();

    // Get table schema
    const schema = useMemo(() => TABLE_SCHEMAS[tableName] || [], [tableName]);

    // Fetch reference data for all tables
    const referenceTableNames = useMemo(() => [
        ...new Set(schema
            .filter(col => col.reference)
            .map(col => col.reference!)
        )
    ], [schema]);

    // State for the table
    const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<MRT_SortingState>([]);
    const [pagination, setPagination] = useState<MRT_PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    // Fetch data using react-query through our existing hook
    const {
        data,
        isLoading,
        refetch
    } = useTableData(tableName, {
        page: pagination.pageIndex + 1, // Convert from 0-based to 1-based
        pageSize: pagination.pageSize,
        searchQuery: globalFilter,
        filterField: columnFilters.length > 0 ? columnFilters[0].id : '',
        filterValue: columnFilters.length > 0 ? String(columnFilters[0].value || '') : '',
    });

    const {
        referenceData,
        isLoading: isLoadingReferenceData,
        refetch: refetchReferenceData
    } = useReferenceData(referenceTableNames);

    // Delete mutation
    const deleteMutation = useBaseMutation({
        url: `${tableName}/$id`,
        type: 'delete',
        invalidateQueries: [tableName, 'references'],
        optimisticUpdate: {
            queryKey: ['data', tableName],
            updateFn: (oldData: any, id: number) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    items: oldData.items.filter((item: any) => item.id !== id),
                    total: oldData.total - 1
                };
            }
        }
    });

    // Memoized handlers
    const handleAddClick = useCallback(() => {
        setSelectedItem(null);
        setShowModal(true);
    }, []);

    const handleEditClick = useCallback(async (item: any) => {
        if (!item || !item.id) return;
        setEditingItemId(item.id);
        setIsFetchingDetail(true);
        try {
            // Fetch the full item details using its ID
            const fullItemData = await queryClient.fetchQuery({
                queryKey: [tableName, item.id],
                queryFn: async () => {
                    const response = await apiClient.get(`/${tableName}/${item.id}`); // Remove duplicate prefix
                    return response.data; // Assuming API returns the object directly
                },
                staleTime: 0 // Fetch fresh data for editing
            });

            setSelectedItem(fullItemData);
            setShowModal(true);
        } catch (error) {
            console.error(`Error fetching details for ${tableName} ID ${item.id}:`, error);
            // Optionally show an error message to the user
        } finally {
            setIsFetchingDetail(false);
            setEditingItemId(null);
        }
    }, [tableName, queryClient]);

    const handleDeleteClick = useCallback((id: number) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            deleteMutation.mutate(id);
        }
    }, [deleteMutation]);

    const handleModalClose = useCallback(() => {
        setShowModal(false);
        refetch();
        refetchReferenceData();
    }, [refetch, refetchReferenceData]);

    // Format reference value function
    const formatReferenceValue = useCallback((value: number | null, referenceTable: string): string => {
        if (value === null) return '';

        const referencedItem = referenceData[referenceTable]?.find((item: any) => item.id === value);

        if (referencedItem) {
            // Try to use display_name, name, or id in that order
            return referencedItem.display_name || referencedItem.name || `${value}`;
        }

        return `${value}`;
    }, [referenceData]);

    // Format a header name from snake_case to Title Case
    const formatHeaderName = (name: string): string => {
        return name.split('_')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    };

    // Calculate utilization for prefixes
    const calculateUtilization = useCallback((prefix: any) => {
        if (!prefix || !prefix.utilized || !prefix.total) return 0;
        return (prefix.utilized / prefix.total) * 100;
    }, []);

    // Convert schema to MRT column definitions
    const columns = useMemo<MRT_ColumnDef<any>[]>(() =>
        schema.map(column => ({
            accessorKey: column.name,
            // Required by TypeScript
            header: formatHeaderName(column.name),
            // Custom header renderer to ensure text is visible
            Header: () => (
                <div style={{
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    width: '100%'
                }}>
                    {formatHeaderName(column.name)}
                </div>
            ),
            size: getColumnWidth(column.name, column.type, column.width as number | undefined),
            enableColumnFilter: false,
            enableSorting: false,
            enableColumnActions: false,
            mantineTableHeadCellProps: {
                align: 'center',
                style: {
                    backgroundColor: '#066a43',
                    padding: '10px 6px',
                }
            },
            mantineTableBodyCellProps: {
                align: column.name === 'description' ? 'left' : 'center',
                style: {
                    textAlign: column.name === 'description' ? 'left' : 'center',
                    display: 'table-cell'
                }
            },
            Cell: ({ cell, row }: { cell: MRT_Cell<any>; row: MRT_Row<any> }) => {
                const value = cell.getValue();

                // Custom cell rendering based on column type
                if (column.reference && referenceData && typeof value === 'number') {
                    return <div style={{ textAlign: 'center' }}>{formatReferenceValue(value, column.reference)}</div>;
                }

                if (column.name === 'status' && typeof value === 'string') {
                    return <StatusBadge status={value} />;
                }

                if (tableName === 'prefixes' && column.name === 'prefix') {
                    // Calculate utilization if available
                    const utilizationPercentage = calculateUtilization(row.original);

                    return (
                        <div style={{ textAlign: 'center' }}>
                            <Text ff="monospace" fw={500}>{String(value)}</Text>
                            {utilizationPercentage > 0 && (
                                <Box mt={8}>
                                    <UtilizationBar percentage={utilizationPercentage} />
                                </Box>
                            )}
                        </div>
                    );
                }

                if ((column.name === 'password' || column.name === 'enable_password') && tableName === 'credentials') {
                    return <div style={{ textAlign: 'center' }}>••••••••</div>;
                }

                if (column.type === 'boolean' && typeof value === 'boolean') {
                    return <div style={{ textAlign: 'center' }}>{value ? 'Yes' : 'No'}</div>;
                }

                if (column.name === 'asn' && value !== null && value !== undefined) {
                    return <div style={{ textAlign: 'center' }}>AS{String(value)}</div>;
                }

                return <div style={{ textAlign: column.name === 'description' ? 'left' : 'center' }}>{formatCellValue(value, column.type)}</div>;
            },
        })),
        [schema, referenceData, tableName, formatReferenceValue, calculateUtilization]
    );

    // Helper function to determine appropriate column width
    function getColumnWidth(name: string, type?: string, customWidth?: number | undefined): number {
        if (customWidth) return customWidth;

        // Assign default widths based on column type
        switch (name) {
            case 'id': return 80;
            case 'prefix': return 220; // Wider for better visibility
            case 'address': return 200; // Wider for better visibility
            case 'name': return 200;
            case 'description': return 300;
            case 'status': return 130; // Slightly wider for status badges
            case 'vrf_id': return 160;
            case 'tenant_id': return 160;
            case 'role_id': return 160;
            case 'rir_id': return 160; // Added for RIR fields
            case 'site_id': return 160; // Added for site fields
            default:
                // Assign by type if no specific name match
                switch (type) {
                    case 'boolean': return 100;
                    case 'number': return 120;
                    case 'date': return 150;
                    default: return 150;
                }
        }
    }

    // Add actions column
    const columnsWithActions = useMemo<MRT_ColumnDef<any>[]>(() => [
        ...columns,
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            enableColumnFilter: false,
            size: 120,
            mantineTableHeadCellProps: {
                align: 'center'
            },
            Cell: ({ row }: { row: MRT_Row<any> }) => {
                const item = row.original;
                return (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', minWidth: '100px' }}>
                        <Tooltip label={isFetchingDetail && editingItemId === row.original.id ? "Loading..." : "Edit"}>
                            <ActionIcon
                                onClick={() => handleEditClick(row.original)}
                                color="blue"
                                disabled={isFetchingDetail && editingItemId === row.original.id}
                            >
                                {isFetchingDetail && editingItemId === row.original.id ? (
                                    <Loader size={16} color="blue" />
                                ) : (
                                    <IconEdit size={16} />
                                )}
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                            <ActionIcon
                                color="red"
                                variant="filled"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(item.id);
                                }}
                                size="md"
                                radius="sm"
                            >
                                <IconTrash size={16} stroke={1.5} />
                            </ActionIcon>
                        </Tooltip>
                        {customActionsRenderer && customActionsRenderer(item)}
                    </div>
                );
            },
        },
    ], [columns, handleEditClick, handleDeleteClick, customActionsRenderer, isFetchingDetail, editingItemId]);

    // Table instance
    const table = useMantineReactTable({
        columns: columnsWithActions,
        data: data?.items || [],
        manualFiltering: true,
        manualPagination: true,
        manualSorting: true,
        rowCount: data?.total || 0,
        state: {
            isLoading,
            columnFilters,
            globalFilter,
            pagination,
            sorting,
        },
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        enableColumnResizing: true,
        enableColumnOrdering: true,
        enableRowSelection: false,
        enableMultiSort: false,
        enableColumnActions: false, // Disable column actions menu
        enableSorting: false, // Disable sorting globally
        positionActionsColumn: 'last',
        mantineTableHeadCellProps: {
            align: 'center',
            style: {
                backgroundColor: '#066a43',
                color: '#ffffff',
                fontWeight: 700
            }
        },
        mantineTableBodyCellProps: {
            align: 'center'
        },
        mantineTableProps: {
            striped: true,
            highlightOnHover: true,
            withColumnBorders: true
        },
        renderTopToolbarCustomActions: () => (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '8px',
                width: '100%', // Ensure it takes full width
                justifyContent: 'space-between' // Space out title/actions
            }}>
                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                    <Button
                        variant="filled"
                        leftSection={<IconPlus size={16} />}
                        onClick={handleAddClick}
                        size="sm"
                        color="teal"
                    >
                        Add
                    </Button>
                    <Button
                        variant="light"
                        leftSection={<IconDownload size={16} />}
                        onClick={() => {
                            // Use MRT's CSV export functionality
                            const rows = data?.items || [];
                            const csvData = rows.map(row => {
                                // Create an object with only the visible columns
                                const csvRow: Record<string, any> = {};
                                columns.forEach(col => {
                                    if (col.accessorKey) {
                                        let value = row[col.accessorKey];

                                        // Format the value based on column type
                                        if (col.Cell) {
                                            // For special cases, try to get a text representation
                                            if (typeof value === 'boolean') {
                                                value = value ? 'Yes' : 'No';
                                            } else if (col.accessorKey === 'status') {
                                                value = row.status;
                                            } else if (col.accessorKey === 'asn') {
                                                value = `AS${value}`;
                                            }
                                        }

                                        csvRow[String(col.header)] = value;
                                    }
                                });
                                return csvRow;
                            });

                            // Convert to CSV
                            const headers = columns
                                .filter(col => col.accessorKey) // Only include columns with accessorKey
                                .map(col => String(col.header));

                            let csvContent = headers.join(',') + '\n';

                            csvData.forEach(row => {
                                const rowValues = headers.map(header => {
                                    // Handle commas and quotes in the value
                                    const value = row[header] === null || row[header] === undefined ? '' : row[header];
                                    const formattedValue = String(value).replace(/"/g, '""');
                                    return `"${formattedValue}"`;
                                });
                                csvContent += rowValues.join(',') + '\n';
                            });

                            // Create a download link
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `${tableName}_export_${new Date().toISOString().slice(0, 10)}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        size="sm"
                        color="blue"
                    >
                        Export CSV
                    </Button>
                    <ActionIcon
                        color="blue"
                        variant="light"
                        onClick={() => refetch()}
                        title="Refresh data"
                        loading={isLoading || isLoadingReferenceData}
                        className="ipam-refresh-button"
                        size="lg"
                    >
                        <IconRefresh size={18} />
                    </ActionIcon>
                </div>
            </div>
        ),
        mantineSearchTextInputProps: {
            placeholder: "Search...",
            variant: "filled",
            size: "sm",
            leftSection: <IconSearch size={16} />
        },
        mantineTableBodyRowProps: ({ row }) => ({
            onClick: () => handleEditClick(row.original),
            style: { cursor: 'pointer' },
        }),
        initialState: {
            density: 'md',
        },
        mantinePaginationProps: {
            size: "md",
            radius: "sm",
            withEdges: true,
            className: "ipam-table-pagination",
        },
        enableStickyHeader: true,
    });

    return (
        <ErrorBoundary>
            <TableHeaderWrapper>
                <Card
                    padding="0"
                    radius="md"
                    className="ipam-table-container"
                >
                    <MantineReactTable table={table} />
                </Card>
            </TableHeaderWrapper>

            {showModal && (
                <IPAMModal
                    tableName={tableName}
                    data={selectedItem} // Now contains full details
                    onClose={handleModalClose}
                />
            )}
        </ErrorBoundary>
    );
};

export default IPAMTableMRT; 