// Re-export UnifiedTable for backward compatibility
import UnifiedTable from './UnifiedTable';
import type { TableName } from '../../types';

// Props interface that matches the original IPAMTable
interface IPAMTableProps {
    tableName: TableName;
    customActionsRenderer?: (item: any) => React.ReactNode;
}

/**
 * IPAMTable - Now uses UnifiedTable internally
 * This component is maintained for backward compatibility
 * New code should use UnifiedTable directly
 */
export function IPAMTable({ tableName, customActionsRenderer }: IPAMTableProps) {
    console.warn('IPAMTable is deprecated. Please use UnifiedTable instead.');
    return (
        <UnifiedTable
            tableName={tableName}
            customActionsRenderer={customActionsRenderer}
        />
    );
}

// Re-export schemas for compatibility
export { TABLE_SCHEMAS } from '../IPAMTable/schemas';

// Re-export UnifiedTable as default for compatibility
export default UnifiedTable;
