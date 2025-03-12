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
import { useFormData } from './hooks/useFormData';
import { useReferenceData } from './hooks/useReferenceData';
import { useFormSubmit } from './hooks/useFormSubmit';
import { FormField, VlanIdRangesField } from './components/FormFields';

export function IPAMModal({ show, onHide, tableName, schema, item }: IPAMModalProps) {
  // Get reference table names from schema
  const referenceTableNames = [...new Set(schema
    .filter(col => col.reference)
    .map(col => col.reference!)
  )];

  // Use custom hooks for form data, reference data, and form submission
  const {
    formData,
    setFormData,
    validationErrors,
    setValidationErrors,
    vlanIdRanges,
    setVlanIdRanges,
    loading,
    setLoading,
    validateForm,
    handleVlanIdChange,
    prepareSubmissionData
  } = useFormData({ schema, item, tableName });

  const {
    referenceData,
    isLoading,
    isError,
    getReferenceData,
    selectedVlanGroup,
    setSelectedVlanGroup
  } = useReferenceData({
    referenceTableNames,
    show,
    tableName,
    item
  });

  const mutation = useFormSubmit({
    tableName,
    item,
    onHide,
    setValidationErrors,
    setLoading
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate form
    const errors = validateForm();
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setLoading(false);
      return;
    }
    
    // Prepare data for submission
    const submissionData = prepareSubmissionData();
    
    // Submit form
    mutation.mutate(submissionData, {
      onError: () => {
        setLoading(false);
      },
      onSuccess: () => {
        setLoading(false);
      }
    });
  };

  if (isError) {
    return (
      <Modal opened={show} onClose={onHide} title="Error">
        <div>Failed to load reference data. Please try again.</div>
      </Modal>
    );
  }

  return (
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
          <LoadingOverlay visible={isLoading || mutation.isPending || loading} />
          
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
              setFormData={setFormData}
              validationErrors={validationErrors}
              setValidationErrors={setValidationErrors}
              tableName={tableName}
              getReferenceData={getReferenceData}
              selectedVlanGroup={selectedVlanGroup}
              handleVlanIdChange={handleVlanIdChange}
            />
          ))}

          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={onHide} color="gray">
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending || loading}>
              {item ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
