# IPAM Table Styling

This document outlines the styling approach for the IPAM tables using Mantine React Table (MRT).

## Styling Overview

After migrating to Mantine React Table, several styling adjustments were made to ensure:
1. Consistent look and feel across all tables
2. Better text visibility and readability
3. Professional appearance
4. Proper handling of dynamic data

## Key Files

- `mrt-fixes.css` - Contains targeted CSS fixes for MRT components
- `IPAMTableMRT.tsx` - Main table component with configuration and styling

## Styling Best Practices

When working with IPAM tables, follow these best practices:

### 1. Column Width Management

Columns have preconfigured widths based on data type and content:
- ID columns: 80px
- Prefix columns: 200px
- Address columns: 180px
- Name columns: 200px
- Description columns: 300px
- Status columns: 120px
- Reference columns: 150px

Use the `getColumnWidth()` function for consistent sizing.

### 2. Text Formatting

- Use monospace fonts for network addresses and technical data
- Ensure text overflow is handled properly with ellipsis
- Allow description fields to wrap text

### 3. Status Badge Styling

Status badges use consistent styling:
- Width: 100px
- Color-coding: teal (active), indigo (reserved), violet (deprecated)
- Text is always capitalized

### 4. Buttons and Controls

- Action buttons use consistent sizing (md)
- Icons use consistent sizing (18px)
- Tooltips are provided for all action buttons

### 5. Table Configuration

Key table configuration parameters:
- density: 'md' for comfortable readability
- striped: true for better row distinction
- highlightOnHover: true for better interaction feedback
- enableStickyHeader: true for better usability with long tables

## Custom Styling Classes

The table uses several custom CSS classes:
- `.ipam-cell-{columnName}` - For column-specific styling
- `.ipam-cell-type-{dataType}` - For data-type-specific styling
- `.ipam-status-badge` - For status badges
- `.ipam-progress-bar` - For utilization bars

## Troubleshooting Style Issues

If you encounter styling inconsistencies:

1. Check specificity of CSS selectors (mrt-fixes.css uses !important to override defaults)
2. Verify column definitions have proper accessorKey and size values
3. Ensure the component imports mrt-fixes.css
4. Check for conflicting styles in the global CSS

## Future Enhancements

Planned styling improvements:
- Responsive adaptations for smaller screens
- Custom theming support
- Export with styled content (PDF, Excel)
- Additional visualization options for utilization data 