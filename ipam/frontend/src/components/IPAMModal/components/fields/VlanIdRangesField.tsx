import React, { memo, useEffect } from 'react';
import { Textarea, Text } from '@mantine/core';
import { VlanIdRangesFieldProps } from './types';

/**
 * Specialized field for VLAN ID ranges
 */
export const VlanIdRangesField = memo(function VlanIdRangesField({
  vlanIdRanges,
  setVlanIdRanges,
  validationErrors
}: VlanIdRangesFieldProps) {
  // Add debugging to see what values are being passed to the component
  console.log('VlanIdRangesField received:', { vlanIdRanges, validationErrors });
  
  // Use useEffect to log when the component renders or updates
  useEffect(() => {
    console.log('VlanIdRangesField rendered/updated with:', vlanIdRanges);
  }, [vlanIdRanges]);
  
  return (
    <div>
      <Text size="sm" fw={500} mb={5}>VLAN ID Ranges</Text>
      <Textarea
        placeholder="Enter VLAN ID ranges (e.g., 100-200, 300-400)"
        value={vlanIdRanges || ''}
        onChange={(e) => {
          console.log('VlanIdRangesField onChange:', e.currentTarget.value);
          setVlanIdRanges(e.currentTarget.value);
        }}
        error={validationErrors.vlanIdRanges}
        minRows={3}
      />
      <Text size="xs" mt={5} c="dimmed">
        Enter ranges separated by commas (e.g., 100-200, 300-400)
      </Text>
    </div>
  );
});
