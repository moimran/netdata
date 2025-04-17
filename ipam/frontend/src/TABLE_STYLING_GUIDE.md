# IPAM Table Styling Guide

This guide outlines the standard approach for creating consistent tables throughout the IPAM application. Follow these guidelines when implementing new tables or updating existing ones.

## Core Components

### 1. SharedTableComponent Component

The primary way to create a table is using the `SharedTableComponent`:

```tsx
import { SharedTableComponent } from '../components/tables/SharedTableComponent';

function MyView() {
  return <SharedTableComponent tableName="table_name" />;
}
```

The `SharedTableComponent` automatically:
- Loads data for the specified table
- Displays filters and search
- Provides pagination
- Handles CRUD operations 
- Applies consistent styling

### 2. Status Badges

Always use the `StatusBadge` component for status indicators:

```tsx
import { StatusBadge } from '../components/tables/TableStyles';

<StatusBadge status="active" />
```

Status badge colors follow this scheme:

| Status | Color | Example |
|--------|-------|---------|
| Active | Teal (#14b8a6) | `<StatusBadge status="active" />` |
| Container | Indigo (#4f46e5) | `<StatusBadge status="container" />` |
| Reserved | Violet (#8b5cf6) | `<StatusBadge status="reserved" />` |
| Deprecated | Gray (#6b7280) | `<StatusBadge status="deprecated" />` |
| Planned | Yellow (#eab308) | `<StatusBadge status="planned" />` |
| Staged | Orange (#f97316) | `<StatusBadge status="staged" />` |
| Failed | Red (#ef4444) | `<StatusBadge status="failed" />` |
| Available | Green (#22c55e) | `<StatusBadge status="available" />` |

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

All tables should follow this structure with proper CSS classes:

```tsx
<div className="ipam-table-container">
  <StyledTable className={`ipam-${tableName}-table`}>
    <TableHeader columns={columns} />
    <tbody className="ipam-table-body">
      {items.map(item => (
        <tr className="ipam-table-row">
          {columns.map(column => (
            <td 
              style={tableStyles.cell}
              className={`ipam-cell ipam-cell-${column.name}`}
              title={item[column.name]?.toString()}
            >
              {formatCellContent(item, column)}
            </td>
          ))}
          <td 
            style={{ ...tableStyles.cell, ...tableStyles.actionsCell }}
            className="ipam-cell ipam-cell-actions"
          >
            <Group spacing={4}>
              <ActionIcon
                onClick={() => handleEditClick(item)}
                size="sm"
                color="blue"
                className="ipam-action-button ipam-edit-button"
              >
                <IconEdit size={14} />
              </ActionIcon>
              <ActionIcon
                onClick={() => handleDeleteClick(item)}
                size="sm"
                color="red"
                className="ipam-action-button ipam-delete-button"
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </td>
        </tr>
      ))}
    </tbody>
  </StyledTable>
</div>
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
| ID | `ipam-cell-id` | ID column |

### Column Width Standards

Use these width standards for different column types:

| Column Type | Width | CSS Class |
|-------------|-------|-----------|
| ID | 60px | `ipam-header-id`, `ipam-cell-id` |
| Name | 150px | `ipam-header-name`, `ipam-cell-name` |
| Slug | 130px | `ipam-header-slug`, `ipam-cell-slug` |
| Description | 200px | `ipam-header-description`, `ipam-cell-description` |
| Status | 120px | `ipam-header-status`, `ipam-cell-status` |
| IP Address | 130px | `ipam-header-ip_address`, `ipam-cell-ip_address` |
| Prefix | 180px | `ipam-header-prefix`, `ipam-cell-prefix` |
| Actions | 120px | `ipam-header-actions`, `ipam-cell-actions` |
| VLAN ID | 90px | `ipam-header-vid`, `ipam-cell-vid` |
| VLAN Group | 160px | `ipam-header-group_id`, `ipam-cell-group_id` |
| Site | 130px | `ipam-header-site_id`, `ipam-cell-site_id` |

## Action Buttons

The standard action buttons should use these classes:

```tsx
<ActionIcon
  size="sm"
  color="blue"
  className="ipam-action-button ipam-edit-button"
  onClick={() => handleEditClick(item)}
>
  <IconEdit size={14} />
</ActionIcon>

<ActionIcon
  size="sm"
  color="red"
  className="ipam-action-button ipam-delete-button"
  onClick={() => handleDeleteClick(item)}
>
  <IconTrash size={14} />
</ActionIcon>
```

## Custom Action Buttons

To add custom actions to a table, use the `customActionsRenderer` prop:

```tsx
function MyTableView() {
  const renderCustomActions = (item: any) => {
    return (
      <Group spacing={4}>
        <ActionIcon
          size="sm"
          color="cyan"
          className="ipam-action-button ipam-custom-button"
          onClick={() => handleCustomAction(item)}
        >
          <IconCustom size={14} />
        </ActionIcon>
      </Group>
    );
  };

  return (
    <SharedTableComponent 
      tableName="my_table" 
      customActionsRenderer={renderCustomActions}
    />
  );
}
```

## Dark Theme Colors

Use these colors for consistent dark theme styling:

| Element | Color Code | Usage |
|---------|------------|-------|
| Table Background | #1A1B1E | Main table background |
| Row Background | #25262B | Standard row background |
| Alternate Row | #2C2E33 | Alternate row background |
| Header Background | #111827 | Table header background |
| Border | #374151 | Table and row borders |
| Text | #f9fafb | Standard text color |
| Header Text | #d1d5db | Header text color |
| Hover | rgba(20, 184, 166, 0.15) | Row hover background |
| Primary Button | #14b8a6 | Primary button background |
| Primary Button Hover | #0d9488 | Primary button hover |
| Action Icon | Varies | Uses SVG color styling |

## Input Styling

For forms and search inputs, use these styles:

```tsx
<TextInput
  placeholder="Search..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  leftSection={<IconSearch size={16} />}
  className="ipam-search-input"
/>

<Button 
  type="submit" 
  className="ipam-apply-button"
>
  Search
</Button>
```

## Modal Styling

For consistent modal styling:

```tsx
<Modal
  opened={isOpen}
  onClose={onClose}
  title={title}
  styles={{
    header: { 
      backgroundColor: '#1A1B1E', 
      color: '#f9fafb',
      borderBottom: '1px solid #374151',
      fontWeight: 600
    },
    content: { 
      backgroundColor: '#1A1B1E', 
      color: '#f9fafb' 
    }
  }}
  classNames={{
    title: 'ipam-modal-title'
  }}
>
  {/* Modal content */}
  <Group justify="flex-end" mt="xl">
    <Button 
      variant="outline" 
      onClick={onClose}
      className="ipam-cancel-button"
    >
      Cancel
    </Button>
    <Button 
      type="submit" 
      className="ipam-confirm-button"
    >
      Confirm
    </Button>
  </Group>
</Modal>
```

## Special Table Types

### VLAN Tables

For VLAN tables, use the following column order:

```tsx
<TableHeader columns={['id', 'name', 'slug', 'vid', 'status', 'group_id', 'site_id', 'description', 'actions']} />
```

The VID column should use centered text with a slightly bolder font:

```tsx
<Text fw={600} ta="center">
  {item.vid}
</Text>
```

### VLAN Group Tables

For VLAN Group tables, use the following column order:

```tsx
<TableHeader columns={['id', 'name', 'slug', 'vlan_id_ranges', 'description', 'actions']} />
```

The `vlan_id_ranges` column should use monospace font for better readability.

### Prefix Tables 

For Prefix tables, include a utilization column:

```tsx
<UtilizationBar percentage={percentage} used={used} total={total} />
```

## Adding a New Table

To add a completely new table type:

1. Add the table schema to `IPAMTable/schemas.ts`
2. Create a view component in `src/components/views/MyTableView.tsx`
3. Add any necessary backend API endpoints
4. Add specific column handling in `SharedTableComponent.tsx` if needed
5. Add the view to the routes in `AppRoutes.tsx`

## Best Practices

1. **Consistency**: Use the shared components for all tables
2. **Dark Theme**: Use the correct dark theme colors specified in this guide
3. **Action Icons**: Use proper styling for action button icons
4. **CSS Classes**: Apply the proper CSS classes for each column type
5. **Column Widths**: Use standard column widths for alignment
6. **Monospace**: Use monospace fonts for technical data (IPs, prefixes, etc.)
7. **Hover Effects**: Maintain consistent hover effects
8. **Padding & Spacing**: Keep consistent padding and spacing
9. **Modal Styling**: Use consistent modal styling for forms
10. **Form Inputs**: Apply consistent form input styling

By following this guide, you'll create tables that maintain the consistent dark theme appearance across the IPAM application. 