import UnifiedTable from './UnifiedTable';
import type { TableName } from '../../types';

interface TableComponentProps {
    tableName: string;
    customActionsRenderer?: (item: any) => React.ReactNode;
}

/**
 * SharedTableComponent - Now uses UnifiedTable internally
 * This component is maintained for backward compatibility
 * New code should use UnifiedTable directly
 */
export function SharedTableComponent({ tableName, customActionsRenderer }: TableComponentProps) {
    console.warn('SharedTableComponent is deprecated. Please use UnifiedTable instead.');
    return (
        <UnifiedTable
            tableName={tableName as TableName}
            customActionsRenderer={customActionsRenderer}
        />
    );
}

// Re-export UnifiedTable as default for compatibility
export default UnifiedTable;