import { memo } from 'react';
import { Select } from '@mantine/core';
import { ReferenceFieldProps } from './types';
import { handleDropdownSelection } from './utils';

/**
 * Reference field component (select dropdown for foreign keys)
 */
export const ReferenceField = memo(({
  name,
  label,
  value,
  onChange,
  error,
  referenceTable,
  referenceData,
  formatReferenceValue
}: ReferenceFieldProps) => {
  // Check if reference data exists for this table
  const hasReferenceData = referenceData[referenceTable] && referenceData[referenceTable].length > 0;
  
  // Debug the reference data - uncomment if needed
  console.log(`ReferenceField ${name} (${referenceTable}):`, { 
    value, 
    valueType: typeof value,
    options: hasReferenceData ? referenceData[referenceTable].length : 0
  });
  
  // Create options for the select dropdown
  const options = hasReferenceData
    ? referenceData[referenceTable].map((item) => ({
        value: String(item.id),
        label: item.name || formatReferenceValue(item.id, referenceTable)
      }))
    : [];
  
  // Add a "None" option for nullable references
  const selectOptions = [
    { value: '', label: 'None' },
    ...options
  ];
  
  return (
    <Select
      label={label}
      value={value ? String(value) : ''}
      onChange={(selectedValue) => {
        // Check if this is a UUID field (36 characters with hyphens)
        const isUuidField = selectedValue && selectedValue.length === 36 && selectedValue.includes('-');
        // Pass isNumeric=false for UUID fields to prevent conversion to number
        handleDropdownSelection(name, selectedValue, onChange, !isUuidField);
      }}
      data={selectOptions}
      error={error}
      placeholder={hasReferenceData ? `Select ${label}` : `No ${referenceTable} available`}
      searchable
      clearable
    />
  );
});
