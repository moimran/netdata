import React, { memo } from 'react';
import { Select, NumberInput } from '@mantine/core';
import { CommonFieldProps, ReferenceFieldProps } from './types';

/**
 * VLAN Group field for VLANs
 */
export const VLANGroupField = memo(({
  name,
  label,
  value,
  onChange,
  error,
  referenceTable,
  referenceData,
  formatReferenceValue
}: ReferenceFieldProps) => {
  const hasVlanGroups = referenceData.vlan_groups && referenceData.vlan_groups.length > 0;
  const vlanGroupOptions = hasVlanGroups
    ? referenceData.vlan_groups.map((group) => ({
        value: String(group.id),
        label: group.name || formatReferenceValue(group.id, 'vlan_groups')
      }))
    : [];
  
  // Add a "None" option
  const selectOptions = [
    { value: '', label: 'None' },
    ...vlanGroupOptions
  ];
  
  return (
    <Select
      label={label}
      value={value ? String(value) : ''}
      onChange={(selectedValue) => {
        console.log(`${name} VLAN Group selected:`, selectedValue);
        onChange(selectedValue ? Number(selectedValue) : null);
      }}
      data={selectOptions}
      error={error}
      searchable
      clearable
      placeholder="Select VLAN Group"
    />
  );
});

/**
 * Tenant field for VLANs
 */
export const VLANTenantField = memo(({
  name,
  label,
  value,
  onChange,
  error,
  referenceTable,
  referenceData,
  formatReferenceValue
}: ReferenceFieldProps) => {
  const hasTenants = referenceData.tenants && referenceData.tenants.length > 0;
  const tenantOptions = hasTenants
    ? referenceData.tenants.map((tenant) => ({
        value: String(tenant.id),
        label: tenant.name || formatReferenceValue(tenant.id, 'tenants')
      }))
    : [];
  
  // Add a "None" option
  const selectOptions = [
    { value: '', label: 'None' },
    ...tenantOptions
  ];
  
  return (
    <Select
      label={label}
      value={value ? String(value) : ''}
      onChange={(selectedValue) => {
        console.log(`${name} VLAN Group selected:`, selectedValue);
        onChange(selectedValue ? Number(selectedValue) : null);
      }}
      data={selectOptions}
      error={error}
      searchable
      clearable
      placeholder="Select VLAN Group"
    />
  );
});

/**
 * VLAN ID field
 */
export const VLANIDField = memo(({
  name,
  label,
  value,
  onChange,
  error
}: CommonFieldProps) => {
  return (
    <NumberInput
      label={label}
      value={value || ''}
      onChange={(value) => onChange(value)}
      error={error}
      min={1}
      max={4094}
    />
  );
});
