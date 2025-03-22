# IPAM Components Architecture

This directory contains the components that make up the IPAM frontend application. The components are organized into subdirectories based on their purpose and function.

## Directory Structure

- **common/** - Utility components that are used across the application
  - `ErrorBoundary.tsx` - Component for catching and displaying errors

- **layout/** - Components that define the structure of the application
  - `Header.tsx` - The application header
  - `MainNavigation.tsx` - The main navigation sidebar

- **tables/** - Table components for displaying and managing data
  - `IPAMTable.tsx` - Generic table component for IPAM data
  - `PrefixTable.tsx` - Specialized table for prefix data
  - `TableStyles.tsx` - Shared table styling components

- **ui/** - Reusable UI components
  - `IPAMModal.tsx` - Modal dialog for IPAM operations

- **views/** - Page-level components that represent different views in the application
  - `Dashboard.tsx` - The main dashboard view
  - `IPAMView.tsx` - Generic view for IPAM data
  - `PrefixView.tsx` - View for prefix data
  - `VRFView.tsx` - View for VRF data
  - etc.

  - **details/** - Detail views for specific items
    - `VRFDetailView.tsx` - Detailed view of a VRF
    - `VLANGroupDetailView.tsx` - Detailed view of a VLAN group

## Component Organization Guidelines

1. **Component Placement**: Place components in the directory that best represents their function:
   - Use `views/` for page-level components
   - Use `layout/` for structural components
   - Use `ui/` for reusable UI elements
   - Use `tables/` for table components
   - Use `common/` for utility components

2. **Imports**: When importing components, use relative paths that reflect the directory structure:
   ```typescript
   // Good
   import { IPAMTable } from '../tables/IPAMTable';
   
   // Avoid
   import { IPAMTable } from '../IPAMTable';
   ```

3. **Naming Conventions**:
   - Use PascalCase for component names
   - Suffix view components with "View"
   - Use descriptive names that reflect the component's purpose 