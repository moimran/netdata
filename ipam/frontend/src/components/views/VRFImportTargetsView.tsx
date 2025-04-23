import { useMemo } from 'react';
import { useParams } from 'react-router-dom'; 
import { useVRFRouteTargets } from '../../hooks/api/useVRFData'; 
import { TABLE_SCHEMAS, type Column } from '../IPAMTable/schemas'; 
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef } from 'mantine-react-table'; 

const formatHeaderName = (name: string): string => {
  return name.split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
};

export default function VRFImportTargetsView() {
  const { vrfId } = useParams<{ vrfId: string }>(); 
  
  const { data: importTargets, isLoading, error } = useVRFRouteTargets(vrfId, 'import');
  
  const columns = useMemo<MRT_ColumnDef<any>[]>(() => 
    (TABLE_SCHEMAS['route_targets'] || []).map((col: Column) => ({ 
      accessorKey: col.name,
      header: formatHeaderName(col.name),
      size: col.width,
    })),
    []
  );
  
  if (isLoading) return <div>Loading import targets...</div>;
  if (error) return <div>Error loading import targets: {error.message}</div>;
  
  const table = useMantineReactTable({
    columns,
    data: importTargets || [], 
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
      <h2>Import Targets for VRF {vrfId}</h2>
      <MantineReactTable table={table} />
    </div>
  );
}