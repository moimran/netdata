import React, { CSSProperties } from 'react';
import { Table, Badge } from '@mantine/core';
import {
  DARK_BG,
  DARK_CARD_BG,
  DARK_BORDER,
  TEXT_SECONDARY,
  TEXT_PRIMARY,
  STATUS_ACTIVE,
  STATUS_RESERVED,
  STATUS_DEPRECATED,
  STATUS_CONTAINER,
  STATUS_DHCP,
  STATUS_SLAAC
} from '../theme/colors';

/**
 * Table Styling Standards for IPAM Frontend
 * -----------------------------------------
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
 */

// Status colors for badges
const STATUS_PLANNED = 'yellow';
const STATUS_AVAILABLE = 'teal';
const STATUS_OFFLINE = 'gray';
const STATUS_FAILED = 'red';
const STATUS_STAGED = 'orange';

// Table styles
interface TableStyles {
  table: CSSProperties;
  header: CSSProperties;
  cell: CSSProperties;
  actionsCell: CSSProperties;
  loaderContainer: CSSProperties;
  emptyRow: CSSProperties;
  filterCard: CSSProperties;
}

// Shared table styles - Dark Theme
export const tableStyles: TableStyles = {
  table: {
    borderCollapse: 'collapse' as const,
    width: '100%',
    backgroundColor: DARK_BG,
    color: TEXT_SECONDARY,
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'table'
  },
  header: {
    backgroundColor: DARK_CARD_BG,
    fontWeight: 600,
    fontSize: '0.85rem',
    padding: '14px 16px',
    textTransform: 'uppercase' as const,
    color: TEXT_PRIMARY,
    borderBottom: `1px solid ${DARK_BORDER}`
  },
  cell: {
    padding: '12px 16px',
    borderBottom: `1px solid ${DARK_BORDER}`,
    fontSize: '0.9rem'
  },
  actionsCell: {
    width: '100px',
    textAlign: 'center' as const
  },
  loaderContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '50px 0'
  },
  emptyRow: {
    textAlign: 'center',
    padding: '20px 0',
    color: '#909296'
  },
  filterCard: {
    backgroundColor: '#25262B',
    border: '1px solid #373A40'
  }
};

// Status badge styles mapping
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
  slaac: STATUS_SLAAC
};

// Shared table component
export function StyledTable({ children, className }: { children: React.ReactNode, className?: string }) {
  const tableStyle = {
    ...tableStyles.table,
    display: 'table',
    width: '100%',
    tableLayout: 'auto' as const
  };

  return (
    <Table striped highlightOnHover style={tableStyle} className={`ipam-styled-table ${className || ''}`}>
      {children}
    </Table>
  );
}

// Shared table header component
export interface TableHeaderProps {
  columns?: string[];
  children?: React.ReactNode;
}

export function TableHeader({ columns, children }: TableHeaderProps) {
  const headerStyle = {
    ...tableStyles.header,
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

  // Otherwise, render the header row with columns
  return (
    <thead style={{ display: 'table-header-group' }}>
      <tr style={{ display: 'table-row' }}>
        {columns.map((col) => (
          <th key={col} style={headerStyle} className={`ipam-header ipam-header-${col}`}>
            {col.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </th>
        ))}
        <th
          style={{ ...headerStyle, ...tableStyles.actionsCell }}
          className="ipam-header ipam-header-actions"
        >
          Actions
        </th>
      </tr>
    </thead>
  );
}

// Shared status badge component
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      color={statusBadgeStyles[status.toLowerCase()] || 'gray'}
      className="ipam-status-badge"
      variant="filled"
      radius="md"
      size="sm"
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
