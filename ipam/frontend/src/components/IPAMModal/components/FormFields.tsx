import React, { memo } from 'react';
import {
  TextInput,
  NumberInput,
  Switch,
  Textarea,
  Select,
  MultiSelect,
  SegmentedControl,
  Text,
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

// Helper function to get the field label
const getFieldLabel = (name: string) => {
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

// Memoized Form Field Components
const BooleanField = memo(({
  name,
  label,
  value,
  onChange,
  error
}: {
  name: string;
  label: string;
  value: boolean;
  onChange: (name: string, value: boolean) => void;
  error?: string
}) => (
  <Switch
    label={label}
    checked={!!value}
    onChange={(event) => onChange(name, event.currentTarget.checked)}
    error={error}
  />
));

const NumberField = memo(({
  name,
  label,
  value,
  onChange,
  error,
  required
}: {
  name: string;
  label: string;
  value: number | null;
  onChange: (name: string, value: number | null) => void;
  error?: string;
  required?: boolean
}) => (
  <NumberInput
    label={label}
    value={value || ''}
    onChange={(value) => onChange(name, value)}
    error={error}
    required={required}
    placeholder={`Enter ${label}`}
  />
));

const StatusField = memo(({
  name,
  label,
  value,
  onChange,
  required
}: {
  name: string;
  label: string;
  value: string;
  onChange: (name: string, value: string) => void;
  required?: boolean
}) => (
  <div>
    <Text size="sm" fw={500} mb={5}>{label}{required ? ' *' : ''}</Text>
    <SegmentedControl
      fullWidth
      value={value || 'active'}
      onChange={(value) => onChange(name, value)}
      data={[
        { label: 'Active', value: 'active' },
        { label: 'Reserved', value: 'reserved' },
        { label: 'Deprecated', value: 'deprecated' },
        { label: 'Available', value: 'available' }
      ]}
    />
  </div>
));

const TextField = memo(({
  name,
  label,
  value,
  onChange,
  error,
  required,
  placeholder,
  isTextarea = false
}: {
  name: string;
  label: string;
  value: string;
  onChange: (name: string, value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  isTextarea?: boolean;
}) => {
  if (isTextarea) {
    return (
      <Textarea
        label={label}
        value={value || ''}
        onChange={(e) => onChange(name, e.currentTarget.value)}
        error={error}
        required={required}
        placeholder={placeholder || `Enter ${label}`}
        minRows={3}
      />
    );
  }

  return (
    <TextInput
      label={label}
      value={value || ''}
      onChange={(e) => onChange(name, e.currentTarget.value)}
      error={error}
      required={required}
      placeholder={placeholder || `Enter ${label}`}
    />
  );
});

const ReferenceField = memo(({
  name,
  label,
  value,
  onChange,
  error,
  required,
  referenceTable,
  referenceData,
  formatReferenceValue,
  allowMultiple = false
}: {
  name: string;
  label: string;
  value: any;
  onChange: (name: string, value: any) => void;
  error?: string;
  required?: boolean;
  referenceTable: string;
  referenceData: Record<string, any[]>;
  formatReferenceValue: (value: number | string | null, tableName: string) => string;
  allowMultiple?: boolean;
}) => {
  // Get the data for the reference table
  const options = (referenceData[referenceTable] || []).map(item => ({
    value: item.id.toString(),
    label: item.name || item.display_name || item.rd || formatReferenceValue(item.id, referenceTable)
  }));

  if (allowMultiple) {
    return (
      <MultiSelect
        label={label}
        data={options}
        value={Array.isArray(value) ? value.map(v => v.toString()) : []}
        onChange={(selectedValues) => onChange(name, selectedValues.map(v => Number(v)))}
        error={error}
        required={required}
        placeholder={`Select ${label}`}
        searchable
      />
    );
  }

  return (
    <Select
      label={label}
      data={options}
      value={value ? value.toString() : null}
      onChange={(value) => onChange(name, value ? Number(value) : null)}
      error={error}
      required={required}
      placeholder={`Select ${label}`}
      searchable
      clearable
    />
  );
});

/**
 * Renders a form field based on the column configuration
 */
export const FormField = memo(function FormField({
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

  // Skip internal fields
  if (column.name === 'vlanIdRanges') return null;

  // Generate label for the field
  const label = getFieldLabel(column.name);

  // Generate field based on column type
  switch (column.type) {
    case 'boolean':
      return (
        <BooleanField
          name={column.name}
          label={label}
          value={formData[column.name]}
          onChange={handleChange}
          error={validationErrors[column.name]}
        />
      );

    case 'number':
      return (
        <NumberField
          name={column.name}
          label={label}
          value={formData[column.name]}
          onChange={handleChange}
          error={validationErrors[column.name]}
          required={column.required}
        />
      );

    case 'string':
      // Special handling for status fields
      if (column.name === 'status') {
        return (
          <StatusField
            name={column.name}
            label={label}
            value={formData[column.name]}
            onChange={handleChange}
            required={column.required}
          />
        );
      }

      // Special handling for description fields
      if (column.name === 'description' || column.name === 'comments') {
        return (
          <TextField
            name={column.name}
            label={label}
            value={formData[column.name]}
            onChange={handleChange}
            error={validationErrors[column.name]}
            required={column.required}
            isTextarea={true}
          />
        );
      }

      // Special handling for reference fields
      if (column.reference) {
        return (
          <ReferenceField
            name={column.name}
            label={label}
            value={formData[column.name]}
            onChange={handleChange}
            error={validationErrors[column.name]}
            required={column.required}
            referenceTable={column.reference}
            referenceData={referenceData}
            formatReferenceValue={formatReferenceValue}
          />
        );
      }

      // Special handling for CIDR notation
      if (column.name === 'prefix') {
        return (
          <TextField
            name={column.name}
            label={label}
            value={formData[column.name]}
            onChange={handleChange}
            error={validationErrors[column.name]}
            required={column.required}
            placeholder="e.g., 192.168.1.0/24"
          />
        );
      }

      // Default text field
      return (
        <TextField
          name={column.name}
          label={label}
          value={formData[column.name]}
          onChange={handleChange}
          error={validationErrors[column.name]}
          required={column.required}
        />
      );

    default:
      return (
        <TextInput
          label={label}
          value={formData[column.name] || ''}
          onChange={(e) => handleChange(column.name, e.currentTarget.value)}
          error={validationErrors[column.name]}
          required={column.required}
        />
      );
  }
});

interface VlanIdRangesFieldProps {
  vlanIdRanges: string;
  setVlanIdRanges: (value: string) => void;
  validationErrors: ValidationErrors;
}

/**
 * Specialized field for VLAN ID ranges
 */
export const VlanIdRangesField = memo(function VlanIdRangesField({
  vlanIdRanges,
  setVlanIdRanges,
  validationErrors
}: VlanIdRangesFieldProps) {
  return (
    <div>
      <Text size="sm" fw={500} mb={5}>VLAN ID Ranges</Text>
      <Textarea
        placeholder="Enter VLAN ID ranges (e.g., 100-200, 300-400)"
        value={vlanIdRanges}
        onChange={(e) => setVlanIdRanges(e.currentTarget.value)}
        error={validationErrors.vlanIdRanges}
        minRows={3}
      />
      <Text size="xs" mt={5} c="dimmed">
        Enter ranges separated by commas (e.g., 100-200, 300-400)
      </Text>
    </div>
  );
});
