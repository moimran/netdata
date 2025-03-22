import React from 'react';
import {
  TextInput,
  NumberInput,
  Switch,
  Textarea,
  Select,
  MultiSelect,
  SegmentedControl,
  Text,
  Group,
  SimpleGrid
} from '@mantine/core';
import { Column } from '../../IPAMTable/schemas';
import { ValidationErrors } from '../../../hooks/forms/useFormState';

interface FormFieldProps {
  column: Column;
  formData: Record<string, any>;
  handleChange: (name: string, value: any) => void;
  validationErrors: ValidationErrors;
  setValidationErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  tableName: string;
  referenceData: Record<string, any[]>;
  getReferenceItem: (tableName: string, id: number | string | null) => any;
  formatReferenceValue: (value: number | string | null, tableName: string) => string;
}

/**
 * Renders a form field based on the column configuration
 */
export function FormField({
  column,
  formData,
  handleChange,
  validationErrors,
  setValidationErrors,
  tableName,
  referenceData,
  getReferenceItem,
  formatReferenceValue
}: FormFieldProps) {
  // Skip ID field since it's auto-generated
  if (column.name === 'id') return null;

  // Helper function to get the field label
  const getFieldLabel = (name: string) => {
    if (name === 'vid') return 'VLAN ID';
    if (name === 'rd') return 'Route Distinguisher';

    // Handle _id fields by removing suffix and capitalizing
    if (name.endsWith('_id')) {
      return name.replace('_id', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    // Default label formatting
    return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Generate label for the field
  const label = getFieldLabel(column.name);

  // Skip internal fields
  if (column.name === 'vlanIdRanges') return null;

  // Generate field based on column type
  switch (column.type) {
    case 'boolean':
      return (
        <Switch
          label={label}
          checked={!!formData[column.name]}
          onChange={(event) => handleChange(column.name, event.currentTarget.checked)}
          error={validationErrors[column.name]}
        />
      );

    case 'number':
      return (
        <NumberInput
          label={label}
          value={formData[column.name] || ''}
          onChange={(value) => handleChange(column.name, value)}
          error={validationErrors[column.name]}
          required={column.required}
          placeholder={`Enter ${label}`}
        />
      );

    case 'string':
      // Special handling for status fields
      if (column.name === 'status') {
        return (
          <div>
            <Text size="sm" fw={500} mb={5}>{label}{column.required ? ' *' : ''}</Text>
            <SegmentedControl
              fullWidth
              value={formData[column.name] || 'active'}
              onChange={(value) => handleChange(column.name, value)}
              data={[
                { label: 'Active', value: 'active' },
                { label: 'Reserved', value: 'reserved' },
                { label: 'Deprecated', value: 'deprecated' },
                { label: 'Available', value: 'available' }
              ]}
            />
            {validationErrors[column.name] && (
              <Text size="xs" c="red" mt={5}>{validationErrors[column.name]}</Text>
            )}
          </div>
        );
      }

      // Special handling for role fields
      if (column.name === 'role' && tableName === 'ip_addresses') {
        return (
          <Select
            label={label}
            value={formData[column.name] || ''}
            onChange={(value) => handleChange(column.name, value)}
            error={validationErrors[column.name]}
            required={column.required}
            placeholder={`Select ${label}`}
            data={[
              { label: 'Loopback', value: 'loopback' },
              { label: 'Secondary', value: 'secondary' },
              { label: 'Anycast', value: 'anycast' },
              { label: 'VIP', value: 'vip' },
              { label: 'VRRP', value: 'vrrp' },
              { label: 'HSRP', value: 'hsrp' },
              { label: 'GLBP', value: 'glbp' },
              { label: 'CARP', value: 'carp' },
              { label: 'Other', value: 'other' }
            ]}
          />
        );
      }

      // Reference fields (foreign keys)
      if (column.reference) {
        const referenceItems = referenceData[column.reference] || [];

        // Create options from reference data
        const options = referenceItems.map((item: any) => ({
          value: String(item.id),
          label: item.name || item.rd || String(item.id)
        }));

        return (
          <Select
            label={label}
            value={formData[column.name] ? String(formData[column.name]) : null}
            onChange={(value) => handleChange(column.name, value ? parseInt(value, 10) : null)}
            error={validationErrors[column.name]}
            required={column.required}
            placeholder={`Select ${label}`}
            data={options}
            searchable
            clearable
          />
        );
      }

      // Special handling for description fields - use textarea
      if (column.name === 'description') {
        return (
          <Textarea
            label={label}
            value={formData[column.name] || ''}
            onChange={(event) => handleChange(column.name, event.currentTarget.value)}
            error={validationErrors[column.name]}
            required={column.required}
            placeholder={`Enter ${label}`}
            minRows={3}
          />
        );
      }

      // Default text input for other string fields
      return (
        <TextInput
          label={label}
          value={formData[column.name] || ''}
          onChange={(event) => handleChange(column.name, event.currentTarget.value)}
          error={validationErrors[column.name]}
          required={column.required}
          placeholder={`Enter ${label}`}
        />
      );

    default:
      return (
        <TextInput
          label={label}
          value={formData[column.name] || ''}
          onChange={(event) => handleChange(column.name, event.currentTarget.value)}
          error={validationErrors[column.name]}
          required={column.required}
          placeholder={`Enter ${label}`}
        />
      );
  }
}

interface VlanIdRangesFieldProps {
  vlanIdRanges: string;
  setVlanIdRanges: (value: string) => void;
  validationErrors: ValidationErrors;
}

/**
 * Special field for VLAN ID ranges in VLAN groups
 */
export function VlanIdRangesField({
  vlanIdRanges,
  setVlanIdRanges,
  validationErrors
}: VlanIdRangesFieldProps) {
  return (
    <div>
      <TextInput
        label="VLAN ID Ranges"
        value={vlanIdRanges}
        onChange={(event) => setVlanIdRanges(event.currentTarget.value)}
        error={validationErrors.vlanIdRanges}
        required
        placeholder="e.g. 1-1000,2000-3000"
        description="Specify ranges of VLAN IDs (e.g. 100-199,300-399)"
      />
    </div>
  );
}
