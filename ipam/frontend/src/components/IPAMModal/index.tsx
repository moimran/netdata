import React, { useMemo } from 'react';
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
import { TABLE_SCHEMAS } from '../IPAMTable/schemas';

export function IPAMModal({ tableName, data, onClose }: IPAMModalProps) {
  // Get schema for this table
  const schema = useMemo(() => TABLE_SCHEMAS[tableName] || [], [tableName]);

  // Get reference table names from schema
  const referenceTableNames = useMemo(() => [...new Set(schema
    .filter(col => col.reference)
    .map(col => col.reference!)
  )], [schema]);

  // Use our hooks for form handling and reference data
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
    item: data,
    onSuccess: onClose
  });

  const {
    referenceData,
    isLoading,
    isError,
    getReferenceItem,
    formatReferenceValue
  } = useReferenceData(referenceTableNames);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitForm(e);
    if (success) {
      onClose();
    }
  };

  const isOpen = true; // Modal is always open when rendered

  if (isError) {
    return (
      <Modal opened={isOpen} onClose={onClose} title="Error">
        <div>Failed to load reference data. Please try again.</div>
      </Modal>
    );
  }

  const title = `${data ? 'Edit' : 'Add'} ${tableName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;

  return (
    <ErrorBoundary>
      <Modal
        opened={isOpen}
        onClose={onClose}
        title={title}
        styles={{
          header: {
            backgroundColor: '#1A1B1E',
            color: '#f9fafb',
            borderBottom: '1px solid #374151',
            fontWeight: 600
          },
          content: {
            backgroundColor: '#1A1B1E',
            color: '#f9fafb'
          }
        }}
        size="lg"
        classNames={{
          title: 'ipam-modal-title'
        }}
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

            {/* Render form fields for each column in the schema */}
            {schema.map((column) => (
              <FormField
                key={column.name}
                column={column}
                formData={formData}
                handleChange={handleChange}
                validationErrors={validationErrors}
                setValidationErrors={setValidationErrors}
                tableName={tableName}
                referenceData={referenceData}
                getReferenceItem={getReferenceItem}
                formatReferenceValue={formatReferenceValue}
              />
            ))}

            <Group justify="flex-end" mt="xl">
              <Button
                variant="outline"
                onClick={onClose}
                className="ipam-cancel-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                className="ipam-confirm-button"
              >
                {data ? 'Update' : 'Create'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </ErrorBoundary>
  );
}
