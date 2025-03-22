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
  Alert,
  Badge,
  Table
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
}) => (
  <Card mb="md" padding="md" style={tableStyles.filterCard}>
    <Group position="apart" mb="xs">
      <Title order={4}>Filters</Title>
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
          leftIcon={<IconPlus size={16} />}
          onClick={handleAddClick}
          size="xs"
        >
          Add
        </Button>
      </Group>
    </Group>

    <form onSubmit={handleSearch}>
      <Group>
        <TextInput
          placeholder="Search..."
          icon={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flexGrow: 1 }}
          size="xs"
        />
        <Select
          placeholder="Filter field"
          data={filterableFields}
          value={filterField}
          onChange={(value) => setFilterField(value || '')}
          clearable
          size="xs"
          style={{ width: 150 }}
        />
        <TextInput
          placeholder="Filter value"
          disabled={!filterField}
          value={filterValue}
          onChange={(e) => setFilterValue(e.target.value)}
          size="xs"
          style={{ width: 150 }}
        />
        <Button type="submit" variant="outline" size="xs">
          Apply
        </Button>
        <Button variant="subtle" onClick={handleClearFilters} size="xs">
          Clear
        </Button>
      </Group>
    </form>
  </Card>
));

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
  <Group spacing={4}>
    <Tooltip label="Edit">
      <ActionIcon
        color="blue"
        variant="light"
        onClick={() => handleEditClick(item)}
      >
        <IconEdit size={16} />
      </ActionIcon>
    </Tooltip>
    <Tooltip label="Delete">
      <ActionIcon
        color="red"
        variant="light"
        onClick={() => handleDeleteClick(item.id)}
      >
        <IconTrash size={16} />
      </ActionIcon>
    </Tooltip>
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

    // Use the generic formatter for all other fields
    return formatCellValue(item[column.name], column.type);
  }, [formatReferenceValue, referenceData, tableName]);

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

        <Card padding="xs">
          {isLoading || isLoadingReferenceData ? (
            <div style={tableStyles.loaderContainer}>
              <Loader />
            </div>
          ) : (
            <>
              <StyledTable>
                <TableHeader
                  columns={schema.map(column => column.name)}
                />
                <tbody>
                  {data?.items && data.items.length > 0 ? (
                    data.items.map((item, rowIndex) => (
                      <tr key={rowIndex}>
                        {schema.map((column, colIndex) => (
                          <td key={colIndex} style={tableStyles.cell}>
                            {formatTableCell(item, column)}
                          </td>
                        ))}
                        <td style={{ ...tableStyles.cell, ...tableStyles.actionsCell }}>
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

              {data?.total && data.total > pageSize && (
                <Group position="right" mt="md">
                  <Pagination
                    total={Math.ceil(data.total / pageSize)}
                    value={page}
                    onChange={setPage}
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
