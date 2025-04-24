import React, { memo } from 'react';
import { Select, TextInput } from '@mantine/core';
import { CommonFieldProps, ReferenceFieldProps } from './types';

/**
 * VRF field for IP addresses
 */
export const IPAddressVRFField = memo(({
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
      placeholder="Select VRF"
      searchable
      clearable
    />
  );
});

/**
 * Prefix field for IP addresses
 */
export const IPAddressPrefixField = memo(({
  name,
  label,
  value,
  onChange,
  error,
  referenceTable,
  referenceData,
  formatReferenceValue
}: ReferenceFieldProps) => {
  const hasPrefixes = referenceData.prefixes && referenceData.prefixes.length > 0;
  const prefixOptions = hasPrefixes
    ? referenceData.prefixes.map((prefix) => ({
        value: String(prefix.id),
        label: prefix.prefix || formatReferenceValue(prefix.id, 'prefixes')
      }))
    : [];
  
  // Add a "None" option
  const selectOptions = [
    { value: '', label: 'None' },
    ...prefixOptions
  ];
  
  return (
    <Select
      label={label}
      value={value ? String(value) : ''}
      onChange={(selectedValue) => {
        console.log(`${name} Prefix selected:`, selectedValue);
        onChange(selectedValue ? Number(selectedValue) : null);
      }}
      data={selectOptions}
      error={error}
      placeholder="Select Prefix"
      searchable
      clearable
    />
  );
});

/**
 * IP Address field
 */
export const IPAddressField = memo(({
  name,
  label,
  value,
  onChange,
  error
}: CommonFieldProps) => {
  return (
    <TextInput
      label={label}
      value={value || ''}
      onChange={(e) => onChange(e.currentTarget.value)}
      error={error}
      placeholder="192.168.1.1/24"
    />
  );
});
