import { useState, useMemo, useCallback, memo } from 'react';
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
  Alert
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

// Extracted table header component
const TableFilterBar = memo(({
  tableName,
  filterableFields,
  filterField,
  setFilterField,
  filterValue,
  setFilterValue,
  searchQuery,
  setSearchQuery,
  handleSearch,
  handleClearFilters,
  handleAddClick,
  isLoading,
  refetch
}: {
  tableName: string;
  filterableFields: { value: string, label: string }[];
  filterField: string;
  setFilterField: (value: string) => void;
  filterValue: string;
  setFilterValue: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  handleClearFilters: () => void;
  handleAddClick: () => void;
  isLoading: boolean;
  refetch: () => void;
}) => {
  // Format table name for display (capitalize, convert from camelCase or snake_case)
  const displayTableName = tableName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <Card mb="md" padding="md" style={{ backgroundColor: '#25262B', borderColor: '#374151' }}>
      <Group justify="space-between" mb="xs">
        <Title order={3} c="#f9fafb">{displayTableName}</Title>
        <Group>
          <ActionIcon
            color="blue"
            variant="light"
            onClick={refetch}
            loading={isLoading}
            title="Refresh data"
          >
            <IconRefresh size={16} />
          </ActionIcon>
          <Button
            variant="filled"
            leftSection={<IconPlus size={16} />}
            onClick={handleAddClick}
            size="xs"
            color="teal"
          >
            Add
          </Button>
        </Group>
      </Group>

      <form onSubmit={handleSearch}>
        <Group>
          <TextInput
            placeholder="Search..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flexGrow: 1 }}
            size="xs"
            bg="#1A1B1E"
            c="#f9fafb"
          />
          <Select
            placeholder="Filter field"
            data={filterableFields}
            value={filterField}
            onChange={(value) => setFilterField(value || '')}
            clearable
            size="xs"
            style={{ width: 150 }}
            bg="#1A1B1E"
            c="#f9fafb"
          />
          <TextInput
            placeholder="Filter value"
            disabled={!filterField}
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            size="xs"
            style={{ width: 150 }}
            bg="#1A1B1E"
            c="#f9fafb"
          />
          <Button type="submit" variant="outline" size="xs" color="blue">
            Apply
          </Button>
          <Button variant="subtle" onClick={handleClearFilters} size="xs" color="gray">
            Clear
          </Button>
        </Group>
      </form>
    </Card>
  );
});

// Extracted table actions component
const TableActions = memo(({
  item,
  handleEditClick,
  handleDeleteClick,
  customActionsRenderer
}: {
  item: any;
  handleEditClick: (item: any) => void;
  handleDeleteClick: (id: number) => void;
  customActionsRenderer?: (item: any) => React.ReactNode;
}) => (
  <Group gap={4} style={{ justifyContent: 'center' }}>
    {/* Standard edit action */}
    <Tooltip label="Edit">
      <ActionIcon
        color="blue"
        variant="light"
        onClick={() => handleEditClick(item)}
      >
        <IconEdit size={16} />
      </ActionIcon>
    </Tooltip>

    {/* Standard delete action */}
    <Tooltip label="Delete">
      <ActionIcon
        color="red"
        variant="light"
        onClick={() => handleDeleteClick(item.id)}
      >
        <IconTrash size={16} />
      </ActionIcon>
    </Tooltip>

    {/* Custom actions provided by the table implementation */}
    {customActionsRenderer && customActionsRenderer(item)}
  </Group>
));

// Reusable utilization bar component
const UtilizationBar = memo(({ prefixId, prefix }: { prefixId: number, prefix: string }) => {
  // Implementation from the original component
  return renderUtilizationBar(prefixId, prefix);
});

// Main component with memoized handlers and optimizations
export const IPAMTable = memo(function IPAMTable({ tableName, customActionsRenderer }: IPAMTableProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const pageSize = 10;

  // Get table schema
  const schema = useMemo(() => TABLE_SCHEMAS[tableName] || [], [tableName]);

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

  // Fetch table data using the memoized hook
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

  // Memoized handlers using useCallback
  const handleAddClick = useCallback(() => {
    setSelectedItem(null);
    setShowModal(true);
  }, []);

  const handleEditClick = useCallback((item: any) => {
    setSelectedItem(item);
    setShowModal(true);
  }, []);

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

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    refetch();
  }, [refetch]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterField('');
    setFilterValue('');
    setPage(1);
    refetch();
  }, [refetch]);

  const formatReferenceValue = useCallback((value: number | null, referenceData: Record<string, any[]>, referenceTable: string): string => {
    if (value === null) return '';

    const referencedItem = referenceData[referenceTable]?.find(item => item.id === value);

    if (referencedItem) {
      // Try to use display_name, name, or id in that order
      return referencedItem.display_name || referencedItem.name || `${value}`;
    }

    return `${value}`;
  }, []);

  const formatTableCell = useCallback((item: any, column: any) => {
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

    // Special formatting for credential fields
    if ((column.name === 'password' || column.name === 'enable_password') && tableName === 'credentials') {
      return '••••••••';
    }

    // Special formatting for boolean fields
    if (column.type === 'boolean') {
      return item[column.name] ? 'Yes' : 'No';
    }

    // ASN field formatting
    if (column.name === 'asn') {
      return `AS${item[column.name]}`;
    }

    // Use the generic formatter for all other fields
    return formatCellValue(item[column.name], column.type);
  }, [formatReferenceValue, referenceData, tableName]);

  // Apply consistent CSS classes for column styling
  const getColumnTypeClass = (column: any, value: any): string => {
    // Reference type class
    if (column.reference) return 'reference';

    // Boolean type class
    if (column.type === 'boolean') return 'boolean';

    // Special field type classes
    if (column.name === 'asn') return 'asn';
    if (column.name === 'vid') return 'vid';
    if (column.name === 'address' ||
      column.name === 'prefix' ||
      column.name === 'start_address' ||
      column.name === 'end_address' ||
      column.name === 'rd') return 'network';

    // Username/password fields
    if (column.name === 'username' ||
      column.name === 'password' ||
      column.name === 'enable_password') return 'credential';

    // Default to the column type
    return column.type || 'string';
  };

  // Format table name for display
  const formatTableName = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isError) {
    return (
      <Alert color="red" title="Error">
        Failed to load data. Please try again later.
      </Alert>
    );
  }

  return (
    <ErrorBoundary>
      <Stack>
        <TableFilterBar
          tableName={tableName}
          filterableFields={filterableFields}
          filterField={filterField}
          setFilterField={setFilterField}
          filterValue={filterValue}
          setFilterValue={setFilterValue}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleSearch={handleSearch}
          handleClearFilters={handleClearFilters}
          handleAddClick={handleAddClick}
          isLoading={isLoading}
          refetch={refetch}
        />

        <Card padding="xs" style={{ backgroundColor: '#1A1B1E', borderColor: '#374151' }}>
          {isLoading || isLoadingReferenceData ? (
            <div style={tableStyles.loaderContainer}>
              <Loader color="teal" />
            </div>
          ) : (
            <>
              <Box className="ipam-table-container">
                <StyledTable>
                  <TableHeader
                    columns={schema.map(column => column.name)}
                    tableName={tableName}
                  />
                  <tbody className="ipam-table-body">
                    {data?.items && data.items.length > 0 ? (
                      data.items.map((item, rowIndex) => (
                        <tr key={rowIndex} className="ipam-table-row" style={tableStyles.row}>
                          {schema.map((column, colIndex) => {
                            const cellContent = formatTableCell(item, column);
                            const cellValue = typeof cellContent === 'string' ? cellContent : column.name === 'status' ? item[column.name] : '';

                            // Apply consistent CSS classes for column styling
                            const typeClass = getColumnTypeClass(column, cellContent);

                            return (
                              <td
                                key={colIndex}
                                style={tableStyles.cell}
                                className={`ipam-cell ipam-cell-${column.name} ipam-cell-type-${typeClass}`}
                                title={cellValue}
                              >
                                {cellContent}
                              </td>
                            );
                          })}
                          <td
                            style={{ ...tableStyles.cell }}
                            className="ipam-cell ipam-cell-actions"
                          >
                            <TableActions
                              item={item}
                              handleEditClick={handleEditClick}
                              handleDeleteClick={handleDeleteClick}
                              customActionsRenderer={customActionsRenderer}
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={schema.length + 1} style={tableStyles.emptyRow}>
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </StyledTable>
              </Box>

              {data?.total && data.total > pageSize && (
                <Group justify="right" mt="md">
                  <Pagination
                    total={Math.ceil(data.total / pageSize)}
                    value={page}
                    onChange={setPage}
                    color="teal"
                  />
                </Group>
              )}
            </>
          )}
        </Card>

        {showModal && (
          <IPAMModal
            tableName={tableName}
            data={selectedItem}
            onClose={handleModalClose}
          />
        )}
      </Stack>
    </ErrorBoundary>
  );
});

// Default export
export default IPAMTable;
