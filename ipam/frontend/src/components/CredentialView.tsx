import { Stack } from '@mantine/core';
import { IPAMTable } from './IPAMTable';

export function CredentialView() {
  return (
    <Stack gap="md">
      {/* Credential table */}
      <IPAMTable tableName="credentials" />
    </Stack>
  );
}
