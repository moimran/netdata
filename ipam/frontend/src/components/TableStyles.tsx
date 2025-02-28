import { Table, Badge, type MantineStyleProp, type CSSProperties } from '@mantine/core';

interface TableStyles {
  table: CSSProperties;
  header: CSSProperties;
  cell: CSSProperties;
  actionsCell: CSSProperties;
}

// Shared table styles
export const tableStyles: TableStyles = {
  table: {
    border: '1px solid #ddd',
    borderCollapse: 'collapse' as const,
    width: '100%'
  },
  header: {
    backgroundColor: '#f8f9fa',
    fontWeight: 600,
    fontSize: '0.85rem',
    padding: '12px 15px',
    textTransform: 'uppercase' as const,
    border: '1px solid #ddd'
  },
  cell: {
    padding: '10px 15px',
    border: '1px solid #ddd'
  },
  actionsCell: {
    width: '100px',
    textAlign: 'center' as const
  }
};

// Shared status badge styles
export const statusBadgeStyles: Record<string, string> = {
  active: 'green',
  reserved: 'blue',
  deprecated: 'gray',
  container: 'indigo',
  dhcp: 'cyan',
  slaac: 'teal'
};

// Shared table component
export function StyledTable({ children }: { children: React.ReactNode }) {
  return (
    <Table striped highlightOnHover style={tableStyles.table}>
      {children}
    </Table>
  );
}

// Shared table header component
export function TableHeader({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr>
        {columns.map((col) => (
          <th key={col} style={tableStyles.header}>
            {col.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </th>
        ))}
        <th style={{ ...tableStyles.header, ...tableStyles.actionsCell }}>
          Actions
        </th>
      </tr>
    </thead>
  );
}

// Shared status badge component
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge color={statusBadgeStyles[status.toLowerCase()] || 'gray'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
