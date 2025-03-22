import { Table, Badge, type MantineStyleProp, type CSSProperties } from '@mantine/core';
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

interface TableStyles {
  table: CSSProperties;
  header: CSSProperties;
  cell: CSSProperties;
  actionsCell: CSSProperties;
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
  }
};

// Shared status badge styles - Vibrant colors for dark theme
export const statusBadgeStyles: Record<string, string> = {
  active: STATUS_ACTIVE,
  reserved: STATUS_RESERVED,
  deprecated: STATUS_DEPRECATED,
  container: STATUS_CONTAINER,
  dhcp: STATUS_DHCP,
  slaac: STATUS_SLAAC
};

// Shared table component
export function StyledTable({ children }: { children: React.ReactNode }) {
  const tableStyle = {
    ...tableStyles.table,
    display: 'table',
    width: '100%',
    tableLayout: 'auto' as const
  };

  return (
    <Table striped highlightOnHover style={tableStyle} className="ipam-styled-table">
      {children}
    </Table>
  );
}

// Shared table header component
export function TableHeader({ columns }: { columns: string[] }) {
  const headerStyle = {
    ...tableStyles.header,
    display: 'table-cell',
    whiteSpace: 'nowrap' as const,
    textAlign: 'left' as const
  };

  const actionsStyle = {
    ...tableStyles.header,
    ...tableStyles.actionsCell,
    display: 'table-cell',
    whiteSpace: 'nowrap' as const
  };

  return (
    <thead style={{ display: 'table-header-group' }}>
      <tr style={{ display: 'table-row' }}>
        {columns.map((col) => (
          <th key={col} style={headerStyle} className={`ipam-header ipam-header-${col}`}>
            {col.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </th>
        ))}
        <th style={actionsStyle} className="ipam-header ipam-header-actions">
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
