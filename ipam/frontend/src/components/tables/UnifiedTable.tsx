import IPAMTableMRT from '../IPAMTable/IPAMTableMRT';
import type { TableName } from '../../types';

/**
 * UnifiedTable - A consolidated table component that replaces both IPAMTable and SharedTableComponent
 * This provides a single, consistent interface for all tables in the application
 */
interface UnifiedTableProps {
    tableName: string | TableName;
    customActionsRenderer?: (item: any) => React.ReactNode;
}

export function UnifiedTable({ tableName, customActionsRenderer }: UnifiedTableProps) {
    return (
        <IPAMTableMRT
            tableName={tableName as TableName}
            customActionsRenderer={customActionsRenderer}
        />
    );
}

// Re-export schemas for compatibility
export { TABLE_SCHEMAS } from '../IPAMTable/schemas';

// Default export
export default UnifiedTable;
