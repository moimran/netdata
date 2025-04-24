import React, { memo } from 'react';
import { Select, TextInput } from '@mantine/core';
import { CommonFieldProps, ReferenceFieldProps } from './types';
import { handleDropdownSelection } from './utils';

/**
 * VRF field for Prefixes
 */
export const PrefixVRFField = memo(({
  name,
  label,
  value,
  onChange,
  error,
  referenceTable,
  referenceData,
  formatReferenceValue
}: ReferenceFieldProps) => {
  const hasVrfs = referenceData.vrfs && referenceData.vrfs.length > 0;
  const vrfOptions = hasVrfs
    ? referenceData.vrfs.map((vrf) => ({
        value: String(vrf.id),
        label: vrf.name || formatReferenceValue(vrf.id, 'vrfs')
      }))
    : [];
  
  // Add a "Global" option for VRF
  const selectOptions = [
    { value: '', label: 'Global' },
    ...vrfOptions
  ];
  
  return (
    <Select
      label={label}
      value={value ? String(value) : ''}
      onChange={(selectedValue) => {
        console.log(`${name} VRF selected:`, selectedValue);
        onChange(selectedValue ? Number(selectedValue) : null);
      }}
      data={selectOptions}
      error={error}
      searchable
      clearable
      placeholder="Select VRF"
    />
  );
});

/**
 * Prefix field
 */
export const PrefixField = memo(({
  name,
  label,
  value,
  onChange,
  error,
  referenceData
}: CommonFieldProps & { referenceData: Record<string, any[]> }) => {
  // For prefixes table, show dropdown of available aggregates
  const hasAggregates = referenceData.aggregates && referenceData.aggregates.length > 0;
  
  if (hasAggregates) {
    // Create options from aggregates
    const aggregateOptions = referenceData.aggregates.map((agg) => ({
      value: agg.prefix,
      label: agg.prefix
    }));
    
    // Create a combined approach with a Select for existing options and a TextInput for custom entry
    return (
      <div>
        <Select
          label={`${label} (Select from existing)`}
          value={value || ''}
          onChange={(selectedValue) => {
            console.log('Selected prefix:', selectedValue);
            // Directly pass the selected value to the parent component
            if (selectedValue) {
              onChange(selectedValue);
            } else {
              onChange(null);
            }
          }}
          data={aggregateOptions}
          error={error}
          placeholder="Select from existing prefixes"
          searchable
          clearable
        />
        <TextInput
          label="Or enter a custom prefix"
          placeholder="e.g., 192.168.0.0/24"
          value={value || ''}
          onChange={(e) => {
            const customValue = e.currentTarget.value;
            console.log('Custom prefix entered:', customValue);
            onChange(customValue);
          }}
          mt="xs"
        />
      </div>
    );
  }
  
  // Fallback to text input if no aggregates
  return (
    <TextInput
      label={label}
      value={value || ''}
      onChange={(e) => onChange(e.currentTarget.value)}
      error={error}
      placeholder="192.168.0.0/24"
    />
  );
});
