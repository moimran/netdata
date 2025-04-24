import React, { memo } from 'react';
import {
  TextInput,
  NumberInput,
  Switch,
  Textarea,
  Select,
  MultiSelect,
  SegmentedControl,
  Text,
} from '@mantine/core';
import { Column } from '../../IPAMTable/schemas';
import { ValidationErrors } from '../../../hooks/forms/useFormState';

interface FormFieldProps {
  column: Column;
  formData: Record<string, any>;
  handleChange: (name: string, value: any) => void;
  validationErrors: ValidationErrors;
  setValidationErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  tableName: string;
  referenceData: Record<string, any[]>;
  getReferenceItem: (tableName: string, id: number | string | null) => any;
  formatReferenceValue: (value: number | string | null, tableName: string) => string;
}

// Helper function to get the field label
const getFieldLabel = (name: string) => {
  if (name === 'id') return null; // Skip ID field
  if (name === 'vid') return 'VLAN ID';
  if (name === 'rd') return 'Route Distinguisher';

  // Handle _id fields by removing suffix and capitalizing
  if (name.endsWith('_id')) {
    return name.replace('_id', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // Default label formatting
  return name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// Memoized Form Field Components
const BooleanField = memo(({
  name,
  label,
  value,
  onChange,
  error
}: {
  name: string;
  label: string;
  value: boolean;
  onChange: (name: string, value: boolean) => void;
  error?: string
}) => (
  <Switch
    label={label}
    checked={!!value}
    onChange={(event) => onChange(name, event.currentTarget.checked)}
    error={error}
  />
));

const NumberField = memo(({
  name,
  label,
  value,
  onChange,
  error,
  required
}: {
  name: string;
  label: string;
  value: number | null;
  onChange: (name: string, value: number | null) => void;
  error?: string;
  required?: boolean
}) => (
  <NumberInput
    label={label}
    value={value || ''}
    onChange={(value) => onChange(name, value)}
    error={error}
    required={required}
    placeholder={`Enter ${label}`}
  />
));

const StatusField = memo(({
  name,
  label,
  value,
  onChange,
  required
}: {
  name: string;
  label: string;
  value: string;
  onChange: (name: string, value: string) => void;
  required?: boolean
}) => {
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'reserved', label: 'Reserved' },
    { value: 'deprecated', label: 'Deprecated' },
    { value: 'available', label: 'Available' }
  ];
  
  return (
    <Select
      label={label}
      data={statusOptions}
      value={value || 'active'}
      onChange={(value) => onChange(name, value || 'active')}
      required={required}
      placeholder="Select Status"
      searchable
    />
  );
});

const TextField = memo(({
  name,
  label,
  value,
  onChange,
  error,
  required,
  placeholder,
  isTextarea = false
}: {
  name: string;
  label: string;
  value: string;
  onChange: (name: string, value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  isTextarea?: boolean;
}) => {
  if (isTextarea) {
    return (
      <Textarea
        label={label}
        value={value || ''}
        onChange={(e) => onChange(name, e.currentTarget.value)}
        error={error}
        required={required}
        placeholder={placeholder || `Enter ${label}`}
        minRows={3}
      />
    );
  }

  return (
    <TextInput
      label={label}
      value={value || ''}
      onChange={(e) => onChange(name, e.currentTarget.value)}
      error={error}
      required={required}
      placeholder={placeholder || `Enter ${label}`}
    />
  );
});

// Debug function to help diagnose reference data issues
const debugReferenceData = (name: string, referenceTable: string, referenceData: Record<string, any[]>, value: any) => {
  console.log(`DEBUG ReferenceField for ${name} (${referenceTable}):`, { 
    availableTables: Object.keys(referenceData),
    tableExists: referenceTable in referenceData,
    tableData: referenceData[referenceTable] || [],
    tableDataLength: referenceData[referenceTable] ? referenceData[referenceTable].length : 0,
    currentValue: value
  });
};

const ReferenceField = memo(({
  name,
  label,
  value,
  onChange,
  error,
  required,
  referenceTable,
  referenceData,
  formatReferenceValue,
  allowMultiple = false
}: {
  name: string;
  label: string;
  value: any;
  onChange: (name: string, value: any) => void;
  error?: string;
  required?: boolean;
  referenceTable: string;
  referenceData: Record<string, any[]>;
  formatReferenceValue: (value: number | string | null, tableName: string) => string;
  allowMultiple?: boolean;
}) => {
  // Debug the reference data
  debugReferenceData(name, referenceTable, referenceData, value);
  
  // Special handling for self-references (like parent_id in regions)
  // If this is a self-reference field (like parent_id in regions table),
  // we need to make sure we don't include the current item in the options
  // to avoid circular references
  const options = (referenceData[referenceTable] || [])
    .filter(item => {
      // For self-references in edit mode, filter out the current item
      // to prevent selecting itself as a parent
      if (name === 'parent_id' && referenceTable === 'regions' && value !== null) {
        return item.id !== value;
      }
      return true;
    })
    .map(item => ({
      value: item.id.toString(),
      label: item.name || item.display_name || item.rd || formatReferenceValue(item.id, referenceTable)
    }));

  if (allowMultiple) {
    return (
      <MultiSelect
        label={label}
        data={options}
        value={Array.isArray(value) ? value.map(v => v.toString()) : []}
        onChange={(selectedValues) => onChange(name, selectedValues.map(v => Number(v)))}
        error={error}
        required={required}
        placeholder={`Select ${label}`}
        searchable
      />
    );
  }

  return (
    <Select
      label={label}
      data={options}
      value={value ? value.toString() : null}
      onChange={(value) => onChange(name, value ? Number(value) : null)}
      error={error}
      required={required}
      placeholder={`Select ${label}`}
      searchable
      clearable
    />
  );
});

/**
 * Renders a form field based on the column configuration
 */
export const FormField = memo(function FormField({
  column,
  formData,
  handleChange,
  validationErrors,
  setValidationErrors,
  tableName,
  referenceData,
  getReferenceItem,
  formatReferenceValue
}: FormFieldProps) {
  // Skip ID field since it's auto-generated
  if (column.name === 'id') return null;
  
  // Skip vlan_id_ranges field in VLAN groups since it's handled by a custom component
  if (tableName === 'vlan_groups' && column.name === 'vlan_id_ranges') return null;

  // Skip internal fields
  if (column.name === 'vlanIdRanges') return null;

  // Log the current field being rendered
  console.log(`FormField rendering field: ${column.name} for table: ${tableName}`, {
    column,
    hasReference: !!column.reference,
    referenceTable: column.reference,
    referenceDataKeys: Object.keys(referenceData),
    currentValue: formData[column.name]
  });
  
  // Generate label for the field
  const label = getFieldLabel(column.name);
  
  // Special handling for parent_id in regions table
  if (tableName === 'regions' && column.name === 'parent_id') {
    console.log('Rendering parent_id field for regions:', {
      availableRegions: referenceData.regions || [],
      currentValue: formData.parent_id
    });
    
    // Create options from available regions
    const options = (referenceData.regions || []).map(region => ({
      value: region.id.toString(),
      label: region.name || `Region #${region.id}`
    }));
    
    // Filter out the current region to prevent circular references
    const filteredOptions = formData.id 
      ? options.filter(option => option.value !== formData.id.toString())
      : options;
    
    return (
      <Select
        label="Parent Region"
        data={filteredOptions}
        value={formData.parent_id ? formData.parent_id.toString() : null}
        onChange={(value) => handleChange('parent_id', value ? Number(value) : null)}
        error={validationErrors.parent_id}
        placeholder="Select Parent Region"
        searchable
        clearable
      />
    );
  }

  // Log the current field being rendered
  console.log(`Rendering field: ${column.name} (${column.type})`, {
    hasReference: !!column.reference,
    referenceTable: column.reference,
    currentValue: formData[column.name],
    availableReferenceData: column.reference ? referenceData[column.reference] : null
  });
  
  // Special handling for parent_id in regions
  if (column.name === 'parent_id' && column.reference === 'regions') {
    console.log('Rendering parent_id field with regions reference', {
      regions: referenceData.regions || [],
      regionsCount: referenceData.regions ? referenceData.regions.length : 0
    });
    
    // Check if we have any regions available
    const hasRegions = referenceData.regions && referenceData.regions.length > 0;
    
    // Create options from the regions data
    const options = hasRegions 
      ? referenceData.regions.map(region => ({
          value: region.id.toString(),
          label: region.name || `Region #${region.id}`
        }))
      : [];
    
    // Filter out the current region to prevent circular references
    const filteredOptions = formData.id 
      ? options.filter(option => option.value !== formData.id.toString())
      : options;
    
    return (
      <Select
        label="Parent Region"
        data={filteredOptions}
        value={formData.parent_id ? formData.parent_id.toString() : null}
        onChange={(value) => handleChange('parent_id', value ? Number(value) : null)}
        error={validationErrors.parent_id}
        placeholder={hasRegions ? "Select Parent Region" : "No parent regions available"}
        searchable
        clearable
        disabled={!hasRegions}
      />
    );
  }
  
  // Special handling for IP addresses table
  if (tableName === 'ip_addresses') {
    // Handle VRF reference field
    if (column.name === 'vrf_id' && column.reference === 'vrfs') {
      const hasVrfs = referenceData.vrfs && referenceData.vrfs.length > 0;
      const vrfOptions = hasVrfs
        ? referenceData.vrfs.map(vrf => ({
            value: vrf.id.toString(),
            label: vrf.name || `VRF #${vrf.id}`
          }))
        : [];
        
      return (
        <Select
          label="VRF"
          data={vrfOptions}
          value={formData.vrf_id ? formData.vrf_id.toString() : null}
          onChange={(value) => handleChange('vrf_id', value ? Number(value) : null)}
          error={validationErrors.vrf_id}
          placeholder={hasVrfs ? "Select VRF" : "No VRFs available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle Tenant reference field
    if (column.name === 'tenant_id' && column.reference === 'tenants') {
      const hasTenants = referenceData.tenants && referenceData.tenants.length > 0;
      const tenantOptions = hasTenants
        ? referenceData.tenants.map(tenant => ({
            value: tenant.id.toString(),
            label: tenant.name || `Tenant #${tenant.id}`
          }))
        : [];
        
      return (
        <Select
          label="Tenant"
          data={tenantOptions}
          value={formData.tenant_id ? formData.tenant_id.toString() : null}
          onChange={(value) => handleChange('tenant_id', value ? Number(value) : null)}
          error={validationErrors.tenant_id}
          placeholder={hasTenants ? "Select Tenant" : "No Tenants available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle Prefix reference field
    if (column.name === 'prefix_id' && column.reference === 'prefixes') {
      const hasPrefixes = referenceData.prefixes && referenceData.prefixes.length > 0;
      const prefixOptions = hasPrefixes
        ? referenceData.prefixes.map(prefix => ({
            value: prefix.id.toString(),
            label: prefix.prefix || `Prefix #${prefix.id}`
          }))
        : [];
        
      return (
        <Select
          label="Prefix"
          data={prefixOptions}
          value={formData.prefix_id ? formData.prefix_id.toString() : null}
          onChange={(value) => {
            console.log('Prefix selected:', value);
            handleChange('prefix_id', value ? Number(value) : null);
            console.log('Updated formData.prefix_id:', formData.prefix_id);
          }}
          error={validationErrors.prefix_id}
          placeholder={hasPrefixes ? "Select Prefix" : "No Prefixes available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle Role field
    if (column.name === 'role') {
      const roleOptions = [
        { value: 'loopback', label: 'Loopback' },
        { value: 'secondary', label: 'Secondary' },
        { value: 'vip', label: 'VIP' },
        { value: 'hsrp', label: 'HSRP' },
        { value: 'vrrp', label: 'VRRP' },
        { value: 'glbp', label: 'GLBP' },
        { value: 'anycast', label: 'Anycast' }
      ];
      
      return (
        <Select
          label="Role"
          data={roleOptions}
          value={formData.role || null}
          onChange={(value) => handleChange('role', value)}
          error={validationErrors.role}
          placeholder="Select Role"
          searchable
          clearable
        />
      );
    }
    
    // Handle Status field
    if (column.name === 'status') {
      const statusOptions = [
        { value: 'active', label: 'Active' },
        { value: 'reserved', label: 'Reserved' },
        { value: 'deprecated', label: 'Deprecated' },
        { value: 'dhcp', label: 'DHCP' },
        { value: 'slaac', label: 'SLAAC' }
      ];
      
      return (
        <Select
          label="Status"
          data={statusOptions}
          value={formData.status || 'active'}
          onChange={(value) => handleChange('status', value || 'active')}
          error={validationErrors.status}
          placeholder="Select Status"
          required
          searchable
        />
      );
    }
  }
  
  // Special handling for IP ranges table
  if (tableName === 'ip_ranges') {
    // Handle VRF reference field
    if (column.name === 'vrf_id' && column.reference === 'vrfs') {
      const hasVrfs = referenceData.vrfs && referenceData.vrfs.length > 0;
      const vrfOptions = hasVrfs
        ? referenceData.vrfs.map(vrf => ({
            value: vrf.id.toString(),
            label: vrf.name || `VRF #${vrf.id}`
          }))
        : [];
        
      return (
        <Select
          label="VRF"
          data={vrfOptions}
          value={formData.vrf_id ? formData.vrf_id.toString() : null}
          onChange={(value) => handleChange('vrf_id', value ? Number(value) : null)}
          error={validationErrors.vrf_id}
          placeholder={hasVrfs ? "Select VRF" : "No VRFs available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle Tenant reference field
    if (column.name === 'tenant_id' && column.reference === 'tenants') {
      const hasTenants = referenceData.tenants && referenceData.tenants.length > 0;
      const tenantOptions = hasTenants
        ? referenceData.tenants.map(tenant => ({
            value: tenant.id.toString(),
            label: tenant.name || `Tenant #${tenant.id}`
          }))
        : [];
        
      return (
        <Select
          label="Tenant"
          data={tenantOptions}
          value={formData.tenant_id ? formData.tenant_id.toString() : null}
          onChange={(value) => handleChange('tenant_id', value ? Number(value) : null)}
          error={validationErrors.tenant_id}
          placeholder={hasTenants ? "Select Tenant" : "No Tenants available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle Status field for IP ranges
    if (column.name === 'status') {
      return (
        <StatusField
          name={column.name}
          label="Status"
          value={formData.status || 'active'}
          onChange={handleChange}
          required={true}
        />
      );
    }
  }

  // Special handling for prefixes table
  // Special handling for VLANs table
  if (tableName === 'vlans') {
    // Handle VRF reference field
    if (column.name === 'tenant_id' && column.reference === 'tenants') {
      const hasTenants = referenceData.tenants && referenceData.tenants.length > 0;
      const tenantOptions = hasTenants
        ? referenceData.tenants.map(tenant => ({
            value: String(tenant.id),
            label: tenant.name || `Tenant #${tenant.id}`
          }))
        : [];
      
      const value = formData[column.name];

      return (
        <Select
          label={label}
          placeholder="Select tenant"
          value={value ? String(value) : null}
          onChange={(val) => handleChange(column.name, val ? Number(val) : null)}
          data={tenantOptions}
          searchable
          clearable
          error={validationErrors[column.name]}
        />
      );
    }

    // Handle Site reference field
    if (column.name === 'site_id' && column.reference === 'sites') {
      const hasSites = referenceData.sites && referenceData.sites.length > 0;
      const siteOptions = hasSites
        ? referenceData.sites.map(site => ({
            value: String(site.id),
            label: site.name || `Site #${site.id}`
          }))
        : [];
      
      const value = formData[column.name];

      return (
        <Select
          label={label}
          placeholder="Select site"
          value={value ? String(value) : null}
          onChange={(val) => handleChange(column.name, val ? Number(val) : null)}
          data={siteOptions}
          searchable
          clearable
          error={validationErrors[column.name]}
        />
      );
    }

    // Handle VLAN Group reference field
    if (column.name === 'group_id' && column.reference === 'vlan_groups') {
      const hasGroups = referenceData.vlan_groups && referenceData.vlan_groups.length > 0;
      const groupOptions = hasGroups
        ? referenceData.vlan_groups.map(group => ({
            value: String(group.id),
            label: group.name || `VLAN Group #${group.id}`
          }))
        : [];
      
      const value = formData[column.name];

      return (
        <Select
          label={label}
          placeholder="Select VLAN group"
          value={value ? String(value) : null}
          onChange={(val) => handleChange(column.name, val ? Number(val) : null)}
          data={groupOptions}
          searchable
          clearable
          error={validationErrors[column.name]}
        />
      );
    }

    // Handle Role reference field
    if (column.name === 'role_id' && column.reference === 'roles') {
      const hasRoles = referenceData.roles && referenceData.roles.length > 0;
      const roleOptions = hasRoles
        ? referenceData.roles.map(role => ({
            value: String(role.id),
            label: role.name || `Role #${role.id}`
          }))
        : [];
      
      const value = formData[column.name];

      return (
        <Select
          label={label}
          placeholder="Select role"
          value={value ? String(value) : null}
          onChange={(val) => handleChange(column.name, val ? Number(val) : null)}
          data={roleOptions}
          searchable
          clearable
          error={validationErrors[column.name]}
        />
      );
    }

    // Handle Status field for VLANs
    if (column.name === 'status') {
      return (
        <Select
          label={label}
          placeholder="Select status"
          value={formData.status || 'active'}
          onChange={(val) => handleChange('status', val)}
          data={[
            { value: 'active', label: 'Active' },
            { value: 'reserved', label: 'Reserved' },
            { value: 'deprecated', label: 'Deprecated' }
          ]}
          error={validationErrors.status}
        />
      );
    }
  }

  if (tableName === 'prefixes') {
    // Handle VRF reference field
    if (column.name === 'vrf_id' && column.reference === 'vrfs') {
      const hasVrfs = referenceData.vrfs && referenceData.vrfs.length > 0;
      const vrfOptions = hasVrfs
        ? referenceData.vrfs.map(vrf => ({
            value: vrf.id.toString(),
            label: vrf.name || `VRF #${vrf.id}`
          }))
        : [];
        
      return (
        <Select
          label="VRF"
          data={vrfOptions}
          value={formData.vrf_id ? formData.vrf_id.toString() : null}
          onChange={(value) => handleChange('vrf_id', value ? Number(value) : null)}
          error={validationErrors.vrf_id}
          placeholder={hasVrfs ? "Select VRF" : "No VRFs available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle Site reference field
    if (column.name === 'site_id' && column.reference === 'sites') {
      const hasSites = referenceData.sites && referenceData.sites.length > 0;
      const siteOptions = hasSites
        ? referenceData.sites.map(site => ({
            value: site.id.toString(),
            label: site.name || `Site #${site.id}`
          }))
        : [];
        
      return (
        <Select
          label="Site"
          data={siteOptions}
          value={formData.site_id ? formData.site_id.toString() : null}
          onChange={(value) => handleChange('site_id', value ? Number(value) : null)}
          error={validationErrors.site_id}
          placeholder={hasSites ? "Select Site" : "No Sites available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle VLAN reference field
    if (column.name === 'vlan_id' && column.reference === 'vlans') {
      const hasVlans = referenceData.vlans && referenceData.vlans.length > 0;
      const vlanOptions = hasVlans
        ? referenceData.vlans.map(vlan => ({
            value: vlan.id.toString(),
            label: `${vlan.name} (${vlan.vid})` || `VLAN #${vlan.id}`
          }))
        : [];
        
      return (
        <Select
          label="VLAN"
          data={vlanOptions}
          value={formData.vlan_id ? formData.vlan_id.toString() : null}
          onChange={(value) => handleChange('vlan_id', value ? Number(value) : null)}
          error={validationErrors.vlan_id}
          placeholder={hasVlans ? "Select VLAN" : "No VLANs available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle Tenant reference field
    if (column.name === 'tenant_id' && column.reference === 'tenants') {
      const hasTenants = referenceData.tenants && referenceData.tenants.length > 0;
      const tenantOptions = hasTenants
        ? referenceData.tenants.map(tenant => ({
            value: tenant.id.toString(),
            label: tenant.name || `Tenant #${tenant.id}`
          }))
        : [];
        
      return (
        <Select
          label="Tenant"
          data={tenantOptions}
          value={formData.tenant_id ? formData.tenant_id.toString() : null}
          onChange={(value) => handleChange('tenant_id', value ? Number(value) : null)}
          error={validationErrors.tenant_id}
          placeholder={hasTenants ? "Select Tenant" : "No Tenants available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle Role reference field
    if (column.name === 'role_id' && column.reference === 'roles') {
      const hasRoles = referenceData.roles && referenceData.roles.length > 0;
      const roleOptions = hasRoles
        ? referenceData.roles.map(role => ({
            value: role.id.toString(),
            label: role.name || `Role #${role.id}`
          }))
        : [];
        
      return (
        <Select
          label="Role"
          data={roleOptions}
          value={formData.role_id ? formData.role_id.toString() : null}
          onChange={(value) => handleChange('role_id', value ? Number(value) : null)}
          error={validationErrors.role_id}
          placeholder={hasRoles ? "Select Role" : "No Roles available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle Status field
    if (column.name === 'status') {
      return (
        <StatusField
          name={column.name}
          label={label}
          value={formData[column.name] || 'active'}
          onChange={handleChange}
          required={column.required}
        />
      );
    }
  }
  
  // Generate field based on column type
  switch (column.type) {
    case 'boolean':
      return (
        <BooleanField
          name={column.name}
          label={label}
          value={formData[column.name] || false}
          onChange={handleChange}
          error={validationErrors[column.name]}
        />
      );

    case 'number':
      return (
        <NumberField
          name={column.name}
          label={label}
          value={formData[column.name]}
          onChange={handleChange}
          error={validationErrors[column.name]}
          required={column.required}
        />
      );

    case 'string':
      // Special handling for status fields
      if (column.name === 'status') {
        return (
          <StatusField
            name={column.name}
            label={label}
            value={formData[column.name] || 'active'}
            onChange={handleChange}
            required={column.required}
          />
        );
      }

      // Special handling for description fields
      if (column.name === 'description' || column.name === 'comments') {
        return (
          <TextField
            name={column.name}
            label={label}
            value={formData[column.name]}
            onChange={handleChange}
            error={validationErrors[column.name]}
            required={column.required}
            isTextarea={true}
          />
        );
      }

      // Special handling for reference fields
      if (column.reference) {
        // Debug the reference data for this field
        debugReferenceData(column.name, column.reference, referenceData, formData[column.name]);
        
        // Handle sites form fields specifically
        if (tableName === 'sites') {
          // Special handling for region_id in sites
          if (column.name === 'region_id') {
            // Check if regions data is available
            const hasRegions = referenceData.regions && referenceData.regions.length > 0;
            console.log('Regions data for sites form:', {
              hasRegions,
              regions: referenceData.regions || [],
              count: referenceData.regions ? referenceData.regions.length : 0
            });
            
            // Create options from regions data
            const regionOptions = hasRegions 
              ? referenceData.regions.map(region => ({
                  value: region.id.toString(),
                  label: region.name || `Region #${region.id}`
                }))
              : [];
              
            return (
              <Select
                label="Region"
                data={regionOptions}
                value={formData.region_id ? formData.region_id.toString() : null}
                onChange={(value) => handleChange('region_id', value ? Number(value) : null)}
                error={validationErrors.region_id}
                placeholder={hasRegions ? "Select Region" : "No regions available"}
                searchable
                clearable
              />
            );
          }
          
          // Special handling for site_group_id in sites
          if (column.name === 'site_group_id') {
            // Check if site groups data is available
            const hasSiteGroups = referenceData.site_groups && referenceData.site_groups.length > 0;
            console.log('Site Groups data for sites form:', {
              hasSiteGroups,
              siteGroups: referenceData.site_groups || [],
              count: referenceData.site_groups ? referenceData.site_groups.length : 0
            });
            
            // Create options from site groups data
            const siteGroupOptions = hasSiteGroups 
              ? referenceData.site_groups.map(siteGroup => ({
                  value: siteGroup.id.toString(),
                  label: siteGroup.name || `Site Group #${siteGroup.id}`
                }))
              : [];
              
            return (
              <Select
                label="Site Group"
                data={siteGroupOptions}
                value={formData.site_group_id ? formData.site_group_id.toString() : null}
                onChange={(value) => handleChange('site_group_id', value ? Number(value) : null)}
                error={validationErrors.site_group_id}
                placeholder={hasSiteGroups ? "Select Site Group" : "No site groups available"}
                searchable
                clearable
              />
            );
          }
        }
        
        // Default reference field handling
        return (
          <ReferenceField
            name={column.name}
            label={label}
            value={formData[column.name]}
            onChange={handleChange}
            error={validationErrors[column.name]}
            required={column.required}
            referenceTable={column.reference}
            referenceData={referenceData}
            formatReferenceValue={formatReferenceValue}
          />
        );
      }

      // Special handling for CIDR notation
      if (column.name === 'prefix') {
        // For prefixes table, show dropdown of available aggregates
        if (tableName === 'prefixes') {
          // Check if aggregates data is available
          const hasAggregates = referenceData.aggregates && referenceData.aggregates.length > 0;
          console.log('Aggregates data for prefixes form:', {
            hasAggregates,
            aggregates: referenceData.aggregates || [],
            count: referenceData.aggregates ? referenceData.aggregates.length : 0
          });
          
          // Create options from aggregates data
          const aggregateOptions = hasAggregates 
            ? referenceData.aggregates.map(aggregate => ({
                value: aggregate.prefix,
                label: `${aggregate.name} (${aggregate.prefix})` || aggregate.prefix
              }))
            : [];
              
          return (
            <div>
              <Select
                label="Available Aggregates"
                data={aggregateOptions}
                value={formData.aggregate_prefix || null}
                onChange={(value) => {
                  // Set the selected aggregate prefix
                  handleChange('aggregate_prefix', value);
                  // Also update the prefix field with the selected value
                  if (value) {
                    handleChange('prefix', value);
                  }
                }}
                placeholder={hasAggregates ? "Select from available aggregates" : "No aggregates available"}
                searchable
                clearable
              />
              <TextField
                name={column.name}
                label={label}
                value={formData[column.name]}
                onChange={handleChange}
                error={validationErrors[column.name]}
                required={column.required}
                placeholder="e.g., 192.168.1.0/24"
              />
            </div>
          );
        }
        
        // For other tables (like aggregates), just show a text field
        return (
          <TextField
            name={column.name}
            label={label}
            value={formData[column.name]}
            onChange={handleChange}
            error={validationErrors[column.name]}
            required={column.required}
            placeholder="e.g., 192.168.1.0/24"
          />
        );
      }

      // Default text field
      return (
        <TextField
          name={column.name}
          label={label}
          value={formData[column.name]}
          onChange={handleChange}
          error={validationErrors[column.name]}
          required={column.required}
        />
      );

    default:
      return (
        <TextInput
          label={label}
          value={formData[column.name] || ''}
          onChange={(e) => handleChange(column.name, e.currentTarget.value)}
          error={validationErrors[column.name]}
          required={column.required}
        />
      );
  }
});

interface VlanIdRangesFieldProps {
  vlanIdRanges: string;
  setVlanIdRanges: (value: string) => void;
  validationErrors: ValidationErrors;
}

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
