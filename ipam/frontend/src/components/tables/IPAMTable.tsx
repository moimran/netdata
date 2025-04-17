// Migration wrapper for Mantine React Table
// This ensures backward compatibility with existing imports
import IPAMTableMRT from '../IPAMTable/IPAMTableMRT';
import type { TableName } from '../../types';

// Props interface that matches the original IPAMTable
interface IPAMTableProps {
    tableName: TableName;
    customActionsRenderer?: (item: any) => React.ReactNode;
}

// Wrapper component that uses IPAMTableMRT internally
export function IPAMTable({ tableName, customActionsRenderer }: IPAMTableProps) {
    return (
        <IPAMTableMRT
            tableName={tableName}
            customActionsRenderer={customActionsRenderer}
        />
    );
}

// Re-export schemas for compatibility
export { TABLE_SCHEMAS } from '../IPAMTable/schemas';

// Default export for compatibility
export default IPAMTable;
