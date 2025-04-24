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
import { slugify } from '../../utils/slugify';
import { useQueryClient } from '@tanstack/react-query';
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

  // Get query client for cache invalidation
  const queryClient = useQueryClient();

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
    
    // Special case for locations: always include sites and locations
    if (tableName === 'locations') {
      const requiredTables = ['sites', 'locations'];
      requiredTables.forEach(table => {
        if (!tables.includes(table)) {
          tables.push(table);
        }
      });
    }
    
    // Special case for aggregates: always include rirs
    if (tableName === 'aggregates') {
      const requiredTables = ['rirs'];
      requiredTables.forEach(table => {
        if (!tables.includes(table)) {
          tables.push(table);
        }
      });
    }
    
    // Special case for prefixes: include all reference tables needed
    if (tableName === 'prefixes') {
      const requiredTables = ['vrfs', 'sites', 'vlans', 'tenants', 'roles', 'aggregates'];
      requiredTables.forEach(table => {
        if (!tables.includes(table)) {
          tables.push(table);
        }
      });
      
      // Log the required tables for prefixes
      console.log('Required reference tables for prefixes:', requiredTables);
    }
    
    // Special case for IP ranges: include VRFs and tenants
    if (tableName === 'ip_ranges') {
      const requiredTables = ['vrfs', 'tenants', 'sites'];
      requiredTables.forEach(table => {
        if (!tables.includes(table)) {
          tables.push(table);
        }
      });
      
      // Log the required tables for IP ranges
      console.log('Required reference tables for IP ranges:', requiredTables);
    }
    
    // Special case for IP addresses: include VRFs, tenants, prefixes, and roles
    if (tableName === 'ip_addresses') {
      const requiredTables = ['vrfs', 'tenants', 'prefixes', 'roles'];
      requiredTables.forEach(table => {
        if (!tables.includes(table)) {
          tables.push(table);
        }
      });
      
      // Log the required tables for IP addresses
      console.log('Required reference tables for IP addresses:', requiredTables);
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
    if (tableName === 'sites' || tableName === 'locations') {
      defaults.status = 'active';
    }
    
    // Add default values for IP ranges
    if (tableName === 'ip_ranges') {
      defaults.name = 'New IP Range';
      defaults.slug = 'new-ip-range';
      defaults.status = 'active';
    }
    
    // Add default values for IP addresses
    if (tableName === 'ip_addresses') {
      defaults.name = 'New IP Address';
      defaults.slug = 'new-ip-address';
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
        
        // For sites, locations, prefixes, ip_ranges, and ip_addresses, ensure status is included
        if ((tableName === 'sites' || tableName === 'locations' || tableName === 'prefixes' || tableName === 'ip_ranges' || tableName === 'ip_addresses') && !values.status) {
          values.status = 'active';
        }
        
        // Log the final form data being submitted
        console.log('Final form data being submitted:', values);
        
        // Special logging for IP addresses
        if (tableName === 'ip_addresses') {
          console.log('IP address form data:', {
            prefix_id: values.prefix_id,
            vrf_id: values.vrf_id,
            tenant_id: values.tenant_id,
            role: values.role,
            status: values.status,
            address: values.address
          });
        }
        
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
        
        // If successful, invalidate queries to force a refresh of the table data
        await queryClient.invalidateQueries({ queryKey: ['data', tableName] });
        
        // Force a refetch to ensure we have the latest data
        await queryClient.refetchQueries({ queryKey: ['data', tableName] });
        
        console.log(`Invalidated and refetched queries for ${tableName}`);
        
        // Add a longer delay before closing the modal to ensure the cache is invalidated and data is refetched
        setTimeout(() => {
          // If successful, close the modal
          onClose();
        }, 500);
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
  
  // Use effect to log reference data when it changes
  useEffect(() => {
    if (isLoading) {
      console.log('Loading reference data...');
      return;
    }
    
    if (isError) {
      console.error('Error loading reference data');
      return;
    }
    
    // Debug reference data for prefixes
    if (tableName === 'prefixes') {
      console.log('Reference data for prefixes:', {
        vrfs: referenceData.vrfs || 'Not loaded',
        vrfsCount: referenceData.vrfs ? referenceData.vrfs.length : 0,
        tenants: referenceData.tenants || 'Not loaded',
        tenantsCount: referenceData.tenants ? referenceData.tenants.length : 0,
        allReferenceTables: Object.keys(referenceData)
      });
    }
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

  // --- Add VRF target fetching - only when needed ---
  const { data: allRouteTargets, isLoading: isLoadingTargets, isError: isErrorTargets } = useAllRouteTargets({
    enabled: tableName === 'vrfs' // Only fetch route targets for VRF forms
  });
  // Format data for MultiSelect
  const routeTargetOptions = useMemo(() => {
    if (!allRouteTargets) return [];
    return allRouteTargets.map((rt: any) => ({
      value: String(rt.id),
      label: `${rt.name} (${rt.slug || 'no slug'})`
    }));
  }, [allRouteTargets]);
  // --- End VRF target fetching ---

  // Function to handle name changes and auto-generate slugs
  const handleNameChange = (name: string) => {
    // Update the name field
    handleChange('name', name);
    
    // Only auto-generate slug if the slug field is empty or hasn't been manually modified
    if (!formData.slug || formData.slug === slugify(formData.name || '')) {
      const newSlug = slugify(name);
      handleChange('slug', newSlug);
    }
  };

  // Check if a prefix already exists
  const checkPrefixExists = async (prefix: string): Promise<boolean> => {
    try {
      if (!prefix) return false;
      
      // Query the API for aggregates with this prefix
      const response = await apiClient.get(`/aggregates?prefix=${prefix}`);
      
      // If there are results and we're not in edit mode (or editing a different aggregate)
      if (response.data && response.data.items && response.data.items.length > 0) {
        // In edit mode, check if the result is the current aggregate
        if (data && data.id) {
          // If we're editing the current aggregate, it's ok
          return !response.data.items.some((item: any) => item.id === data.id);
        }
        // In create mode, any match means it exists
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking prefix existence:', error);
      return false; // Assume it doesn't exist if we can't check
    }
  };

  // Handle prefix change for aggregates
  const handlePrefixChange = async (prefix: string) => {
    // Update the prefix in the form data
    handleChange('prefix', prefix);
    
    // Only validate for aggregates
    if (tableName === 'aggregates') {
      // Check if this prefix already exists
      const exists = await checkPrefixExists(prefix);
      if (exists) {
        setValidationErrors(prev => ({
          ...prev,
          prefix: 'This prefix already exists. Prefixes must be unique.'
        }));
      } else {
        // Clear the error if it was previously set
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          if (newErrors.prefix) delete newErrors.prefix;
          return newErrors;
        });
      }
    }
  };

  // Handle form submission
  const onSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Additional validation for aggregates
    if (tableName === 'aggregates') {
      const exists = await checkPrefixExists(formData.prefix);
      if (exists) {
        setValidationErrors(prev => ({
          ...prev,
          prefix: 'This prefix already exists. Prefixes must be unique.'
        }));
        return; // Prevent form submission
      }
    }
    
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.currentTarget.value)}
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
            
            {/* Special handling for locations form */}
            {tableName === 'locations' && (
              <>
                {/* Name field */}
                <TextInput
                  label="Name"
                  value={formData.name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.currentTarget.value)}
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
                
                {/* Site dropdown */}
                <Select
                  label="Site"
                  data={(referenceData.sites || []).map((site: any) => ({
                    value: site.id.toString(),
                    label: site.name || `Site #${site.id}`
                  }))}
                  value={formData.site_id ? formData.site_id.toString() : null}
                  onChange={(value: string | null) => handleChange('site_id', value ? Number(value) : null)}
                  error={validationErrors.site_id}
                  placeholder="Select Site"
                  searchable
                  clearable
                  required
                />
                
                {/* Parent Location dropdown */}
                <Select
                  label="Parent Location"
                  data={(referenceData.locations || []).filter((loc: any) => 
                    // Filter out the current location to prevent circular references
                    formData.id ? loc.id !== formData.id : true
                  ).map((location: any) => ({
                    value: location.id.toString(),
                    label: location.name || `Location #${location.id}`
                  }))}
                  value={formData.parent_id ? formData.parent_id.toString() : null}
                  onChange={(value: string | null) => handleChange('parent_id', value ? Number(value) : null)}
                  error={validationErrors.parent_id}
                  placeholder={referenceData.locations && referenceData.locations.length > 0 ? 
                    "Select Parent Location" : "No parent locations available"}
                  searchable
                  clearable
                />
                
                {/* Description field */}
                <Textarea
                  label="Description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.currentTarget.value)}
                  error={validationErrors.description}
                  minRows={3}
                />
              </>
            )}
            
            {/* Special handling for aggregates form */}
            {tableName === 'aggregates' && (
              <>
                {/* Name field */}
                <TextInput
                  label="Name"
                  value={formData.name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.currentTarget.value)}
                  error={validationErrors.name}
                  required
                  placeholder="e.g., Private Network Block"
                />
                
                {/* Slug field */}
                <TextInput
                  label="Slug"
                  value={formData.slug || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('slug', e.currentTarget.value)}
                  error={validationErrors.slug}
                  placeholder="auto-generated-from-name"
                />
                
                {/* Prefix field */}
                <TextInput
                  label="Prefix"
                  value={formData.prefix || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePrefixChange(e.currentTarget.value)}
                  error={validationErrors.prefix}
                  required
                  placeholder="e.g., 192.168.1.0/24"
                />
                
                {/* RIR dropdown */}
                <Select
                  label="RIR"
                  data={(referenceData.rirs || []).map((rir: any) => ({
                    value: rir.id.toString(),
                    label: rir.name || `RIR #${rir.id}`
                  }))}
                  value={formData.rir_id ? formData.rir_id.toString() : null}
                  onChange={(value: string | null) => handleChange('rir_id', value ? Number(value) : null)}
                  error={validationErrors.rir_id}
                  placeholder="Select RIR"
                  searchable
                  clearable
                  required
                />
                
                {/* Description field */}
                <Textarea
                  label="Description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.currentTarget.value)}
                  error={validationErrors.description}
                  minRows={3}
                />
              </>
            )}
            
            {/* Render form fields for tables without special handling */}
            {tableName !== 'sites' && tableName !== 'locations' && tableName !== 'aggregates' && schema.map((column: any) => (
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
