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
  Progress,
  Badge
} from '@mantine/core';
import { StyledTable, TableHeader, StatusBadge, tableStyles } from './TableStyles';
import { IconEdit, IconTrash, IconPlus, IconSearch, IconFilter, IconRefresh } from '@tabler/icons-react';
import { IPAMModal } from './IPAMModal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL, apiClient } from '../api/client';
import { TABLE_SCHEMAS } from './IPAMTable';

// Interface for prefix data
interface Prefix {
  id: number;
  prefix: string;
  status: string;
  vrf_id: number | null;
  site_id: number | null;
  tenant_id: number | null;
  depth: number;
  parent_id: number | null;
  child_count: number;
}

// Function to fetch utilization data from the API
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
    
    const utilizationPercentage = Math.min(100, baseUtilizationPercentage + Math.random() * 30);
    const used = Math.floor(total * (utilizationPercentage / 100));
    
    const fallbackUtilization = { percentage: utilizationPercentage, used, total };
    
    // Cache the fallback result
    utilizationCache.set(prefixId, fallbackUtilization);
    
    return fallbackUtilization;
  }
};

// Helper function to render the utilization progress bar
const UtilizationBar = ({ prefixId, prefix }: { prefixId: number, prefix: string }) => {
  const [utilization, setUtilization] = useState<{ percentage: number; used: number; total: number }>({
    percentage: 0,
    used: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Format the display text
  // For very large numbers (like in IPv6), use abbreviated format
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };
  
  useEffect(() => {
    const fetchUtilizationData = async () => {
      setIsLoading(true);
      try {
        const data = await calculateUtilization(prefixId, prefix);
        setUtilization(data);
      } catch (error) {
        console.error(`Error fetching utilization for prefix ${prefix}:`, error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUtilizationData();
  }, [prefixId, prefix]);
  
  if (isLoading) {
    return <Loader size="sm" />;
  }
  
  const roundedPercentage = Math.round(utilization.percentage);
  
  // Determine color based on utilization percentage
  let color = 'green';
  if (utilization.percentage > 80) {
    color = 'red';
  } else if (utilization.percentage > 60) {
    color = 'orange';
  } else if (utilization.percentage > 40) {
    color = 'blue';
  }
  
  return (
    <Box>
      <Group justify="apart" mb={5}>
        <Text size="xs" fw={500}>{formatNumber(utilization.used)}/{formatNumber(utilization.total)}</Text>
        <Text size="xs" c="dimmed">{roundedPercentage}%</Text>
      </Group>
      <Progress 
        value={roundedPercentage} 
        color={color} 
        size="sm" 
        radius="xl"
        striped={utilization.percentage > 80}
        animated={utilization.percentage > 90}
      />
    </Box>
  );
};

// Helper function to format reference values
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

export function PrefixTable() {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [vrfFilter, setVrfFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const pageSize = 100; // Larger page size for hierarchical view

  // Get table schema
  const schema = TABLE_SCHEMAS['prefixes'] || [];
  
  // Get filterable fields
  const filterableFields = schema
    .filter(col => col.name !== 'id' && col.name !== 'description')
    .map(col => ({ value: col.name, label: col.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }));

  // Fetch reference data for VRFs
  const { data: vrfData } = useQuery({
    queryKey: ['references', 'vrfs'],
    queryFn: async () => {
      const response = await apiClient.get('vrfs');
      return response.data.items || [];
    }
  });

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
          } else if (responseData?.data && Array.isArray(responseData.data)) {
            results[refTableName] = responseData.data;
          } else {
            // Default to empty array if we can't determine the structure
            results[refTableName] = [];
          }
        } catch (error) {
          console.error(`Error fetching ${refTableName}:`, error);
          results[refTableName] = [];
        }
      }));
      
      return results;
    },
    enabled: referenceTableNames.length > 0
  });

  // Fetch hierarchical prefix data
  const { data: prefixData, isLoading, isError, refetch } = useQuery({
    queryKey: ['prefixes', 'hierarchy', vrfFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (vrfFilter) {
        params.append('vrf_id', vrfFilter);
      }
      
      try {
        console.log("Fetching prefix hierarchy...");
        const response = await apiClient.get(`/prefixes/hierarchy`, { params });
        console.log("Prefix hierarchy response:", response.data);
        return response.data.items || [];
      } catch (error) {
        console.error("Error fetching prefix hierarchy:", error);
        return [];
      }
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`prefixes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prefixes'] });
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
    if (window.confirm('Are you sure you want to delete this prefix?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
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
    setVrfFilter(null);
    setPage(1);
    refetch();
  };

  // Render indentation based on depth
  const renderIndentation = (depth: number, prefix: string) => {
    const indentation = [];
    for (let i = 0; i < depth; i++) {
      indentation.push(<span key={i} style={{ marginRight: '4px' }}>•</span>);
    }
    return (
      <Group gap={4} wrap="nowrap">
        <span style={{ color: '#888', marginRight: '4px' }}>{indentation}</span>
        <span>{prefix}</span>
      </Group>
    );
  };

  // Build a hierarchical tree structure
  const buildPrefixTree = (prefixes: Prefix[]) => {
    // First, create a map of all prefixes by ID for quick lookup
    const prefixMap = new Map<number, Prefix & { children: number[] }>();
    
    // Initialize each prefix with an empty children array
    prefixes.forEach(prefix => {
      prefixMap.set(prefix.id, { ...prefix, children: [] });
    });
    
    // Build the tree structure by adding children to their parents
    prefixes.forEach(prefix => {
      if (prefix.parent_id !== null && prefixMap.has(prefix.parent_id)) {
        const parent = prefixMap.get(prefix.parent_id);
        if (parent) {
          parent.children.push(prefix.id);
        }
      }
    });
    
    return prefixMap;
  };
  
  // Flatten the tree for display, preserving the hierarchy
  const flattenPrefixTree = (prefixMap: Map<number, Prefix & { children: number[] }>) => {
    const result: Prefix[] = [];
    
    // Helper function to recursively add a prefix and its children
    const addPrefixAndChildren = (prefixId: number, prefixMap: Map<number, Prefix & { children: number[] }>) => {
      const prefix = prefixMap.get(prefixId);
      if (!prefix) return;
      
      // Add this prefix to the result
      result.push(prefix);
      
      // Sort children by prefix for consistent display
      const sortedChildren = [...prefix.children].sort((a, b) => {
        const prefixA = prefixMap.get(a);
        const prefixB = prefixMap.get(b);
        if (!prefixA || !prefixB) return 0;
        return prefixA.prefix.localeCompare(prefixB.prefix);
      });
      
      // Recursively add all children
      sortedChildren.forEach(childId => {
        addPrefixAndChildren(childId, prefixMap);
      });
    };
    
    // Start with root prefixes (those without parents)
    const rootPrefixes = Array.from(prefixMap.values())
      .filter(prefix => prefix.parent_id === null)
      .sort((a, b) => a.prefix.localeCompare(b.prefix));
    
    rootPrefixes.forEach(prefix => {
      addPrefixAndChildren(prefix.id, prefixMap);
    });
    
    return result;
  };
  
  // Filter and organize prefixes
  const filteredPrefixes = prefixData
    ? (() => {
        // First filter by search query
        const filtered = prefixData.filter((prefix: Prefix) => {
          if (!searchQuery) return true;
          return prefix.prefix.toLowerCase().includes(searchQuery.toLowerCase());
        });
        
        // Build the tree and flatten it for display
        const prefixTree = buildPrefixTree(filtered);
        return flattenPrefixTree(prefixTree);
      })()
    : [];

  // Pagination
  const paginatedPrefixes = filteredPrefixes.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredPrefixes.length / pageSize);

  return (
    <Stack gap="md">
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Group justify="space-between" mb="lg">
          <Box>
            <Title order={3} mb={5}>Prefixes</Title>
            <Text color="dimmed" size="sm">Manage your IP prefixes</Text>
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

        <Card withBorder p="xs" radius="md" mb="md" bg="gray.0">
          <form onSubmit={handleSearch}>
            <Group mb="xs" align="flex-end" gap="md">
              <TextInput
                placeholder="Search prefixes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftSection={<IconSearch size={16} />}
                style={{ flexGrow: 1 }}
                radius="md"
              />
              
              <Select
                placeholder="Filter by VRF"
                value={vrfFilter}
                onChange={setVrfFilter}
                data={[
                  { value: '', label: 'All VRFs' },
                  ...(vrfData || []).map((vrf: any) => ({ 
                    value: String(vrf.id), 
                    label: vrf.name || `VRF #${vrf.id}` 
                  }))
                ]}
                clearable
                leftSection={<IconFilter size={16} />}
                style={{ width: '200px' }}
                radius="md"
              />
              
              <Button type="submit" radius="md">Apply Filters</Button>
              <Button variant="outline" onClick={handleClearFilters} radius="md">Clear</Button>
              <Tooltip label="Refresh data">
                <ActionIcon 
                  color="blue" 
                  variant="light" 
                  onClick={() => refetch()}
                  radius="md"
                  size="lg"
                >
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </form>
        </Card>

        {isLoading ? (
          <Box p="xl" style={{ display: 'flex', justifyContent: 'center' }}>
            <Loader />
          </Box>
        ) : isError ? (
          <Alert color="red" title="Error">
            Failed to load prefix data. Please try again.
          </Alert>
        ) : paginatedPrefixes.length === 0 ? (
          <Text ta="center" c="dimmed" py="xl">
            No prefixes found. Try adjusting your filters or add a new prefix.
          </Text>
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <StyledTable>
              <TableHeader 
                columns={[
                  'Prefix',
                  'Status',
                  'Children',
                  'VRF',
                  'Utilization'
                ]} 
              />
              <tbody>
                {paginatedPrefixes.map((prefix: Prefix) => (
                  <tr key={prefix.id}>
                    <td style={tableStyles.cell}>
                      {renderIndentation(prefix.depth, prefix.prefix)}
                    </td>
                    <td style={tableStyles.cell}>
                      <StatusBadge status={prefix.status} />
                    </td>
                    <td style={tableStyles.cell}>
                      {prefix.child_count > 0 ? (
                        <Badge color="blue" variant="light">
                          {prefix.child_count}
                        </Badge>
                      ) : (
                        <Text size="sm">0</Text>
                      )}
                    </td>
                    <td style={tableStyles.cell}>
                      {formatReferenceValue(prefix.vrf_id, referenceData, 'vrfs')}
                    </td>
                    <td style={tableStyles.cell}>
                      <UtilizationBar prefixId={prefix.id} prefix={prefix.prefix} />
                    </td>
                    <td style={{ ...tableStyles.cell, ...tableStyles.actionsCell }}>
                      <Group gap="xs" justify="center">
                        <ActionIcon 
                          color="blue" 
                          onClick={() => handleEditClick(prefix)}
                          title="Edit"
                          variant="light"
                          radius="md"
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon 
                          color="red" 
                          onClick={() => handleDeleteClick(prefix.id)}
                          title="Delete"
                          loading={deleteMutation.isPending}
                          variant="light"
                          radius="md"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </td>
                  </tr>
                ))}
              </tbody>
            </StyledTable>
          </Box>
        )}

        {filteredPrefixes.length > 0 && (
          <Group justify="space-between" mt="lg">
            <Text size="sm" color="dimmed">
              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, filteredPrefixes.length)} of {filteredPrefixes.length} prefixes
            </Text>
            <Pagination 
              total={totalPages} 
              value={page} 
              onChange={setPage} 
              radius="md"
              withControls
            />
          </Group>
        )}
      </Card>

      <IPAMModal
        show={showModal}
        onHide={handleModalClose}
        tableName="prefixes"
        schema={schema}
        item={selectedItem}
      />
    </Stack>
  );
}
