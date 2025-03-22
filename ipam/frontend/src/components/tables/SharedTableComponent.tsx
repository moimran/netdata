import { useState, useEffect } from 'react';
import {
    Button,
    Group,
    Title,
    Card,
    Text,
    ActionIcon,
    Stack,
    Tooltip,
    Pagination,
    TextInput,
    Select,
    Box,
    Loader,
    Alert,
    Progress
} from '@mantine/core';
import { StyledTable, TableHeader, StatusBadge, tableStyles } from './TableStyles';
import { IconEdit, IconTrash, IconPlus, IconSearch, IconFilter, IconRefresh } from '@tabler/icons-react';
import { IPAMModal } from '../ui/IPAMModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { TABLE_SCHEMAS } from '../IPAMTable/schemas';
import '../IPAMTable/styles.css'; // Import the IPAM Table styles

// Function to fetch utilization data from the API for prefixes
const fetchUtilization = async (prefixId: number): Promise<{ percentage: number; used: number; total: number }> => {
    try {
        const response = await apiClient.get(`/prefixes/${prefixId}/utilization`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching utilization for prefix ${prefixId}:`, error);
        // Return default values if API call fails
        return { percentage: 0, used: 0, total: 0 };
    }
};

// Cache for utilization data to avoid excessive API calls
const utilizationCache = new Map<number, { percentage: number; used: number; total: number }>();

// Helper function to calculate IP prefix utilization
const calculateUtilization = async (prefixId: number, prefix: string): Promise<{ percentage: number; used: number; total: number }> => {
    // Check if we have cached data
    if (utilizationCache.has(prefixId)) {
        return utilizationCache.get(prefixId)!;
    }

    try {
        // Fetch utilization data from API
        const utilization = await fetchUtilization(prefixId);

        // Cache the result
        utilizationCache.set(prefixId, utilization);

        return utilization;
    } catch (error) {
        console.error(`Error calculating utilization for prefix ${prefix}:`, error);

        // Fallback to local calculation if API fails
        // Extract the network mask from the prefix (e.g., "192.168.1.0/24" -> 24)
        const maskMatch = prefix.match(/\/(\d+)$/);
        if (!maskMatch) return { percentage: 0, used: 0, total: 0 };

        const mask = parseInt(maskMatch[1], 10);

        let total = 0;
        if (prefix.includes(':')) {
            // IPv6
            total = Math.pow(2, 128 - mask);
            if (total > 1000000) total = 1000000; // Cap for display purposes
        } else {
            // IPv4
            // Calculate total IPs in the network (2^(32-mask))
            // For /31 and /32, special handling is needed
            if (mask >= 31) {
                total = mask === 32 ? 1 : 2;
            } else {
                total = Math.pow(2, 32 - mask);
            }
        }

        // Generate a random number of used IPs for demonstration
        const baseUtilizationPercentage = prefix.includes(':')
            ? Math.max(0, 100 - (128 - mask) * 2)
            : Math.max(0, 100 - (32 - mask) * 8);

        // Calculate used IPs based on the percentage
        const percentage = Math.min(baseUtilizationPercentage, 100);
        const used = Math.round((total * percentage) / 100);

        // Store the calculation in cache
        const result = { percentage, used, total };
        utilizationCache.set(prefixId, result);
        return result;
    }
};

// Helper component for displaying utilization
const UtilizationBar = ({ percentage, used, total }: { percentage: number; used: number; total: number }) => {
    // Determine color based on utilization percentage
    let color = 'green';
    if (percentage > 80) color = 'red';
    else if (percentage > 60) color = 'orange';
    else if (percentage > 40) color = 'yellow';

    return (
        <Stack spacing={5}>
            <Progress
                value={percentage}
                color={color}
                size="sm"
                style={{ width: '100%' }}
            />
            <Text size="xs" color="dimmed">
                {used} / {total} ({percentage.toFixed(1)}%)
            </Text>
        </Stack>
    );
};

// Helper function to format VLAN ID ranges
const formatVlanIdRanges = (rangesString: string): string => {
    if (!rangesString) return '-';
    try {
        const ranges = JSON.parse(rangesString);
        if (!Array.isArray(ranges) || ranges.length === 0) return '-';

        return ranges.map((range: any) => {
            if (range.min_vid === range.max_vid) {
                return `${range.min_vid}`;
            }
            return `${range.min_vid}-${range.max_vid}`;
        }).join(', ');
    } catch (e) {
        console.error('Error parsing VLAN ID ranges:', e);
        return rangesString;
    }
};

interface TableComponentProps {
    tableName: string;
    customActionsRenderer?: (item: any) => React.ReactNode;
}

export function SharedTableComponent({ tableName, customActionsRenderer }: TableComponentProps) {
    const [showModal, setShowModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterField, setFilterField] = useState<string>('');
    const [filterValue, setFilterValue] = useState<string>('');
    const [utilizations, setUtilizations] = useState<Record<number, { percentage: number; used: number; total: number }>>({});
    const queryClient = useQueryClient();

    const pageSize = 15;

    // Get table schema
    const schema = TABLE_SCHEMAS[tableName] || [];

    // Get filterable fields
    const filterableFields = schema
        .filter(col => col.name !== 'id' && col.name !== 'description')
        .map(col => ({ value: col.name, label: col.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }));

    // Fetch reference data for all tables
    const referenceTableNames = [...new Set(schema
        .filter(col => col.reference)
        .map(col => col.reference!)
    )];

    const { data: referenceData = {} } = useQuery({
        queryKey: ['references', referenceTableNames],
        queryFn: async () => {
            const results: Record<string, any> = {};

            // Use Promise.all to fetch all reference data in parallel
            await Promise.all(referenceTableNames.map(async (refTableName) => {
                try {
                    const response = await apiClient.get(`${refTableName}`);
                    // Ensure we have a consistent data structure
                    const responseData = response.data;

                    // Store data in a consistent format
                    if (Array.isArray(responseData)) {
                        results[refTableName] = responseData;
                    } else if (responseData?.items && Array.isArray(responseData.items)) {
                        results[refTableName] = responseData.items;
                    } else {
                        results[refTableName] = [];
                    }
                } catch (error) {
                    console.error(`Error fetching reference data for ${refTableName}:`, error);
                    results[refTableName] = [];
                }
            }));

            return results;
        }
    });

    // Fetch data with pagination, search, and filtering
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['tableData', tableName, page, searchQuery, filterField, filterValue],
        queryFn: async () => {
            let url = `${tableName}?limit=${pageSize}&offset=${(page - 1) * pageSize}`;

            // Add search query if provided
            if (searchQuery) {
                url += `&q=${encodeURIComponent(searchQuery)}`;
            }

            // Add filter if both field and value are provided
            if (filterField && filterValue) {
                url += `&${encodeURIComponent(filterField)}=${encodeURIComponent(filterValue)}`;
            }

            const response = await apiClient.get(url);
            return response.data;
        }
    });

    // Create the delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`${tableName}/${id}`);
        },
        onSuccess: () => {
            // Invalidate and refetch after successful deletion
            queryClient.invalidateQueries({ queryKey: ['tableData'] });
        }
    });

    // Debug effect to track showModal state changes
    useEffect(() => {
        console.log(`ShowModal state for ${tableName}: ${showModal}`);
    }, [showModal, tableName]);

    // Fetch utilization data for prefixes if the table is prefixes
    useEffect(() => {
        if (tableName === 'prefixes' && data?.items) {
            const fetchUtilizationForPrefixes = async () => {
                const newUtilizations: Record<number, { percentage: number; used: number; total: number }> = {};

                await Promise.all(
                    data.items.map(async (prefix: any) => {
                        const utilization = await calculateUtilization(prefix.id, prefix.prefix);
                        newUtilizations[prefix.id] = utilization;
                    })
                );

                setUtilizations(newUtilizations);
            };

            fetchUtilizationForPrefixes();
        }
    }, [tableName, data?.items]);

    // Action handlers
    const handleAddClick = () => {
        setSelectedItem(null);
        setShowModal(true);
    };

    const handleEditClick = (item: any) => {
        setSelectedItem(item);
        setShowModal(true);
    };

    const handleDeleteClick = (id: number) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedItem(null);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1); // Reset to first page when searching
    };

    const handleClearFilters = () => {
        setSearchQuery('');
        setFilterField('');
        setFilterValue('');
        setPage(1);
    };

    // Helper function to format reference values
    const formatReferenceValue = (value: number | null, referenceTable: string): string => {
        if (value === null) return '-';

        const referenceItems = referenceData[referenceTable] || [];

        if (Array.isArray(referenceItems) && referenceItems.length > 0) {
            const referencedItem = referenceItems.find((item: any) => String(item.id) === String(value));

            if (referencedItem) {
                return referencedItem.name || referencedItem.rd || String(value);
            }
        }

        return `${referenceTable} #${value}`;
    };

    // Render loading state
    if (isLoading) {
        return (
            <Box style={tableStyles.loaderContainer}>
                <Loader size="lg" />
            </Box>
        );
    }

    // Render error state
    if (isError) {
        return (
            <Alert title="Error" color="red">
                {error instanceof Error ? error.message : 'Failed to load data'}
            </Alert>
        );
    }

    // Extract data and count from the API response
    const items = data?.items || [];
    const totalCount = data?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // Determine columns to display based on the schema
    const displayColumns = schema.map(col => col.name);

    return (
        <Stack spacing="md">
            <Group justify="space-between">
                <Title order={3}>{tableName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</Title>
                <Button
                    leftSection={<IconPlus size={14} />}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleAddClick();
                    }}
                >
                    Add
                </Button>
            </Group>

            {/* Search and Filter Card */}
            <Card p="sm" shadow="sm" style={tableStyles.filterCard}>
                <form onSubmit={handleSearch}>
                    <Group>
                        <TextInput
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftSection={<IconSearch size={16} />}
                            className="ipam-search-input"
                            style={{ flexGrow: 1 }}
                        />
                        <Select
                            placeholder="Filter field"
                            data={filterableFields}
                            value={filterField}
                            onChange={(value) => setFilterField(value || '')}
                            leftSection={<IconFilter size={16} />}
                            clearable
                            style={{ minWidth: '150px' }}
                        />
                        {filterField && (
                            <TextInput
                                placeholder="Filter value"
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                                style={{ minWidth: '150px' }}
                            />
                        )}
                        <Button type="submit" className="ipam-apply-button">Search</Button>
                        <ActionIcon
                            variant="light"
                            onClick={handleClearFilters}
                            className="ipam-refresh-button"
                            color="blue"
                            title="Clear Filters"
                        >
                            <IconRefresh size={18} />
                        </ActionIcon>
                    </Group>
                </form>
            </Card>

            {/* Table */}
            <div className="ipam-table-container">
                <StyledTable className={`ipam-${tableName}-table`}>
                    <TableHeader columns={
                        tableName === 'prefixes'
                            ? [...displayColumns.filter(col => col !== 'prefix' && col !== 'actions'), 'prefix', 'utilization', 'actions']
                            : tableName === 'vlans'
                                ? ['id', 'name', 'slug', 'vid', 'status', 'group_id', 'site_id', 'description', 'actions']
                                : tableName === 'vlan_groups'
                                    ? ['id', 'name', 'slug', 'vlan_id_ranges', 'description', 'actions']
                                    : [...displayColumns.filter(col => col !== 'actions'), 'actions']
                    } />

                    <tbody className="ipam-table-body">
                        {items.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={tableName === 'prefixes' ? displayColumns.length + 2 : displayColumns.length + 1}
                                    style={tableStyles.emptyRow}
                                >
                                    No data available
                                </td>
                            </tr>
                        ) : (
                            items.map((item: any) => (
                                <tr
                                    key={item.id}
                                    className="ipam-table-row"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {tableName === 'prefixes'
                                        ? (
                                            // For prefixes, reorder columns and separate utilization
                                            <>
                                                {displayColumns.filter(col => col !== 'prefix').map((col) => {
                                                    const colDef = schema.find(c => c.name === col);

                                                    // Determine cell content based on column type
                                                    let cellContent;

                                                    if (col === 'status') {
                                                        cellContent = <StatusBadge status={item[col]} />;
                                                    } else if (colDef?.reference) {
                                                        cellContent = formatReferenceValue(item[col], colDef.reference);
                                                    } else if (colDef?.type === 'boolean') {
                                                        cellContent = item[col] ? 'Yes' : 'No';
                                                    } else if (col === 'vlan_id_ranges') {
                                                        cellContent = formatVlanIdRanges(item[col]);
                                                    } else if (col === 'vid') {
                                                        cellContent = (
                                                            <Text fw={600} ta="center">
                                                                {item[col]}
                                                            </Text>
                                                        );
                                                    } else {
                                                        cellContent = item[col]?.toString() || '-';
                                                    }

                                                    return (
                                                        <td
                                                            key={col}
                                                            style={tableStyles.cell}
                                                            className={`ipam-cell ipam-cell-${col} ipam-cell-type-${colDef?.type || 'text'}`}
                                                            title={item[col]?.toString()}
                                                        >
                                                            {cellContent}
                                                        </td>
                                                    );
                                                })}
                                                {/* Prefix column */}
                                                <td
                                                    style={tableStyles.cell}
                                                    className="ipam-cell ipam-cell-prefix ipam-cell-type-network"
                                                    title={item['prefix']?.toString()}
                                                >
                                                    <Text ff="monospace" fw={500}>
                                                        {item['prefix']?.toString() || '-'}
                                                    </Text>
                                                </td>
                                                {/* Utilization column */}
                                                <td
                                                    style={tableStyles.cell}
                                                    className="ipam-cell ipam-cell-utilization"
                                                >
                                                    {utilizations[item.id] ? (
                                                        <UtilizationBar {...utilizations[item.id]} />
                                                    ) : (
                                                        <Text size="xs" color="dimmed">No utilization data</Text>
                                                    )}
                                                </td>
                                            </>
                                        )
                                        : tableName === 'vlans'
                                            ? (
                                                // Custom rendering for VLANs to ensure proper column order and alignment
                                                <>
                                                    <td style={tableStyles.cell} className="ipam-cell ipam-cell-id" title={item.id.toString()}>
                                                        {item.id}
                                                    </td>
                                                    <td style={tableStyles.cell} className="ipam-cell ipam-cell-name" title={item.name}>
                                                        {item.name}
                                                    </td>
                                                    <td style={tableStyles.cell} className="ipam-cell ipam-cell-slug" title={item.slug || ''}>
                                                        {item.slug || '-'}
                                                    </td>
                                                    <td style={tableStyles.cell} className="ipam-cell ipam-cell-vid" title={item.vid?.toString()}>
                                                        <Text fw={600} ta="center">
                                                            {item.vid}
                                                        </Text>
                                                    </td>
                                                    <td style={tableStyles.cell} className="ipam-cell ipam-cell-status" title={item.status}>
                                                        <StatusBadge status={item.status} />
                                                    </td>
                                                    <td style={tableStyles.cell} className="ipam-cell ipam-cell-group_id" title={item.group_id?.toString() || ''}>
                                                        {formatReferenceValue(item.group_id, 'vlan_groups')}
                                                    </td>
                                                    <td style={tableStyles.cell} className="ipam-cell ipam-cell-site_id" title={item.site_id?.toString() || ''}>
                                                        {formatReferenceValue(item.site_id, 'sites')}
                                                    </td>
                                                    <td style={tableStyles.cell} className="ipam-cell ipam-cell-description" title={item.description || ''}>
                                                        {item.description || '-'}
                                                    </td>
                                                </>
                                            )
                                            : tableName === 'vlan_groups'
                                                ? (
                                                    // Custom rendering for VLAN Groups to ensure proper column order and alignment
                                                    <>
                                                        <td style={tableStyles.cell} className="ipam-cell ipam-cell-id" title={item.id.toString()}>
                                                            {item.id}
                                                        </td>
                                                        <td style={tableStyles.cell} className="ipam-cell ipam-cell-name" title={item.name}>
                                                            {item.name}
                                                        </td>
                                                        <td style={tableStyles.cell} className="ipam-cell ipam-cell-slug" title={item.slug || ''}>
                                                            {item.slug || '-'}
                                                        </td>
                                                        <td style={tableStyles.cell} className="ipam-cell ipam-cell-vlan_id_ranges" title={item.vlan_id_ranges || ''}>
                                                            {formatVlanIdRanges(item.vlan_id_ranges)}
                                                        </td>
                                                        <td style={tableStyles.cell} className="ipam-cell ipam-cell-description" title={item.description || ''}>
                                                            {item.description || '-'}
                                                        </td>
                                                    </>
                                                )
                                                : (
                                                    // For other tables, use standard column rendering
                                                    displayColumns.map((col) => {
                                                        const colDef = schema.find(c => c.name === col);

                                                        // Determine cell content based on column type
                                                        let cellContent;

                                                        if (col === 'status') {
                                                            cellContent = <StatusBadge status={item[col]} />;
                                                        } else if (colDef?.reference) {
                                                            cellContent = formatReferenceValue(item[col], colDef.reference);
                                                        } else if (colDef?.type === 'boolean') {
                                                            cellContent = item[col] ? 'Yes' : 'No';
                                                        } else if (col === 'vlan_id_ranges') {
                                                            cellContent = formatVlanIdRanges(item[col]);
                                                        } else if (col === 'vid') {
                                                            cellContent = (
                                                                <Text fw={600} ta="center">
                                                                    {item[col]}
                                                                </Text>
                                                            );
                                                        } else {
                                                            cellContent = item[col]?.toString() || '-';
                                                        }

                                                        return (
                                                            <td
                                                                key={col}
                                                                style={tableStyles.cell}
                                                                className={`ipam-cell ipam-cell-${col} ipam-cell-type-${colDef?.type || 'text'}`}
                                                                title={item[col]?.toString()}
                                                            >
                                                                {cellContent}
                                                            </td>
                                                        );
                                                    })
                                                )}
                                    <td
                                        style={{ ...tableStyles.cell, ...tableStyles.actionsCell }}
                                        className="ipam-cell ipam-cell-actions"
                                    >
                                        {customActionsRenderer ? (
                                            customActionsRenderer(item)
                                        ) : (
                                            <Group gap="xs" justify="center">
                                                <Tooltip label="Edit">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="blue"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditClick(item);
                                                        }}
                                                        className="ipam-action-button"
                                                    >
                                                        <IconEdit size={16} />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="Delete">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="red"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteClick(item.id);
                                                        }}
                                                        className="ipam-action-button"
                                                    >
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </StyledTable>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Group justify="center" mt="md">
                    <Pagination
                        total={totalPages}
                        value={page}
                        onChange={setPage}
                        withEdges
                    />
                </Group>
            )}

            {/* Modal for adding/editing */}
            {showModal && (
                <IPAMModal
                    tableName={tableName}
                    data={selectedItem}
                    onClose={() => {
                        handleModalClose();
                        queryClient.invalidateQueries({ queryKey: ['tableData'] });
                    }}
                />
            )}
        </Stack>
    );
} 