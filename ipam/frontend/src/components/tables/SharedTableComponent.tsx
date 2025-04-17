import { IPAMTable } from './IPAMTable';
import type { TableName } from '../../types';

interface TableComponentProps {
    tableName: string;
    customActionsRenderer?: (item: any) => React.ReactNode;
}

/**
 * SharedTableComponent - Now uses MRT implementation via IPAMTable wrapper
 * This component now acts as a simple pass-through to the MRT implementation
 * to complete the migration to Mantine React Table
 */
export function SharedTableComponent({ tableName, customActionsRenderer }: TableComponentProps) {
    return (
        <IPAMTable
            tableName={tableName as TableName}
            customActionsRenderer={customActionsRenderer}
        />
    );
} 