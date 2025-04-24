import React, { memo } from 'react';
import {
  TextInput,
  NumberInput,
  Switch,
  Textarea,
  Text,
} from '@mantine/core';
import { CommonFieldProps } from './types';

/**
 * Boolean field component (switch)
 */
export const BooleanField = memo(({
  name,
  label,
  value,
  onChange,
  error
}: CommonFieldProps) => {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text size="sm" fw={500}>{label}</Text>
        <Switch
          checked={value === true}
          onChange={(e) => onChange(e.currentTarget.checked)}
          error={error}
        />
      </div>
      {error && <Text c="red" size="xs">{error}</Text>}
    </div>
  );
});

/**
 * Text field component
 */
export const TextField = memo(({
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
    />
  );
});

/**
 * Number field component
 */
export const NumberField = memo(({
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
    />
  );
});

/**
 * Textarea field component
 */
export const TextareaField = memo(({
  name,
  label,
  value,
  onChange,
  error
}: CommonFieldProps) => {
  return (
    <Textarea
      label={label}
      value={value || ''}
      onChange={(e) => onChange(e.currentTarget.value)}
      error={error}
      minRows={3}
    />
  );
});
