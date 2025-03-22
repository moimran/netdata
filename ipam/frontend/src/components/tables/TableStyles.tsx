import React, { CSSProperties } from 'react';
import { Table } from '@mantine/core';
import {
  STATUS_ACTIVE,
  STATUS_RESERVED,
  STATUS_DEPRECATED,
  STATUS_CONTAINER,
  STATUS_DHCP,
  STATUS_SLAAC,
  STATUS_PLANNED,
  STATUS_AVAILABLE,
  STATUS_OFFLINE,
  STATUS_FAILED,
  STATUS_STAGED
} from '../../theme/colors';
import { EnhancedStatusBadge } from '../IPAMTable/statusUtils';

/**
 * IPAM Frontend Centralized Table Styling
 * ---------------------------------------
 * THIS IS THE CENTRAL SOURCE OF TRUTH FOR ALL TABLE STYLING IN THE APPLICATION.
 * All table implementations must use these components and styles for consistency.
 * 
 * For consistent table styling across the application, follow these guidelines:
 * 
 * 1. Always use the StyledTable component instead of directly using Mantine's Table
 *    Example: <StyledTable> ... </StyledTable>
 * 
 * 2. Use TableHeader component for table headers
 *    Example: <TableHeader columns={['Column1', 'Column2']} />
 * 
 * 3. Apply tableStyles.cell to all table cells
 *    Example: <td style={tableStyles.cell}>Content</td>
 * 
 * 4. For action cells, combine tableStyles.cell and tableStyles.actionsCell
 *    Example: <td style={{ ...tableStyles.cell, ...tableStyles.actionsCell }}>Actions</td>
 * 
 * 5. Use StatusBadge for status fields
 *    Example: <StatusBadge status={item.status} />
 * 
 * 6. Include appropriate CSS classes from IPAMTable/styles.css when needed
 *    Example: className="ipam-cell ipam-cell-status"
 * 
 * 7. Import all table-related styling and components from this file:
 *    import { StyledTable, TableHeader, tableStyles, StatusBadge } from './TableStyles';
 */

// Table styles
interface TableStyles {
  table: CSSProperties;
  header: CSSProperties;
  cell: CSSProperties;
  actionsCell: CSSProperties;
  loaderContainer: CSSProperties;
  emptyRow: CSSProperties;
  filterCard: CSSProperties;
  row: CSSProperties;
  headerCell: CSSProperties;
}

// Common table styling
export const tableStyles: TableStyles = {
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed' as const
  },
  row: {
    height: '56px'
  },
  cell: {
    padding: '12px 16px',
    verticalAlign: 'middle' as const,
    overflowX: 'hidden' as const,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: 0,
    borderBottom: '1px solid #e9ecef',
    color: '#f9fafb'
  },
  header: {
    backgroundColor: '#1f2937',
    fontWeight: 600,
    fontSize: '0.85rem',
    padding: '14px 16px',
    textTransform: 'uppercase' as const,
    color: '#f9fafb',
    borderBottom: '1px solid #374151',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const
  },
  headerCell: {
    fontWeight: 600,
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    padding: '12px 16px',
    textAlign: 'left' as const
  },
  actionsCell: {
    display: 'flex',
    justifyContent: 'center',
    width: '120px',
    padding: '8px'
  },
  emptyRow: {
    textAlign: 'center' as const,
    padding: '24px',
    color: '#f9fafb'
  },
  loaderContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px'
  },
  filterCard: {
    backgroundColor: '#25262B',
    borderColor: '#374151',
    color: '#f9fafb'
  }
};

// Status colors for badges - kept for backwards compatibility
const statusBadgeStyles: Record<string, string> = {
  active: STATUS_ACTIVE,
  inactive: STATUS_DEPRECATED,
  reserved: STATUS_RESERVED,
  deprecated: STATUS_DEPRECATED,
  planned: STATUS_PLANNED,
  available: STATUS_AVAILABLE,
  offline: STATUS_OFFLINE,
  failed: STATUS_FAILED,
  staged: STATUS_STAGED,
  dhcp: STATUS_DHCP,
  slaac: STATUS_SLAAC,
  container: STATUS_CONTAINER
};

// Shared table component
export function StyledTable({ children, className }: { children: React.ReactNode, className?: string }) {
  const tableStyle = {
    ...tableStyles.table,
    display: 'table',
    width: '100%',
    tableLayout: 'fixed' as const,
    backgroundColor: '#1A1B1E',
    color: '#f9fafb'
  };

  return (
    <Table striped highlightOnHover style={tableStyle} className={`ipam-styled-table ${className || ''}`}>
      {children}
    </Table>
  );
}

// Helper function to format column headers consistently
const formatColumnHeader = (column: string): string => {
  // Special case for ID fields
  if (column === 'id') return 'ID';

  // Special cases for IP/network fields
  if (column === 'address') return 'IP Address';
  if (column === 'start_address') return 'Start Address';
  if (column === 'end_address') return 'End Address';
  if (column === 'prefix') return 'Prefix';
  if (column === 'dns_name') return 'DNS Name';

  // ASN specific fields
  if (column === 'asn') return 'ASN';

  // VLAN specific fields
  if (column === 'vid') return 'VLAN ID';
  if (column === 'group_id') return 'VLAN Group';

  // Credential specific fields
  if (column === 'enable_password') return 'Enable Password';
  if (column === 'is_default') return 'Default';
  if (column === 'credential_name') return 'Credential';
  if (column === 'fallback_credential_name') return 'Fallback Credential';

  // Device specific fields
  if (column === 'ip_address_id') return 'IP Address';

  // VRF specific fields
  if (column === 'rd') return 'Route Distinguisher';
  if (column === 'enforce_unique') return 'Enforce Unique';

  // Special cases for boolean fields
  if (column === 'is_pool') return 'Pool';
  if (column === 'mark_utilized') return 'Utilized';

  // Reference fields should be displayed in a consistent way
  if (column.endsWith('_id')) {
    const prefix = column.substring(0, column.length - 3);
    const formattedPrefix = prefix
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `${formattedPrefix}`;
  }

  // For other columns, capitalize each word
  return column
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Shared table header component
export interface TableHeaderProps {
  columns?: string[];
  children?: React.ReactNode;
  tableName?: string;
}

export function TableHeader({ columns, children, tableName }: TableHeaderProps) {
  const headerStyle = {
    ...tableStyles.headerCell,
    display: 'table-cell',
    whiteSpace: 'nowrap' as const,
    textAlign: 'left' as const
  };

  // If this is being used with direct children, just render the children
  if (children !== undefined) {
    return (
      <th style={headerStyle} className="ipam-header">
        {children}
      </th>
    );
  }

  // If no columns or children are provided, return null
  if (!columns || columns.length === 0) {
    return null;
  }

  // Check if 'actions' column is already included
  const hasActionsColumn = columns.some(col => col.toLowerCase() === 'actions');

  // Otherwise, render the header row with columns
  return (
    <thead style={{ display: 'table-header-group' }}>
      <tr style={{ display: 'table-row' }}>
        {columns.map((col) => {
          // Special styling for actions column
          if (col.toLowerCase() === 'actions') {
            return (
              <th
                key={col}
                style={{ ...headerStyle, ...tableStyles.actionsCell }}
                className="ipam-header ipam-header-actions"
              >
                {formatColumnHeader(col)}
              </th>
            );
          }

          // Regular column styling
          return (
            <th key={col} style={headerStyle} className={`ipam-header ipam-header-${col}`}>
              {formatColumnHeader(col)}
            </th>
          );
        })}

        {/* Only add the Actions column if it's not already included */}
        {!hasActionsColumn && (
          <th
            style={{ ...headerStyle, ...tableStyles.actionsCell }}
            className="ipam-header ipam-header-actions"
          >
            Actions
          </th>
        )}
      </tr>
    </thead>
  );
}

// Shared status badge component
export function StatusBadge({ status }: { status: string }) {
  return <EnhancedStatusBadge status={status} />;
}
