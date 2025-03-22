# IPAM Frontend Table Styling Guide

This guide outlines how to ensure consistent table styling across the IPAM frontend application.

## Core Principles

1. **Centralized Styling**: All table styling is defined in `TableStyles.tsx` and `IPAMTable/styles.css`
2. **Consistent Components**: Always use the standardized components for tables
3. **Proper CSS Classes**: Use the provided CSS classes for consistent appearance

## How to Use the Table Components

### Basic Table Implementation

The simplest way to display a table is to use the `IPAMTable` component:

```tsx
import { IPAMTable } from './components/IPAMTable';

export function MyView() {
  return <IPAMTable tableName="table_name" />;
}
```

This will automatically use the table schema defined in `IPAMTable/schemas.ts` and apply all the correct styling.

### Custom Table Implementation

If you need to create a custom table, use the following components from `TableStyles.tsx`:

```tsx
import { StyledTable, TableHeader, tableStyles, StatusBadge } from './TableStyles';

<StyledTable>
  <TableHeader columns={['Column1', 'Column2']} />
  <tbody>
    <tr className="ipam-table-row">
      <td 
        style={tableStyles.cell} 
        className="ipam-cell ipam-cell-column1"
      >
        Cell content
      </td>
      <td 
        style={tableStyles.cell} 
        className="ipam-cell ipam-cell-column2"
      >
        Cell content
      </td>
    </tr>
  </tbody>
</StyledTable>
```

## CSS Classes for Different Field Types

Use these CSS classes to ensure consistent styling:

### Reference Fields

```tsx
<td className="ipam-cell ipam-cell-reference ipam-cell-type-reference">
  Reference value
</td>
```

### Network Address Fields

```tsx
<td className="ipam-cell ipam-cell-address ipam-cell-type-network">
  192.168.1.1
</td>
```

### Status Fields

```tsx
<td className="ipam-cell ipam-cell-status">
  <StatusBadge status="active" />
</td>
```

### Boolean Fields

```tsx
<td className="ipam-cell ipam-cell-is_pool ipam-cell-type-boolean">
  Yes
</td>
```

### ASN Fields

```tsx
<td className="ipam-cell ipam-cell-asn ipam-cell-type-asn">
  AS65001
</td>
```

### VLAN ID Fields

```tsx
<td className="ipam-cell ipam-cell-vid ipam-cell-type-vid">
  100
</td>
```

## Table Column Widths

Column widths are standardized in `IPAMTable/styles.css`. Common widths:

- ID columns: 60px
- Name columns: 180px 
- Description columns: 250px
- Reference columns: 150px
- Status columns: 120px
- Network address columns: 180px with monospace font
- ASN columns: 100px
- VLAN ID columns: 80px

## Adding New Table Types

When adding a new table type:

1. Add the schema to `IPAMTable/schemas.ts`
2. Add any special column formatting to `IPAMTable/utils.tsx`
3. Add specific CSS styling to `IPAMTable/styles.css`
4. Add special header formatting to `TableStyles.tsx`

## Common Patterns

### Status Badges

Always use the `StatusBadge` component for status fields:

```tsx
import { StatusBadge } from './TableStyles';

<td className="ipam-cell ipam-cell-status">
  <StatusBadge status={item.status} />
</td>
```

### Action Buttons

Use this pattern for action buttons:

```tsx
<td style={{ ...tableStyles.cell, ...tableStyles.actionsCell }} className="ipam-cell ipam-cell-actions">
  <Group gap="xs" justify="center">
    <Tooltip label="Edit">
      <ActionIcon
        color="blue"
        variant="light"
        onClick={() => handleEdit(item)}
      >
        <IconEdit size={16} />
      </ActionIcon>
    </Tooltip>
    <Tooltip label="Delete">
      <ActionIcon
        color="red"
        variant="light"
        onClick={() => handleDelete(item.id)}
      >
        <IconTrash size={16} />
      </ActionIcon>
    </Tooltip>
  </Group>
</td>
``` 