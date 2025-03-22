import { useState, useMemo } from 'react';
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
  Badge
} from '@mantine/core';
import { StyledTable, TableHeader, tableStyles, StatusBadge } from '../TableStyles';
import { IconEdit, IconTrash, IconPlus, IconSearch, IconFilter, IconRefresh } from '@tabler/icons-react';
import { IPAMModal } from '../IPAMModal';
import { useBaseMutation, useTableData, useReferenceData } from '../../hooks';
import type { TableName } from '../../types';
import { TABLE_SCHEMAS } from './schemas';
import { formatCellValue, renderUtilizationBar } from './utils';
import { ErrorBoundary } from '../common/ErrorBoundary';
import './styles.css';

interface IPAMTableProps {
  tableName: TableName;
  customActionsRenderer?: (item: any) => React.ReactNode;
}

export function IPAMTable({ tableName, customActionsRenderer }: IPAMTableProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const pageSize = 10;

  // Get table schema
  const schema = TABLE_SCHEMAS[tableName] || [];

  // Get filterable fields
  const filterableFields = useMemo(() => schema
    .filter(col => col.name !== 'id' && col.name !== 'description')
    .map(col => ({ value: col.name, label: col.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') })),
    [schema]
  );

  // Fetch reference data for all tables
  const referenceTableNames = useMemo(() => [
    ...new Set(schema
      .filter(col => col.reference)
      .map(col => col.reference!)
    )
  ], [schema]);

  const {
    referenceData,
    isLoading: isLoadingReferenceData,
    refetch: refetchReferenceData
  } = useReferenceData(referenceTableNames);

  // Fetch table data using the new hook
  const {
    data,
    isLoading,
    isError,
    refetch
  } = useTableData(tableName, {
    page,
    pageSize,
    searchQuery,
    filterField,
    filterValue
  });

  // Delete mutation
  const deleteMutation = useBaseMutation({
    url: `${tableName}/$id`,
    type: 'delete',
    invalidateQueries: [tableName, 'references'],
    mutationFn: async (id: number) => {
      await fetch(`/api/v1/${tableName}/${id}`, {
        method: 'DELETE'
      });

      return { success: true };
    }
  });

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
    refetch();
    refetchReferenceData();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    refetch();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterField('');
    setFilterValue('');
    setPage(1);
    refetch();
  };

  const formatTableCell = (item: any, column: any) => {
    // For references, show the referenced item's name instead of ID
    if (column.reference) {
      return formatReferenceValue(item[column.name], referenceData, column.reference);
    }

    // For status fields, show a status badge
    if (column.name === 'status') {
      return <StatusBadge status={item[column.name]} />;
    }

    // Special formatting for utilization fields
    if (tableName === 'prefixes' && column.name === 'prefix' && item.id) {
      return (
        <div>
          {item[column.name]}
          <Box mt={8}>
            <UtilizationBar prefixId={item.id} prefix={item.prefix} />
          </Box>
        </div>
      );
    }

    // Format ID columns with a specific style
    if (column.name === 'id') {
      return <Text size="sm" fw={500}>{item[column.name]}</Text>;
    }

    // Format name columns with emphasis
    if (column.name === 'name') {
      return <Text fw={500}>{item[column.name]}</Text>;
    }

    // Standard formatting for other fields
    const formattedValue = formatCellValue(column, item[column.name], referenceData, item, tableName);

    // Apply specific styling based on column type
    if (column.type === 'number') {
      return <Text>{formattedValue}</Text>;
    } else if (column.type === 'boolean') {
      return <Badge color={formattedValue === 'Yes' ? 'green' : 'gray'}>{formattedValue}</Badge>;
    } else {
      return <Text>{formattedValue}</Text>;
    }
  };

  // Format reference values
  const formatReferenceValue = (value: number | null, referenceData: Record<string, any[]>, referenceTable: string): string => {
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

  const totalPages = data?.total
    ? Math.ceil(data.total / pageSize)
    : 1;

  // Use the UtilizationBar from utils.tsx
  const UtilizationBar = ({ prefixId, prefix }: { prefixId: number, prefix: string }) => {
    return renderUtilizationBar(prefix);
  };

  return (
    <ErrorBoundary>
      <Stack gap="md">
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between" mb="lg">
            <Box className="ipam-table-header">
              <Title order={3} mb={5}>
                {tableName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Title>
              <Text color="dimmed" size="sm">Manage your {tableName.replace(/_/g, ' ')} data</Text>
            </Box>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleAddClick}
              radius="md"
              variant="filled"
            >
              Add New
            </Button>
          </Group>

          <Card withBorder p="xs" radius="md" mb="md" bg="gray.0" className="ipam-search-container">
            <form onSubmit={handleSearch}>
              <Group mb="xs" align="flex-end" gap="md">
                <TextInput
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftSection={<IconSearch size={16} />}
                  className="ipam-search-input"
                  style={{ flexGrow: 1 }}
                  radius="md"
                />

                <Select
                  placeholder="Filter by field"
                  value={filterField}
                  onChange={(value) => setFilterField(value || '')}
                  data={filterableFields}
                  clearable
                  leftSection={<IconFilter size={16} />}
                  style={{ width: '200px' }}
                  radius="md"
                  className="ipam-filter-select"
                />

                {filterField && (
                  <TextInput
                    placeholder="Filter value"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    style={{ width: '200px' }}
                    radius="md"
                    className="ipam-filter-input"
                  />
                )}

                <Button type="submit" radius="md" className="ipam-apply-button">Apply Filters</Button>
                <Button variant="outline" onClick={handleClearFilters} radius="md" className="ipam-clear-button">Clear</Button>
                <Tooltip label="Refresh data">
                  <ActionIcon
                    color="blue"
                    variant="light"
                    onClick={() => refetch()}
                    radius="md"
                    size="lg"
                    className="ipam-refresh-button"
                  >
                    <IconRefresh size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </form>
          </Card>

          {isLoading || isLoadingReferenceData ? (
            <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
              <Loader />
            </Box>
          ) : isError ? (
            <Alert color="red" title="Error">
              Failed to load data. Please try again.
            </Alert>
          ) : data?.total === 0 ? (
            <Text ta="center" c="dimmed" py="xl">
              No items found. Try adjusting your filters or add a new item.
            </Text>
          ) : (
            <Box style={{ overflowX: 'auto', width: '100%' }} className="ipam-table-container">
              <StyledTable>
                <TableHeader
                  columns={schema.map(col => col.name)}
                />
                <tbody className="ipam-table-body">
                  {data?.items.map((item) => (
                    <tr key={item.id} className="ipam-table-row">
                      {schema.map(column => (
                        <td key={column.name} className={`ipam-cell ipam-cell-${column.name}`}>
                          {formatTableCell(item, column)}
                        </td>
                      ))}
                      <td className="ipam-cell ipam-cell-actions">
                        <Group gap="xs" justify="flex-end">
                          {customActionsRenderer ? customActionsRenderer(item) : (
                            <>
                              <ActionIcon
                                onClick={() => handleEditClick(item)}
                                variant="subtle"
                                color="blue"
                                title="Edit"
                                className="ipam-action-button"
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                              <ActionIcon
                                onClick={() => handleDeleteClick(item.id)}
                                variant="subtle"
                                color="red"
                                title="Delete"
                                className="ipam-action-button"
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </>
                          )}
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </StyledTable>

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
            </Box>
          )}
        </Card>

        {showModal && (
          <IPAMModal
            show={showModal}
            onHide={handleModalClose}
            tableName={tableName}
            schema={schema}
            item={selectedItem}
          />
        )}
      </Stack>
    </ErrorBoundary>
  );
}
