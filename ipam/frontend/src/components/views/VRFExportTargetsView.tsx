import { useMemo } from 'react'; 
import { useParams } from 'react-router-dom'; 
import { useVRFRouteTargets } from '../../hooks/api/useVRFData'; 
import { TABLE_SCHEMAS, type Column } from '../IPAMTable/schemas'; 
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef } from 'mantine-react-table'; 

// Define formatHeaderName locally
const formatHeaderName = (name: string): string => {
  return name.split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
};

export default function VRFExportTargetsView() {
  const { vrfId } = useParams<{ vrfId: string }>(); 
  
  // Fetch export targets using the hook
  const { data: exportTargets, isLoading, error } = useVRFRouteTargets(vrfId, 'export'); 

  // Define columns for MantineReactTable
  const columns = useMemo<MRT_ColumnDef<any>[]>(() => 
    (TABLE_SCHEMAS['route_targets'] || []).map((col: Column) => ({ 
      accessorKey: col.name,
      header: formatHeaderName(col.name),
      size: col.width,
    })),
    []
  );

  if (isLoading) return <div>Loading export targets...</div>; 
  if (error) return <div>Error loading export targets: {error.message}</div>;

  // Setup the table instance
  const table = useMantineReactTable({
    columns,
    data: exportTargets || [], 
    enablePagination: true,
    enableSorting: true,
    initialState: { density: 'xs' },
    mantineTableProps: {
      striped: true,
      withTableBorder: true,
    },
  });

  return (
    <div>
      <h2>Export Targets for VRF {vrfId}</h2>
      {/* Render the MantineReactTable component */}
      <MantineReactTable table={table} />
    </div>
  );
}