import React, { memo } from 'react';
import { SegmentedControl, Text } from '@mantine/core';

interface StatusFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (name: string, value: string) => void;
  error?: string;
}

/**
 * Status field component (segmented control)
 */
export const StatusField = memo(({ name, label, value, onChange, error }: StatusFieldProps) => {
  // Status options
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'reserved', label: 'Reserved' },
    { value: 'deprecated', label: 'Deprecated' },
    { value: 'available', label: 'Available' }
  ];
  
  return (
    <div>
      <Text size="sm" fw={500} mb={5}>{label}</Text>
      <SegmentedControl
        data={statusOptions}
        value={value || 'active'}
        onChange={(val) => onChange(name, val)}
        fullWidth
      />
      {error && <Text color="red" size="xs" mt={5}>{error}</Text>}
    </div>
  );
});
