import React from 'react';
import { EnhancedStatusBadge } from '../IPAMTable/statusUtils';

/**
 * IPAM Frontend Table Styling - DEPRECATED
 * ---------------------------------------
 * IMPORTANT: Most of the components in this file are deprecated.
 * 
 * Please use the UnifiedTable component for all table needs:
 * import { UnifiedTable } from '../components/tables';
 * 
 * The only component that should still be used from this file is StatusBadge:
 * import { StatusBadge } from './TableStyles';
 * 
 * For styling, use the unified-table-styles.css file which is automatically
 * imported when using the UnifiedTable component.
 */

// DEPRECATED: These styles are no longer used and are kept only for backward compatibility
// Please use the unified-table-styles.css for all styling needs
export const tableStyles = {
  // This is intentionally left empty as a stub for backward compatibility
  table: {},
  header: {},
  headerCell: {},
  cell: {},
  actionsCell: {},
  statusCell: {},
  row: {},
  emptyRow: {},
  loaderContainer: {},
  filterCard: {}
};

// DEPRECATED: This component is no longer used and is kept only for backward compatibility
export function StyledTable({ children, className }: { children: React.ReactNode; className?: string }) {
  console.warn('StyledTable is deprecated. Please use UnifiedTable from "../components/tables" instead.');
  return <div className={className}>{children}</div>;
}

// DEPRECATED: This component is no longer used and is kept only for backward compatibility
export function TableHeader({ columns, children }: { columns?: string[]; children?: React.ReactNode; tableName?: string }) {
  console.warn('TableHeader is deprecated. Please use UnifiedTable from "../components/tables" instead.');
  return <>{children || columns?.map((col, i) => <div key={i}>{col}</div>)}</>;
}

// Shared status badge component
export function StatusBadge({ status }: { status: string }) {
  return <EnhancedStatusBadge status={status} />;
}
