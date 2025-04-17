# IPAM Table Components

This directory contains components for displaying and interacting with tables in the IPAM application.

## Components

### TableContainer

A consistent container for all tables in the application. It provides a standardized card-based layout with proper styling.

```tsx
<TableContainer title="IP Addresses" description="Manage IP addresses in the system">
  <IPAMTable tableName="ip_addresses" />
</TableContainer>
```

### SharedTableComponent

A compatibility wrapper that uses the Mantine React Table implementation. This component helps maintain backward compatibility with existing code.

```tsx
<SharedTableComponent tableName="prefixes" />
```

### IPAMTable

Another compatibility wrapper that forwards to IPAMTableMRT. This component ensures all tables use the Mantine React Table implementation.

```tsx
<IPAMTable tableName="devices" customActionsRenderer={renderActions} />
```

## Styling

All table components use a consistent styling approach:

1. The `mrt-fixes.css` file contains fixes for styling issues in Mantine React Table
2. The `TableContainer` component provides consistent card-based layouts
3. All tables have standardized column widths, fonts, colors, and spacing

## Usage Guidelines

1. **Always use TableContainer**:
   ```tsx
   // Correct
   <TableContainer title="Devices">
     <IPAMTable tableName="devices" />
   </TableContainer>
   
   // Avoid
   <IPAMTable tableName="devices" />
   ```

2. **Consistent title formatting**:
   ```tsx
   // Title will be automatically formatted from snake_case to Title Case
   <TableContainer title={formattedTitle}>
     <SharedTableComponent tableName="ip_addresses" />
   </TableContainer>
   ```

3. **Optional description**:
   ```tsx
   <TableContainer 
     title="IP Addresses" 
     description="Manage IP address allocations and assignments"
   >
     <IPAMTable tableName="ip_addresses" />
   </TableContainer>
   ```

4. **Custom action rendering**:
   ```tsx
   <TableContainer title="Devices">
     <IPAMTable 
       tableName="devices" 
       customActionsRenderer={(item) => (
         <ActionIcon onClick={() => handleAction(item)}>
           <IconExternalLink size={18} />
         </ActionIcon>
       )} 
     />
   </TableContainer>
   ```

See the [STYLING.md](../IPAMTable/STYLING.md) file for more detailed styling guidelines. 