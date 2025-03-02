import { Stack } from '@mantine/core';
import { IPAMTable } from './IPAMTable';

export function DeviceView() {
  return (
    <Stack gap="md">
      {/* Device table */}
      <IPAMTable tableName="devices" />
    </Stack>
  );
}
