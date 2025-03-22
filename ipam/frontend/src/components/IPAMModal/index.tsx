import React from 'react';
import {
  Modal,
  Stack,
  LoadingOverlay,
  Group,
  Button,
  Alert
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { IPAMModalProps } from './types';
import { useIPAMForm, useReferenceData } from '../../hooks';
import { FormField, VlanIdRangesField } from './components/FormFields';
import { ErrorBoundary } from '../common/ErrorBoundary';

export function IPAMModal({ show, onHide, tableName, schema, item }: IPAMModalProps) {
  // Get reference table names from schema
  const referenceTableNames = [...new Set(schema
    .filter(col => col.reference)
    .map(col => col.reference!)
  )];

  // Use our new hooks for form handling and reference data
  const {
    formData,
    handleChange,
    validationErrors,
    setValidationErrors,
    isSubmitting,
    submitForm,
    vlanIdRanges,
    setVlanIdRanges
  } = useIPAMForm({
    tableName,
    schema,
    item,
    onSuccess: onHide
  });

  const {
    referenceData,
    isLoading,
    isError,
    getReferenceItem,
    formatReferenceValue
  } = useReferenceData(referenceTableNames, show);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitForm(e);
    if (success) {
      onHide();
    }
  };

  if (isError) {
    return (
      <Modal opened={show} onClose={onHide} title="Error">
        <div>Failed to load reference data. Please try again.</div>
      </Modal>
    );
  }

  return (
    <ErrorBoundary>
      <Modal
        opened={show}
        onClose={onHide}
        title={`${item ? 'Edit' : 'Add'} ${tableName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`}
        styles={{
          header: { backgroundColor: '#1A1B1E', color: 'white' },
          content: { backgroundColor: '#1A1B1E' }
        }}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack pos="relative" gap="md">
            <LoadingOverlay visible={isLoading || isSubmitting} />

            {validationErrors['general'] && (
              <Alert
                title="Error"
                color="red"
                variant="filled"
                mb="md"
                withCloseButton={false}
                icon={<IconAlertCircle size="1.1rem" />}
              >
                {validationErrors['general']}
              </Alert>
            )}

            {/* Special handling for VLAN ID ranges in VLAN groups */}
            {tableName === 'vlan_groups' && (
              <VlanIdRangesField
                vlanIdRanges={vlanIdRanges}
                setVlanIdRanges={setVlanIdRanges}
                validationErrors={validationErrors}
              />
            )}

            {/* Render form fields based on schema */}
            {schema.map(column => (
              <FormField
                key={column.name}
                column={column}
                formData={formData}
                handleChange={(name, value) => handleChange(name, value)}
                validationErrors={validationErrors}
                setValidationErrors={setValidationErrors}
                tableName={tableName}
                referenceData={referenceData}
                getReferenceItem={getReferenceItem}
                formatReferenceValue={formatReferenceValue}
              />
            ))}

            <Group justify="flex-end" mt="md">
              <Button variant="outline" onClick={onHide} color="gray">
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {item ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </ErrorBoundary>
  );
}
