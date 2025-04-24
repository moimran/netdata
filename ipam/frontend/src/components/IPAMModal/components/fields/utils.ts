/**
 * Helper function to get the field label
 */
export const getFieldLabel = (name: string): string | null => {
  if (name === 'id') return null; // Skip ID field
  if (name === 'vid') return 'VLAN ID';
  if (name === 'rd') return 'Route Distinguisher';

  // Handle _id fields by removing suffix and capitalizing
  if (name.endsWith('_id')) {
    return name.replace('_id', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // Default label formatting
  return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

/**
 * Debug function to help diagnose reference data issues
 */
export const debugReferenceData = (
  name: string, 
  referenceTable: string, 
  referenceData: Record<string, any[]>, 
  value: any
): void => {
  console.group(`Reference Field Debug: ${name} (references ${referenceTable})`);
  console.log('Current value:', value);
  console.log(`Reference data for ${referenceTable}:`, referenceData[referenceTable]);
  console.log('All reference data:', referenceData);
  console.groupEnd();
};

/**
 * Handle dropdown selection consistently across all components
 * This ensures that all dropdowns work the same way and properly handle selection events
 */
export const handleDropdownSelection = (
  fieldName: string,
  selectedValue: string | null,
  onChange: (value: any) => void,
  isNumeric: boolean = true
): void => {
  console.log(`${fieldName} selected:`, selectedValue);
  
  // Convert to number if needed (for IDs) or pass through as string/null
  if (isNumeric) {
    onChange(selectedValue ? Number(selectedValue) : null);
  } else {
    onChange(selectedValue);
  }
};
