import React from 'react';
import { 
  TextInput, 
  Select, 
  Switch,
  Textarea
} from '@mantine/core';
import { Column, FormData, ValidationErrors, ReferenceItem } from '../types';
import { getStatusOptions, getRoleOptions, formatReferenceDataForSelect } from '../utils/options';

interface FormFieldProps {
  column: Column;
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  validationErrors: ValidationErrors;
  tableName: string;
  getReferenceData: (referenceName: string) => ReferenceItem[];
  selectedVlanGroup: any;
  handleVlanIdChange: (newVid: number) => void;
}

export const FormField: React.FC<FormFieldProps> = ({
  column,
  formData,
  setFormData,
  validationErrors,
  tableName,
  getReferenceData,
  selectedVlanGroup,
  handleVlanIdChange
}) => {
  // Skip ID field
  if (column.name === 'id') return null;
  
  // Skip min_vid, max_vid, and vlan_id_ranges for VLAN groups as we handle them with the VLAN ID Ranges field
  if (tableName === 'vlan_groups' && (column.name === 'min_vid' || column.name === 'max_vid' || column.name === 'vlan_id_ranges')) {
    return null;
  }

  // Handle reference fields (foreign keys)
  if (column.reference) {
    const referenceData = getReferenceData(column.reference);
    
    // Special handling for interface_id in IP addresses
    if (tableName === 'ip_addresses' && column.name === 'interface_id') {
      return (
        <Select
          key={column.name}
          label="Interface"
          placeholder="Select Interface"
          data={formatReferenceDataForSelect(referenceData)}
          value={formData[column.name]?.toString() || ''}
          onChange={(value) => setFormData({ 
            ...formData, 
            [column.name]: value ? parseInt(value) : null 
          })}
          required={column.required}
          error={validationErrors[column.name]}
          styles={(theme) => ({
            input: {
              backgroundColor: theme.colors.dark[6],
              color: theme.white,
              '&::placeholder': {
                color: theme.colors.gray[5]
              }
            },
            label: {
              color: theme.white
            },
            item: {
              '&[data-selected]': {
                backgroundColor: theme.colors.blue[8],
                color: theme.white
              },
              '&[data-hovered]': {
                backgroundColor: theme.colors.dark[5]
              }
            }
          })}
        />
      );
    }
    
    // Special handling for prefix_id in IP addresses
    if (tableName === 'ip_addresses' && column.name === 'prefix_id') {
      return (
        <Select
          key={column.name}
          label="Prefix"
          placeholder="Select Prefix"
          data={formatReferenceDataForSelect(referenceData)}
          value={formData[column.name]?.toString() || ''}
          onChange={(value) => setFormData({ 
            ...formData, 
            [column.name]: value ? parseInt(value) : null 
          })}
          required={column.required}
          error={validationErrors[column.name]}
          styles={(theme) => ({
            input: {
              backgroundColor: theme.colors.dark[6],
              color: theme.white,
              '&::placeholder': {
                color: theme.colors.gray[5]
              }
            },
            label: {
              color: theme.white
            },
            item: {
              '&[data-selected]': {
                backgroundColor: theme.colors.blue[8],
                color: theme.white
              },
              '&[data-hovered]': {
                backgroundColor: theme.colors.dark[5]
              }
            }
          })}
        />
      );
    }
    
    // Special handling for credential fields in devices
    if (tableName === 'devices' && (column.name === 'credential_name' || column.name === 'fallback_credential_name')) {
      // For credentials, we need to use the name as the value, not the ID
      const credentialOptions = referenceData.map((item: any) => ({
        value: item.name, // Use name as the value
        label: item.name
      }));
      
      // Add a "None" option
      const options = [{ value: '', label: 'None' }, ...credentialOptions];
      
      return (
        <Select
          key={column.name}
          label={column.name === 'credential_name' ? 'Credential' : 'Fallback Credential'}
          placeholder={`Select ${column.name === 'credential_name' ? 'Credential' : 'Fallback Credential'}`}
          data={options}
          value={formData[column.name] || ''}
          onChange={(value) => setFormData({ 
            ...formData, 
            [column.name]: value || null 
          })}
          required={column.required}
          error={validationErrors[column.name]}
          styles={(theme) => ({
            input: {
              backgroundColor: theme.colors.dark[6],
              color: theme.white,
              '&::placeholder': {
                color: theme.colors.gray[5]
              }
            },
            label: {
              color: theme.white
            },
            item: {
              '&[data-selected]': {
                backgroundColor: theme.colors.blue[8],
                color: theme.white
              },
              '&[data-hovered]': {
                backgroundColor: theme.colors.dark[5]
              }
            }
          })}
        />
      );
    }
    
    // Special handling for VLAN group selection in VLANs
    if (tableName === 'vlans' && column.name === 'group_id') {
      return (
        <Select
          key={column.name}
          label="VLAN Group"
          placeholder="Select VLAN Group"
          data={formatReferenceDataForSelect(referenceData)}
          value={formData[column.name]?.toString() || ''}
          onChange={(value) => {
            // Update the form data
            setFormData({ 
              ...formData, 
              [column.name]: value ? parseInt(value) : null 
            });
          }}
          required={column.required}
          error={validationErrors[column.name]}
          styles={(theme) => ({
            input: {
              backgroundColor: theme.colors.dark[6],
              color: theme.white,
              '&::placeholder': {
                color: theme.colors.gray[5]
              }
            },
            label: {
              color: theme.white
            },
            item: {
              '&[data-selected]': {
                backgroundColor: theme.colors.blue[8],
                color: theme.white
              },
              '&[data-hovered]': {
                backgroundColor: theme.colors.dark[5]
              }
            }
          })}
        />
      );
    }
    
    return (
      <Select
        key={column.name}
        label={column.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
        placeholder={`Select ${column.reference}`}
        data={formatReferenceDataForSelect(referenceData)}
        value={formData[column.name]?.toString() || ''}
        onChange={(value) => setFormData({ 
          ...formData, 
          [column.name]: value ? parseInt(value) : null 
        })}
        required={column.required}
        error={validationErrors[column.name]}
        styles={(theme) => ({
          input: {
            backgroundColor: theme.colors.dark[6],
            color: theme.white,
            '&::placeholder': {
              color: theme.colors.gray[5]
            }
          },
          label: {
            color: theme.white
          },
          item: {
            '&[data-selected]': {
              backgroundColor: theme.colors.blue[8],
              color: theme.white
            },
            '&[data-hovered]': {
              backgroundColor: theme.colors.dark[5]
            }
          }
        })}
      />
    );
  }

  // Handle status fields
  if (column.name === 'status') {
    return (
      <Select
        key={column.name}
        label="Status"
        data={getStatusOptions(tableName)}
        value={formData[column.name] || 'active'}
        onChange={(value) => setFormData({ 
          ...formData, 
          [column.name]: value || 'active' 
        })}
        required={column.required}
        error={validationErrors[column.name]}
        styles={(theme) => ({
          input: {
            backgroundColor: theme.colors.dark[6],
            color: theme.white
          },
          label: {
            color: theme.white
          },
          item: {
            '&[data-selected]': {
              backgroundColor: theme.colors.blue[8],
              color: theme.white
            },
            '&[data-hovered]': {
              backgroundColor: theme.colors.dark[5]
            }
          }
        })}
      />
    );
  }

  // Handle role field for IP addresses
  if (column.name === 'role' && tableName === 'ip_addresses') {
    return (
      <Select
        key={column.name}
        label="Role"
        data={getRoleOptions()}
        value={formData[column.name] || ''}
        onChange={(value) => setFormData({ 
          ...formData, 
          [column.name]: value || null 
        })}
        error={validationErrors[column.name]}
        styles={(theme) => ({
          input: {
            backgroundColor: theme.colors.dark[6],
            color: theme.white
          },
          label: {
            color: theme.white
          },
          item: {
            '&[data-selected]': {
              backgroundColor: theme.colors.blue[8],
              color: theme.white
            },
            '&[data-hovered]': {
              backgroundColor: theme.colors.dark[5]
            }
          }
        })}
      />
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
        styles={(theme) => ({
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
        })}
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
        styles={(theme) => ({
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
        })}
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
        styles={(theme) => ({
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
        })}
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
      styles={(theme) => ({
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
      })}
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
      styles={(theme) => ({
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
      })}
    />
  );
};
