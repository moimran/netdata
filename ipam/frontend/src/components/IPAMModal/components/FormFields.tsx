import React, { useEffect } from 'react';
import {
  TextInput,
  Select,
  Switch,
  Textarea,
  MantineTheme,
  Loader
} from '@mantine/core';
import { Column, FormData, ValidationErrors, ReferenceItem } from '../types';
import { getStatusOptions, getRoleOptions, formatReferenceDataForSelect } from '../utils/options';
import { useIPAddressPrefix } from '../hooks/useIPAddressPrefix';

// Common styles to reduce duplication
const getCommonInputStyles = (theme: MantineTheme) => ({
  input: {
    backgroundColor: theme.colors.dark[6],
    color: theme.white,
    '&::placeholder': {
      color: theme.colors.gray[5]
    }
  },
  label: {
    color: theme.white
  }
});

const getCommonSelectStyles = (theme: MantineTheme) => ({
  ...getCommonInputStyles(theme),
  item: {
    '&[data-selected]': {
      backgroundColor: theme.colors.blue[8],
      color: theme.white
    },
    '&[data-hovered]': {
      backgroundColor: theme.colors.dark[5]
    }
  }
});

interface FormFieldProps {
  column: Column;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  validationErrors: ValidationErrors;
  setValidationErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  tableName: string;
  getReferenceData: (referenceName: string) => ReferenceItem[];
  selectedVlanGroup: any;
  handleVlanIdChange: (newVid: number) => void;
}

// Helper function for creating Select fields with consistent styling
const createSelectField = (
  column: Column, 
  formData: FormData, 
  setFormData: React.Dispatch<React.SetStateAction<FormData>>, 
  data: any[], 
  label: string, 
  placeholder: string, 
  required: boolean = column.required, 
  error: string | undefined = undefined,
  useIntegerValue: boolean = true
) => {
  return (
    <Select
      key={column.name}
      label={label}
      placeholder={placeholder}
      data={data}
      value={useIntegerValue ? formData[column.name]?.toString() || '' : formData[column.name] || ''}
      onChange={(value) => setFormData({ 
        ...formData, 
        [column.name]: useIntegerValue ? (value ? parseInt(value) : null) : (value || null)
      })}
      required={required}
      error={error || undefined}
      styles={getCommonSelectStyles}
    />
  );
};

export const FormField: React.FC<FormFieldProps> = ({
  column,
  formData,
  setFormData,
  validationErrors,
  setValidationErrors,
  tableName,
  getReferenceData,
  selectedVlanGroup,
  handleVlanIdChange
}) => {
  // Use the IP address prefix hook for automatic prefix detection
  const { findMatchingPrefix, isLoading } = useIPAddressPrefix({
    formData,
    setFormData,
    setValidationErrors
  });

  // We no longer need this effect as we'll trigger the prefix lookup on blur
  // instead of on every keystroke
  // Skip ID field
  if (column.name === 'id') return null;
  
  // Skip min_vid, max_vid, and vlan_id_ranges for VLAN groups as we handle them with the VLAN ID Ranges field
  if (tableName === 'vlan_groups' && (column.name === 'min_vid' || column.name === 'max_vid' || column.name === 'vlan_id_ranges')) {
    return null;
  }

  // Handle reference fields (foreign keys)
  if (column.reference) {
    const referenceData = getReferenceData(column.reference);
    
    // Map of special references to their human-readable labels
    const specialReferenceLabels: Record<string, { label: string, placeholder: string }> = {
      'interface_id': { label: 'Interface', placeholder: 'Select Interface' },
      'region_id': { label: 'Region', placeholder: 'Select Region' },
      'location_id': { label: 'Location', placeholder: 'Select Location' },
      'site_group_id': { label: 'Site Group', placeholder: 'Select Site Group' },
      'prefix_id': { label: 'Prefix', placeholder: 'Select Prefix' },
      'group_id': { label: 'VLAN Group', placeholder: 'Select VLAN Group' },
      'vrf_id': { label: 'VRF', placeholder: 'Select VRF' },
      'vlan_id': { label: 'VLAN', placeholder: 'Select VLAN' },
      'tenant_id': { label: 'Tenant', placeholder: 'Select Tenant' },
      'role_id': { label: 'Role', placeholder: 'Select Role' },
      'parent_id': { 
        label: tableName === 'locations' ? 'Parent Location' : 
               tableName === 'regions' ? 'Parent Region' : 
               'Parent',
        placeholder: tableName === 'locations' ? 'Select Parent Location' : 
                     tableName === 'regions' ? 'Select Parent Region' : 
                     'Select Parent'
      },
      'site_id': { label: 'Site', placeholder: 'Select Site' }
    };
    
    // Special handling for credential fields in devices
    if (tableName === 'devices' && (column.name === 'credential_name' || column.name === 'fallback_credential_name')) {
      // For credentials, we need to use the name as the value, not the ID
      const credentialOptions = referenceData.map((item: any) => ({
        value: item.name, // Use name as the value
        label: item.name
      }));
      
      // Add a "None" option
      const options = [{ value: '', label: 'None' }, ...credentialOptions];
      
      const label = column.name === 'credential_name' ? 'Credential' : 'Fallback Credential';
      const placeholder = `Select ${label}`;
      
      return createSelectField(
        column, 
        formData, 
        setFormData, 
        options, 
        label, 
        placeholder, 
        column.required, 
        validationErrors[column.name],
        false
      );
    }
    
    // Special handling for reference fields using the mapping
    if (column.name in specialReferenceLabels) {
      const { label, placeholder } = specialReferenceLabels[column.name];
      
      // Skip prefix_id for ip_addresses as we'll handle it automatically
      if (column.name === 'prefix_id' && tableName === 'ip_addresses') {
        return null;
      }
      
      // Special handling for ip_address_id in interfaces
      if (column.name === 'ip_address_id' && tableName === 'interfaces') {
        return createSelectField(
          column,
          formData,
          setFormData,
          formatReferenceDataForSelect(referenceData),
          'IP Address',
          'Select IP Address',
          column.required,
          validationErrors[column.name]
        );
      }
      
      return createSelectField(
        column,
        formData,
        setFormData,
        formatReferenceDataForSelect(referenceData),
        label,
        placeholder,
        column.required,
        validationErrors[column.name]
      );
    }
    
    // Default handling for other reference fields
    return createSelectField(
      column, 
      formData, 
      setFormData, 
      formatReferenceDataForSelect(referenceData), 
      column.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), 
      `Select ${column.reference}`, 
      column.required, 
      validationErrors[column.name]
    );
  }

  // Handle status fields
  if (column.name === 'status') {
    return createSelectField(
      column, 
      formData, 
      setFormData, 
      getStatusOptions(tableName), 
      'Status', 
      'Select Status', 
      column.required, 
      validationErrors[column.name],
      false
    );
  }

  // Handle role field for IP addresses
  if (column.name === 'role' && tableName === 'ip_addresses') {
    return createSelectField(
      column, 
      formData, 
      setFormData, 
      getRoleOptions(), 
      'Role', 
      'Select Role', 
      column.required, 
      validationErrors[column.name],
      false
    );
  }

  // Handle boolean fields
  if (column.type === 'boolean') {
    return (
      <Switch
        key={column.name}
        label={column.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        checked={!!formData[column.name]}
        onChange={(e) => setFormData({
          ...formData,
          [column.name]: e.currentTarget.checked
        })}
        styles={(theme) => ({
          label: {
            color: theme.white
          }
        })}
      />
    );
  }

  // Handle description fields with textarea
  if (column.name === 'description') {
    return (
      <Textarea
        key={column.name}
        label="Description"
        placeholder="Enter description"
        value={formData[column.name] || ''}
        onChange={(e) => setFormData({ 
          ...formData, 
          [column.name]: e.target.value 
        })}
        error={validationErrors[column.name]}
        styles={getCommonInputStyles}
      />
    );
  }

  // Handle name and slug fields
  if (column.name === 'name' || column.name === 'slug') {
    return (
      <TextInput
        key={column.name}
        label={column.name.charAt(0).toUpperCase() + column.name.slice(1)}
        value={formData[column.name] || ''}
        onChange={(e) => setFormData({ 
          ...formData, 
          [column.name]: e.target.value 
        })}
        required={column.required}
        error={validationErrors[column.name]}
        styles={getCommonInputStyles}
      />
    );
  }

  // Special handling for VLAN ID (vid) field in VLANs
  if (tableName === 'vlans' && column.name === 'vid') {
    return (
      <TextInput
        key={column.name}
        label="VLAN ID"
        value={formData[column.name] || ''}
        onChange={(e) => {
          const newVid = parseInt(e.target.value);
          setFormData({ 
            ...formData, 
            [column.name]: e.target.value 
          });
          
          // Validate against selected VLAN group if one is selected
          if (!isNaN(newVid) && selectedVlanGroup) {
            handleVlanIdChange(newVid);
          }
        }}
        required={column.required}
        error={validationErrors[column.name]}
        styles={getCommonInputStyles}
      />
    );
  }
  
  // Special handling for IP address field in ip_addresses table
  if (tableName === 'ip_addresses' && column.name === 'address') {
    return (
      <TextInput
        key={column.name}
        label="IP Address"
        value={formData[column.name] || ''}
        onChange={(e) => setFormData({
          ...formData,
          [column.name]: e.target.value
        })}
        required={column.required}
        error={validationErrors[column.name] || validationErrors['prefix_id']}
        rightSection={isLoading ? <Loader size="xs" /> : null}
        styles={getCommonInputStyles}
      />
    );
  }
  
  // Default text input for other fields
  return (
    <TextInput
      key={column.name}
      label={column.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
      value={formData[column.name] || ''}
      onChange={(e) => setFormData({ 
        ...formData, 
        [column.name]: e.target.value 
      })}
      required={column.required}
      error={validationErrors[column.name]}
      styles={getCommonInputStyles}
    />
  );
};

interface VlanIdRangesFieldProps {
  vlanIdRanges: string;
  setVlanIdRanges: React.Dispatch<React.SetStateAction<string>>;
  validationErrors: ValidationErrors;
}

export const VlanIdRangesField: React.FC<VlanIdRangesFieldProps> = ({
  vlanIdRanges,
  setVlanIdRanges,
  validationErrors
}) => {
  return (
    <TextInput
      label="VLAN ID Ranges"
      placeholder="e.g., 1-100,200-300"
      description="Specify one or more numeric ranges separated by commas. Example: 1-5,20-30"
      value={vlanIdRanges}
      onChange={(e) => setVlanIdRanges(e.target.value)}
      error={validationErrors.vlanIdRanges}
      styles={getCommonInputStyles}
    />
  );
};
