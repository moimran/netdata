import UnifiedTable from '../tables/UnifiedTable';
import TableContainer from '../tables/TableContainer';
import type { TableName } from '../../types';

interface IPAMViewProps {
  tableName: TableName;
}

/**
 * IPAMView - A consistent wrapper component for tables
 * Provides consistent styling and layout for all table views
 */
export function IPAMView({ tableName }: IPAMViewProps) {
  // Format table name for display (from kebab or snake case to Title Case)
  const formattedTitle = tableName
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <TableContainer title={formattedTitle}>
      <UnifiedTable tableName={tableName} />
    </TableContainer>
  );
}
