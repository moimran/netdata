# IPAM Table Styling Guide

This guide outlines the standard approach for creating consistent tables throughout the IPAM application. Follow these guidelines when implementing new tables or updating existing ones.

## Core Components

### 1. IPAMTable Component

The primary way to create a table is using the `IPAMTable` component:

```tsx
import { IPAMTable } from '../components/IPAMTable';

function MyView() {
  return <IPAMTable tableName="table_name" />;
}
```

The `IPAMTable` component automatically:
- Loads data for the specified table
- Displays filters and search
- Provides pagination
- Handles CRUD operations 
- Applies consistent styling

### 2. Status Badges

Always use the `StatusBadge` or `EnhancedStatusBadge` component for status indicators:

```tsx
import { StatusBadge } from '../components/TableStyles';
// or
import { EnhancedStatusBadge } from '../components/IPAMTable/statusUtils';

<StatusBadge status="active" />
```

Status badge colors are defined centrally in `theme/colors.ts`:

| Status | Color | Example |
|--------|-------|---------|
| Active | Teal (#14b8a6) | `<StatusBadge status="active" />` |
| Container | Indigo (#4f46e5) | `<StatusBadge status="container" />` |
| Reserved | Violet (#8b5cf6) | `<StatusBadge status="reserved" />` |
| Deprecated | Gray (#6b7280) | `<StatusBadge status="deprecated" />` |
| Planned | Yellow (#eab308) | `<StatusBadge status="planned" />` |
| Staged | Orange (#f97316) | `<StatusBadge status="staged" />` |
| Failed | Red (#ef4444) | `<StatusBadge status="failed" />` |
| DHCP | Cyan (#06b6d4) | `<StatusBadge status="dhcp" />` |
| SLAAC | Blue (#3b82f6) | `<StatusBadge status="slaac" />` |

## Table Schema

Define table schema in `IPAMTable/schemas.ts`. Each column should have appropriate type and validation:

```tsx
// In IPAMTable/schemas.ts
export const TABLE_SCHEMAS: Record<TableName, Column[]> = {
  // ...existing tables
  my_new_table: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'status', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'reference_id', type: 'number', reference: 'other_table' }
  ]
};
```

## CSS Classes

### Standard Table Structure

All tables should follow this structure:

```tsx
<Box className="ipam-table-container">
  <StyledTable>
    <TableHeader columns={columns} />
    <tbody className="ipam-table-body">
      {items.map(item => (
        <tr className="ipam-table-row">
          {columns.map(column => (
            <td className={`ipam-cell ipam-cell-${column.name} ipam-cell-type-${getColumnTypeClass(column, item[column.name])}`}>
              {formatCell(item, column)}
            </td>
          ))}
          <td className="ipam-cell ipam-cell-actions">
            {/* Action buttons */}
          </td>
        </tr>
      ))}
    </tbody>
  </StyledTable>
</Box>
```

### Column Type CSS Classes

Use these CSS classes for different column types:

| Type | CSS Class | Usage |
|------|-----------|-------|
| Reference | `ipam-cell-type-reference` | Foreign key references |
| Boolean | `ipam-cell-type-boolean` | Yes/No values |
| Network | `ipam-cell-type-network` | IP addresses, subnets |
| ASN | `ipam-cell-type-asn` | Autonomous System Numbers |
| VID | `ipam-cell-type-vid` | VLAN IDs |
| Credential | `ipam-cell-type-credential` | Username/password fields |

### Column Width Standards

Use these width standards for different column types:

| Column Type | Width | CSS Class |
|-------------|-------|-----------|
| ID | 60px | `ipam-header-id`, `ipam-cell-id` |
| Name | 150px | `ipam-header-name`, `ipam-cell-name` |
| Slug | 120px | `ipam-header-slug`, `ipam-cell-slug` |
| Description | 200px | `ipam-header-description`, `ipam-cell-description` |
| Status | 120px | `ipam-header-status`, `ipam-cell-status` |
| IP Address | 130px | `ipam-header-ip_address`, `ipam-cell-ip_address` |
| Credential | 130px | `ipam-header-credential_name`, `ipam-cell-credential_name` |
| Actions | 120px | `ipam-header-actions`, `ipam-cell-actions` |
| Boolean | 120px | `ipam-header-is_default`, `ipam-cell-is_default` |
| ASN | 100px | `ipam-header-asn`, `ipam-cell-asn` |
| VLAN ID | 80px | `ipam-header-vid`, `ipam-cell-vid` |

## Custom Action Buttons

To add custom actions to a table, use the `customActionsRenderer` prop:

```tsx
function MyTableView() {
  const renderCustomActions = (item: any) => {
    return (
      <Tooltip label="Custom Action">
        <ActionIcon
          color="blue"
          variant="light"
          onClick={() => handleCustomAction(item)}
        >
          <IconCustom size={16} />
        </ActionIcon>
      </Tooltip>
    );
  };

  return (
    <IPAMTable 
      tableName="my_table" 
      customActionsRenderer={renderCustomActions}
    />
  );
}
```

## Styling Details

### Dark Theme Colors

| Element | Color Code | Usage |
|---------|------------|-------|
| Table Background | #1A1B1E | Main table background |
| Row Background | #25262B | Standard row background |
| Alternate Row | #2C2E33 | Alternate row background |
| Header Background | #1f2937 | Table header background |
| Border | #374151 | Table and row borders |
| Text | #f9fafb | Standard text color |
| Hover | rgba(20, 184, 166, 0.15) | Row hover background |

### Badge Styling

All status badges should:
- Be 100px wide
- Have 6px vertical and 12px horizontal padding
- Use uppercase first letter, lowercase rest
- Have font-weight: 600
- Have centered text
- Use appropriate status colors (defined above)

## Code Example

Here's a complete example of creating a view with a table:

```tsx
import { Stack } from '@mantine/core';
import { IPAMTable } from '../components/IPAMTable';
import { IconDownload } from '@tabler/icons-react';

export function MyTableView() {
  const renderCustomActions = (item: any) => {
    return (
      <Tooltip label="Download">
        <ActionIcon
          color="cyan"
          variant="light"
          onClick={() => handleDownload(item)}
        >
          <IconDownload size={16} />
        </ActionIcon>
      </Tooltip>
    );
  };

  return (
    <Stack gap="md">
      <IPAMTable
        tableName="my_table"
        customActionsRenderer={renderCustomActions}
      />
    </Stack>
  );
}
```

## Adding a New Table

To add a completely new table type:

1. Add the table schema to `IPAMTable/schemas.ts`
2. Create a view component in `src/components/MyTableView.tsx`
3. Add any necessary backend API endpoints
4. Add any special formatting to `IPAMTable/utils.tsx`
5. Add any required validation to `utils/validation/formValidation.ts`
6. Add the view to the routes in `AppRoutes.tsx`

## Best Practices

1. **Consistency**: All tables should look and behave similarly
2. **Responsiveness**: Tables should handle different screen sizes
3. **Dark Theme**: Use the appropriate dark theme colors
4. **Monospace**: Use monospace fonts for technical identifiers
5. **Status Colors**: Follow the status color scheme for consistency
6. **Column Widths**: Use standard column widths for alignment
7. **Badge Styling**: Use consistent badge styling for statuses
8. **Text Contrast**: Ensure text has sufficient contrast against backgrounds

By following this guide, you'll create tables that are consistent with the rest of the IPAM application and provide a great user experience. 