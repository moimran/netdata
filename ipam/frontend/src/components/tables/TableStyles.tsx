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

// Shared status badge component
export function StatusBadge({ status }: { status: string }) {
  return <EnhancedStatusBadge status={status} />;
}
