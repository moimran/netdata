import React, { useMemo, useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import {
  Modal,
  Stack,
  LoadingOverlay,
  Group,
  Button,
  Alert,
  MultiSelect,
  Select,
  TextInput,
  Textarea
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useFormState } from '../../hooks/forms/useFormState';
import { useReferenceData } from '../../hooks/api/useReferenceData';
import { useAllRouteTargets } from '../../hooks/api/useAllRouteTargets';
import { FormField, VlanIdRangesField } from './components/FormFields';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { TABLE_SCHEMAS } from '../IPAMTable/schemas';

interface IPAMModalProps {
  tableName: string;
  data?: any;
  onClose: () => void;
}

export function IPAMModal({ tableName, data, onClose }: IPAMModalProps) {
  // Get schema for this table
  const schema = useMemo(() => TABLE_SCHEMAS[tableName as keyof typeof TABLE_SCHEMAS] || [], [tableName]);

  // Get reference table names from schema
  const referenceTableNames: string[] = useMemo(() => {
    // Extract reference tables from schema
    const tables = [...new Set(schema
      .filter((col: any) => col.reference)
      .map((col: any) => col.reference!)
    )];
    
    // Special case for sites: always include regions and site_groups
    if (tableName === 'sites') {
      const requiredTables = ['regions', 'site_groups'];
      requiredTables.forEach(table => {
        if (!tables.includes(table)) {
          tables.push(table);
        }
      });
    }
    
    console.log('Reference tables needed for', tableName, ':', tables);
    return tables;
  }, [schema, tableName]);

  // Use our hooks for form handling and reference data
  // Initialize form state with data from the item being edited or empty object with defaults for new items
  const initialValues = useMemo(() => {
    if (data) {
      return data; // Use existing data for edit mode
    }
    
    // For new items, add default values based on the table type
    const defaults: Record<string, any> = {};
    
    // Add default status for tables that require it
    if (tableName === 'sites') {
      defaults.status = 'active';
    }
    
    console.log(`Initializing form for ${tableName} with defaults:`, defaults);
    return defaults;
  }, [data, tableName]);

  // State for VLAN ID ranges (only used in VLAN groups)
  const [vlanIdRanges, setVlanIdRanges] = useState<string>('');
  
  // Use the form state hook
  const {
    formData,
    validationErrors,
    handleChange,
    handleSubmit,
    isSubmitting,
    setValidationErrors
  } = useFormState({
    initialValues,
    onSubmit: async (values) => {
      try {
        console.log('Submitting form data:', { tableName, values, isEdit: !!data });
        
        // For sites, ensure status is included
        if (tableName === 'sites' && !values.status) {
          values.status = 'active';
        }
        
        // Log the final form data being submitted
        console.log('Final form data being submitted:', values);
        
        // Determine if this is a create or update operation
        if (data) {
          // Update existing item
          const response = await apiClient.put(`/${tableName}/${data.id}`, values);
          console.log('Updated item:', response.data);
        } else {
          // Create new item
          const response = await apiClient.post(`/${tableName}`, values);
          console.log('Created new item:', response.data);
        }
        
        // If successful, close the modal
        onClose();
      } catch (error: any) {
        console.error('Error submitting form:', error);
        
        // Handle validation errors from the API
        if (error.response && error.response.data && error.response.data.detail) {
          // Format API validation errors
          const apiErrors = error.response.data.detail;
          const formattedErrors: Record<string, string> = {};
          
          if (Array.isArray(apiErrors)) {
            // Handle array of validation errors
            apiErrors.forEach(err => {
              if (err.loc && err.loc.length > 1) {
                const fieldName = err.loc[1];
                formattedErrors[fieldName] = err.msg;
              }
            });
          } else if (typeof apiErrors === 'string') {
            // Handle string error message
            formattedErrors.general = apiErrors;
          }
          
          setValidationErrors(formattedErrors);
        } else {
          // Generic error message
          setValidationErrors({
            general: 'An error occurred while saving. Please try again.'
          });
        }
      }
    }
  });

  // Use the reference data hook to fetch data for all reference tables
  const { referenceData, isLoading, isError, refetch, getReferenceItem, formatReferenceValue } = useReferenceData(referenceTableNames);
  
  // Debug reference data loading
  useEffect(() => {
    console.log('Reference data loading state:', {
      isLoading,
      isError,
      tableName,
      referenceTableNames
    });
    
    if (!isLoading && !isError) {
      console.log('Reference data loaded for ' + tableName + ':', {
        availableTables: Object.keys(referenceData),
        referenceTableNames,
        regionsData: referenceData.regions || [],
        regionsCount: referenceData.regions ? referenceData.regions.length : 0,
        siteGroupsData: referenceData.site_groups || [],
        siteGroupsCount: referenceData.site_groups ? referenceData.site_groups.length : 0,
        formData
      });
      
      // Force a refetch if we're missing required reference data
      if (tableName === 'sites') {
        let shouldRefetch = false;
        
        if (referenceTableNames.includes('regions') && !referenceData.regions) {
          console.log('Missing regions data for sites form, will refetch');
          shouldRefetch = true;
        }
        if (referenceTableNames.includes('site_groups') && !referenceData.site_groups) {
          console.log('Missing site_groups data for sites form, will refetch');
          shouldRefetch = true;
        }
        
        if (shouldRefetch) {
          console.log('Triggering refetch of reference data for sites form');
          refetch();
        }
      }
      
      // Log if regions data is needed but not available (not an error for first region)
      if (tableName === 'regions' && (!referenceData.regions || referenceData.regions.length === 0)) {
        console.log('No existing regions available for parent selection', {
          referenceTableNames,
          availableTables: Object.keys(referenceData)
        });
        // This is normal when creating the first region
      }
    }
  }, [referenceData, isLoading, isError, tableName, referenceTableNames, formData]);

  // --- Add VRF target fetching ---
  const { data: allRouteTargets, isLoading: isLoadingTargets, isError: isErrorTargets } = useAllRouteTargets();
  // Format data for MultiSelect
  const routeTargetOptions = useMemo(() => {
    if (!allRouteTargets) return [];
    return allRouteTargets.map((rt: any) => ({
      value: String(rt.id),
      label: `${rt.name} (${rt.slug || 'no slug'})`
    }));
  }, [allRouteTargets]);
  // --- End VRF target fetching ---

  // Handle form submission
  const onSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    // Call the handleSubmit function from useFormState
    await handleSubmit(e);
  };

  const isOpen = true; // Modal is always open when rendered

  if (isError) {
    return (
      <Modal opened={isOpen} onClose={onClose} title="Error">
        <div>Failed to load reference data. Please try again.</div>
      </Modal>
    );
  }

  const title = `${data ? 'Edit' : 'Add'} ${tableName.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;

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
        <form onSubmit={onSubmitForm}>
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

            {/* Special handling for sites form */}
            {tableName === 'sites' && (
              <>
                {/* Name field */}
                <TextInput
                  label="Name"
                  value={formData.name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('name', e.currentTarget.value)}
                  error={validationErrors.name}
                  required
                />
                
                {/* Slug field */}
                <TextInput
                  label="Slug"
                  value={formData.slug || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('slug', e.currentTarget.value)}
                  error={validationErrors.slug}
                />
                
                {/* Status field - required */}
                <Select
                  label="Status"
                  data={[
                    { value: 'active', label: 'Active' },
                    { value: 'reserved', label: 'Reserved' },
                    { value: 'deprecated', label: 'Deprecated' },
                    { value: 'available', label: 'Available' }
                  ]}
                  value={formData.status || 'active'}
                  onChange={(value: string | null) => handleChange('status', value || 'active')}
                  error={validationErrors.status}
                  required
                  searchable
                />
                
                {/* Description field */}
                <Textarea
                  label="Description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.currentTarget.value)}
                  error={validationErrors.description}
                  minRows={3}
                />
                
                {/* Custom Region dropdown */}
                <Select
                  label="Region"
                  data={(referenceData.regions || []).map((region: any) => ({
                    value: region.id.toString(),
                    label: region.name || `Region #${region.id}`
                  }))}
                  value={formData.region_id ? formData.region_id.toString() : null}
                  onChange={(value: string | null) => handleChange('region_id', value ? Number(value) : null)}
                  error={validationErrors.region_id}
                  placeholder="Select Region"
                  searchable
                  clearable
                />
                
                {/* Custom Site Group dropdown */}
                <Select
                  label="Site Group"
                  data={(referenceData.site_groups || []).map((siteGroup: any) => ({
                    value: siteGroup.id.toString(),
                    label: siteGroup.name || `Site Group #${siteGroup.id}`
                  }))}
                  value={formData.site_group_id ? formData.site_group_id.toString() : null}
                  onChange={(value: string | null) => handleChange('site_group_id', value ? Number(value) : null)}
                  error={validationErrors.site_group_id}
                  placeholder="Select Site Group"
                  searchable
                  clearable
                />
              </>
            )}
            
            {/* Render form fields for non-sites tables */}
            {tableName !== 'sites' && schema.map((column: any) => (
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

            {/* --- Add VRF target selection --- */}
            {tableName === 'vrfs' && (
              <Stack gap="md">
                <LoadingOverlay visible={isLoadingTargets} />
                {isErrorTargets ? (
                  <Alert color="red" title="Error loading Route Targets">
                    Could not load available Route Targets. Please try again.
                  </Alert>
                ) : (
                  <>
                    <MultiSelect
                      label="Import Route Targets"
                      placeholder="Select import targets"
                      data={routeTargetOptions}
                      value={formData.import_target_ids || []} // Ensure value is array
                      onChange={(value) => handleChange('import_target_ids', value)}
                      searchable
                      clearable
                      nothingFoundMessage="No targets found"
                      error={validationErrors['import_target_ids']}
                    />
                    <MultiSelect
                      label="Export Route Targets"
                      placeholder="Select export targets"
                      data={routeTargetOptions}
                      value={formData.export_target_ids || []} // Ensure value is array
                      onChange={(value) => handleChange('export_target_ids', value)}
                      searchable
                      clearable
                      nothingFoundMessage="No targets found"
                      error={validationErrors['export_target_ids']}
                    />
                  </>
                )}
              </Stack>
            )}
            {/* --- End VRF target selection --- */}

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
