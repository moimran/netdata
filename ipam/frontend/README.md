# NetData IPAM Frontend

This directory contains the frontend application for the NetData IPAM tool, built with React, TypeScript, Mantine, TanStack Query, and Vite.

## Project Overview

The frontend provides a user interface for managing various IPAM and network-related data, interacting with the backend API for data retrieval and manipulation.

## Key Technologies

-   **React:** UI library
-   **TypeScript:** Language for static typing
-   **Vite:** Build tool and development server
-   **Mantine:** UI component library
-   **TanStack Query (React Query):** Data fetching and caching
-   **TanStack Table (via `mantine-react-table`):** Core table rendering and features
-   **Axios:** HTTP client
-   **React Router DOM:** Client-side routing
-   **Zod:** Schema validation (primarily used in backend, potentially frontend forms)

## Table Implementation Design

The application employs a structured approach for displaying data tables:

1.  **UnifiedTable Component:** The `UnifiedTable` component (`components/tables/UnifiedTable.tsx`) serves as the primary interface for displaying interactive data tables throughout the application.
2.  **Underlying Engine:** `UnifiedTable` internally uses `IPAMTableMRT` (`components/IPAMTable/IPAMTableMRT.tsx`). This component leverages the `mantine-react-table` library, which integrates Mantine components with TanStack Table v8, providing features like sorting, filtering, pagination, and row actions.
3.  **Styling:** Table appearance is primarily handled by the built-in styles from Mantine and `mantine-react-table`. Specific customizations or reusable style elements, like status indicators, are implemented using CSS (`components/IPAMTable/unified-table-styles.css`) and potentially dedicated components like `StatusBadge` (`components/tables/TableStyles.tsx`).
4.  **Simple Tables:** For straightforward, non-interactive data presentation (e.g., in detail summaries), the standard Mantine `Table` component (`@mantine/core`) is utilized directly.

## API Interaction and Type Safety

-   **Generated Types:** API type definitions are automatically generated from the backend's OpenAPI specification using `openapi-typescript`. The generated types are located in `src/api/generated-types.ts`. **This file is crucial for type safety and should not be deleted or manually edited.** It ensures that frontend code consuming the API aligns correctly with the backend data structures.
-   **Data Fetching Hooks:** Custom hooks (e.g., `useTableData`, `useBaseMutation`, `useReferenceData` found in `src/hooks/`) abstract the data fetching logic using TanStack Query and Axios, utilizing the generated types.

## Table Configuration (`schemas.ts`)

-   **Purpose:** While API types are generated, the specific configuration for *how* each table should be displayed in the UI is manually defined in `src/components/IPAMTable/schemas.ts`.
-   **Contents:** This file maps table names (matching API endpoints) to an array of column definitions. Each column definition specifies the data field (`name`), its basic `type`, whether it's a `reference` to another table (for displaying related data), and potentially other UI hints like `width` or `header` overrides.
-   **Maintenance:** This file **must be manually updated** whenever:
    *   A new table/API endpoint is added that needs UI display.
    *   Fields are added/removed/renamed in a backend model that should be reflected in the table UI.
    *   UI requirements for columns change (e.g., hiding a column, changing a reference).

## Development Workflow: Handling Model/Table Changes

This detailed workflow outlines the steps required when adding a new data model/table or modifying an existing backend model that is displayed in a frontend table.

1.  **Backend Modifications:**
    *   Modify the relevant Pydantic models in the backend application (e.g., add, remove, or rename fields).
    *   If adding a *new* model, ensure you also create the corresponding SQLAlchemy model, Alembic migration script, and FastAPI CRUD routes (often using the `create_crud_routes` utility).
    *   Run the backend server and verify that the OpenAPI specification (`/openapi.json`) accurately reflects your changes. This JSON file is the source for frontend type generation.

2.  **Frontend - Regenerate API Types:**
    *   Navigate to the `/ipam/frontend` directory in your terminal.
    *   Execute the type generation script:
        ```bash
        npm run gen:types
        ```
    *   **Purpose:** This command reads the latest `/openapi.json` from the (presumably running) backend and updates the TypeScript interfaces in `src/api/generated-types.ts`.
    *   **Verification:** Briefly check the changes (`git diff`) in `src/api/generated-types.ts` to confirm that the generated interfaces match the backend model changes (e.g., new fields are present, removed fields are gone).

3.  **Frontend - Update Table Schema Configuration (`schemas.ts`):**
    *   Open the file `src/components/IPAMTable/schemas.ts`.
    *   Locate the `TABLE_SCHEMAS` object.
    *   **Scenario A: Modifying an Existing Table:**
        *   Find the key corresponding to the modified API endpoint (e.g., `sites`, `vlans`).
        *   Adjust the array of `Column` objects:
            *   **Add Field:** Add a new `{ name: 'new_field_name', type: 'string' }` object. Ensure `name` exactly matches the field name in `generated-types.ts`. The `type` should be the basic JavaScript type ('string', 'number', 'boolean', 'date').
            *   **Remove Field:** Delete the `Column` object corresponding to the removed field.
            *   **Rename Field:** Update the `name` property in the relevant `Column` object.
            *   **Add Reference:** If a field is an ID referencing another table (e.g., `site_id`), add the `reference: 'referenced_table_name'` property (e.g., `{ name: 'site_id', type: 'number', reference: 'sites' }`). This hint is used by the table logic (`columnUtils.ts`) to fetch and display user-friendly data (e.g., site name) instead of just the ID.
            *   **Required Fields:** Add `required: true` if the field must be present in forms associated with this table.
    *   **Scenario B: Adding a New Table:**
        *   Add a new key-value pair to `TABLE_SCHEMAS`. The key must match the base API endpoint name used for CRUD operations (e.g., `new_models`).
        *   Define the value as an array of `Column` objects, selecting the fields from the newly generated type in `generated-types.ts` that you want to display in the table. Define their `type`, `reference`s, and `required` status as needed.
    *   **Example Column Definition:**
        ```typescript
        {
          name: 'site_id',         // Matches field in generated-types.ts
          type: 'number',        // Basic JS type
          reference: 'sites',    // Optional: Hints that this ID refers to the 'sites' table
          required: true         // Optional: For form validation logic
        }
        ```

4.  **Frontend - Implement or Update UI:**
    *   **New Table View:**
        *   Create a new React component for the view (e.g., `src/components/views/NewModelView.tsx`).
        *   Import the `UnifiedTable` component: `import { UnifiedTable } from '@/components/tables/UnifiedTable';`
        *   Use the component in your view, passing the `tableName` prop matching the key you added in `schemas.ts`:
            ```jsx
            function NewModelView() {
              return <UnifiedTable tableName="new_models" />;
            }
            ```
        *   Add routing for the new view in `src/App.tsx` or your routing configuration file.
    *   **Existing Table View:**
        *   Ensure the view is already using `<UnifiedTable tableName="..." />`. If it was using older components or Mantine `Table` directly and now needs interactive features, refactor it to use `UnifiedTable`.
    *   **Forms/Detail Views:** Update any related forms (e.g., create/edit modals) or detail views to reflect the model changes (add/remove/rename fields).

5.  **Testing:**
    *   Run the frontend application (`npm run dev`).
    *   Navigate to the relevant table view.
    *   **Verify:**
        *   **Data Loading:** Does the table load data without errors?
        *   **Columns:** Are the correct columns displayed? Are new fields shown? Are removed fields gone?
        *   **Data Formatting:** Is data displayed correctly?
        *   **References:** Are reference fields (like `site_id`) displaying the expected related data (like the site name)?
        *   **Features:** Do sorting, filtering, and pagination work correctly?
        *   **Actions:** If applicable, do row actions (edit, delete) function as expected?
        *   **Forms:** Do create/edit forms associated with the table reflect the changes and function correctly?
