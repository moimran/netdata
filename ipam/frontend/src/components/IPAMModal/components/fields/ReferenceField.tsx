import { memo } from 'react';
import { Select } from '@mantine/core';
import { ReferenceFieldProps } from './types';

/**
 * Reference field component (select dropdown for foreign keys)
 */
export const ReferenceField = memo(({
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
  
  // If debugging is needed, uncomment this
  // debugReferenceData(name, referenceTable, referenceData, value);
  
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
      onChange={(value) => onChange(value ? Number(value) : null)}
      data={selectOptions}
      error={error}
      searchable
      clearable
    />
  );
});
