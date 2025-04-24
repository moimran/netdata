/**
 * FormFields.tsx
 * 
 * This file has been refactored to split the components into smaller, more manageable files.
 * It now re-exports all the field components from the fields directory.
 */

// Re-export all field components from the fields directory
import { 
  FormField,
  VlanIdRangesField,
} from './fields';

// Import types
import type { 
  CommonFieldProps,
  ReferenceFieldProps,
  VlanIdRangesFieldProps
} from './fields';

// Re-export the components
export { 
  FormField,
  VlanIdRangesField,
};

// Re-export the types
export type { 
  CommonFieldProps,
  ReferenceFieldProps,
  VlanIdRangesFieldProps
};
