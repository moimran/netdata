import { memo } from 'react';
import { Select, TextInput, SegmentedControl } from '@mantine/core';
import { Column } from '../../../IPAMTable/schemas';
import { ValidationErrors } from '../../../../hooks/forms/useFormState';
import { getFieldLabel } from './utils';
import { BooleanField, TextField, NumberField, TextareaField } from './BasicFields';
import { ReferenceField } from './ReferenceField';
import { StatusField } from './StatusField';
import { IPAddressVRFField, IPAddressPrefixField, IPAddressField } from './IPAddressFields';
import { PrefixVRFField, PrefixField } from './PrefixFields';
import { VLANGroupField, VLANTenantField, VLANIDField } from './VLANFields';

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

export const FormField = memo(({
  column,
  formData,
  handleChange,
  validationErrors,
  setValidationErrors,
  tableName,
  referenceData,
  getReferenceItem,
  formatReferenceValue
}: FormFieldProps) => {
  // Skip ID field since it's auto-generated
  if (column.name === 'id') return null;
  
  // Skip vlan_id_ranges field in VLAN groups since it's handled by a custom component
  if (tableName === 'vlan_groups' && column.name === 'vlan_id_ranges') return null;
  
  // Get field label
  const label = column.label || getFieldLabel(column.name);
  
  // Handle onChange for this field
  const onChange = (value: any) => {
    handleChange(column.name, value);
  };
  
  // Field name for reference
  const name = column.name;
  
  // Get error message for this field
  const error = validationErrors[column.name];
  
  // Special handling for specific tables and fields
  if (tableName === 'ip_addresses') {
    // Handle VRF reference field
    if (column.name === 'vrf_id' && column.reference === 'vrfs') {
      const hasVrfs = referenceData.vrfs && referenceData.vrfs.length > 0;
      const vrfOptions = hasVrfs
        ? referenceData.vrfs.map(vrf => ({
            value: String(vrf.id),
            label: vrf.name || `VRF #${vrf.id}`
          }))
        : [];
        
      return (
        <Select
          label="VRF"
          data={vrfOptions}
          value={formData.vrf_id ? String(formData.vrf_id) : ''}
          onChange={(selectedValue) => {
            console.log('VRF selected:', selectedValue);
            handleChange('vrf_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
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
            value: String(tenant.id),
            label: tenant.name || `Tenant #${tenant.id}`
          }))
        : [];
        
      return (
        <Select
          label="Tenant"
          data={tenantOptions}
          value={formData.tenant_id ? String(formData.tenant_id) : ''}
          onChange={(selectedValue) => {
            console.log('Tenant selected:', selectedValue);
            handleChange('tenant_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
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
            value: String(prefix.id),
            label: prefix.prefix || `Prefix #${prefix.id}`
          }))
        : [];
        
      return (
        <Select
          label="Prefix"
          data={prefixOptions}
          value={formData.prefix_id ? String(formData.prefix_id) : ''}
          onChange={(selectedValue) => {
            console.log('Prefix selected:', selectedValue);
            handleChange('prefix_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
          placeholder={hasPrefixes ? "Select Prefix" : "No Prefixes available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle IP address field
    if (column.name === 'address') {
      return (
        <IPAddressField
          name={column.name}
          label={label}
          value={formData[column.name]}
          onChange={onChange}
          error={error}
        />
      );
    }
    
    // Handle Role field for IP addresses
    if (column.name === 'role') {
      // Define common IP address roles
      const roleOptions = [
        { value: 'loopback', label: 'Loopback' },
        { value: 'secondary', label: 'Secondary' },
        { value: 'vip', label: 'VIP' },
        { value: 'vrrp', label: 'VRRP' },
        { value: 'hsrp', label: 'HSRP' },
        { value: 'anycast', label: 'Anycast' },
        { value: 'management', label: 'Management' },
        { value: 'dhcp', label: 'DHCP' },
        { value: 'infrastructure', label: 'Infrastructure' },
        { value: 'customer', label: 'Customer' }
      ];
      
      return (
        <Select
          label="Role"
          data={roleOptions}
          value={formData.role || ''}
          onChange={(selectedValue) => {
            console.log('IP Address Role selected:', selectedValue);
            handleChange('role', selectedValue);
          }}
          error={error}
          placeholder="Select Role"
          searchable
          clearable
        />
      );
    }
  }
  
  if (tableName === 'ip_ranges') {
    // Handle VRF reference field
    if (column.name === 'vrf_id' && column.reference === 'vrfs') {
      const hasVrfs = referenceData.vrfs && referenceData.vrfs.length > 0;
      const vrfOptions = hasVrfs
        ? referenceData.vrfs.map(vrf => ({
            value: String(vrf.id),
            label: vrf.name || `VRF #${vrf.id}`
          }))
        : [];
        
      return (
        <Select
          label="VRF"
          data={vrfOptions}
          value={formData.vrf_id ? String(formData.vrf_id) : ''}
          onChange={(selectedValue) => {
            console.log('VRF selected:', selectedValue);
            handleChange('vrf_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
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
            value: String(tenant.id),
            label: tenant.name || `Tenant #${tenant.id}`
          }))
        : [];
        
      return (
        <Select
          label="Tenant"
          data={tenantOptions}
          value={formData.tenant_id ? String(formData.tenant_id) : ''}
          onChange={(selectedValue) => {
            console.log('Tenant selected:', selectedValue);
            handleChange('tenant_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
          placeholder={hasTenants ? "Select Tenant" : "No Tenants available"}
          searchable
          clearable
        />
      );
    }
  }
  
  if (tableName === 'vlans') {
    // Handle VLAN Group reference field
    if (column.name === 'group_id' && column.reference === 'vlan_groups') {
      const hasGroups = referenceData.vlan_groups && referenceData.vlan_groups.length > 0;
      const groupOptions = hasGroups
        ? referenceData.vlan_groups.map(group => ({
            value: String(group.id),
            label: group.name || `Group #${group.id}`
          }))
        : [];
        
      return (
        <Select
          label="VLAN Group"
          data={groupOptions}
          value={formData.group_id ? String(formData.group_id) : ''}
          onChange={(value) => onChange('group_id', value ? Number(value) : null)}
          error={error}
          placeholder={hasGroups ? "Select VLAN Group" : "No VLAN Groups available"}
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
            value: String(tenant.id),
            label: tenant.name || `Tenant #${tenant.id}`
          }))
        : [];
        
      return (
        <Select
          label="Tenant"
          data={tenantOptions}
          value={formData.tenant_id ? String(formData.tenant_id) : ''}
          onChange={(selectedValue) => {
            console.log('Tenant selected:', selectedValue);
            handleChange('tenant_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
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
            value: String(role.id),
            label: role.name || `Role #${role.id}`
          }))
        : [];
        
      return (
        <Select
          label="Role"
          data={roleOptions}
          value={formData.role_id ? String(formData.role_id) : ''}
          onChange={(selectedValue) => {
            console.log('Role selected:', selectedValue);
            handleChange('role_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
          placeholder={hasRoles ? "Select Role" : "No Roles available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle VLAN ID field
    if (column.name === 'vid') {
      return (
        <NumberField
          name={column.name}
          label="VLAN ID"
          value={formData[column.name]}
          onChange={onChange}
          error={error}
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
            value: String(vrf.id),
            label: vrf.name || `VRF #${vrf.id}`
          }))
        : [];
        
      return (
        <Select
          label="VRF"
          data={vrfOptions}
          value={formData.vrf_id ? String(formData.vrf_id) : ''}
          onChange={(selectedValue) => {
            console.log('VRF selected:', selectedValue);
            handleChange('vrf_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
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
            value: String(site.id),
            label: site.name || `Site #${site.id}`
          }))
        : [];
      
      return (
        <Select
          label="Site"
          data={siteOptions}
          value={formData.site_id ? String(formData.site_id) : ''}
          onChange={(selectedValue) => {
            console.log('Site selected:', selectedValue);
            handleChange('site_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
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
            value: String(vlan.id),
            label: `${vlan.name || ''} (${vlan.vid || ''})`.trim() || `VLAN #${vlan.id}`
          }))
        : [];
      
      return (
        <Select
          label="VLAN"
          data={vlanOptions}
          value={formData.vlan_id ? String(formData.vlan_id) : ''}
          onChange={(selectedValue) => {
            console.log('VLAN selected:', selectedValue);
            handleChange('vlan_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
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
            value: String(tenant.id),
            label: tenant.name || `Tenant #${tenant.id}`
          }))
        : [];
      
      return (
        <Select
          label="Tenant"
          data={tenantOptions}
          value={formData.tenant_id ? String(formData.tenant_id) : ''}
          onChange={(selectedValue) => {
            console.log('Tenant selected:', selectedValue);
            handleChange('tenant_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
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
            value: String(role.id),
            label: role.name || `Role #${role.id}`
          }))
        : [];
      
      return (
        <Select
          label="Role"
          data={roleOptions}
          value={formData.role_id ? String(formData.role_id) : ''}
          onChange={(selectedValue) => {
            console.log('Role selected:', selectedValue);
            handleChange('role_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
          placeholder={hasRoles ? "Select Role" : "No Roles available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle Prefix field
    if (column.name === 'prefix') {
      return (
        <PrefixField
          name={column.name}
          label={label}
          value={formData[column.name]}
          onChange={onChange}
          error={error}
          referenceData={referenceData}
        />
      );
    }
  }
  
  // Special handling for device forms
  if (tableName === 'devices') {
    // Handle Location reference field for devices
    if (column.name === 'location_id' && column.reference === 'locations') {
      const hasLocations = referenceData.locations && referenceData.locations.length > 0;
      const locationOptions = hasLocations
        ? referenceData.locations.map(location => ({
            value: String(location.id),
            label: location.name || `Location #${location.id}`
          }))
        : [];
      
      return (
        <Select
          label="Location"
          data={locationOptions}
          value={formData.location_id ? String(formData.location_id) : ''}
          onChange={(selectedValue) => {
            console.log('Device Location selected:', selectedValue);
            handleChange('location_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
          placeholder={hasLocations ? "Select Location" : "No Locations available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle IP Address reference field for devices
    if (column.name === 'ip_address_id' && column.reference === 'ip_addresses') {
      const hasIpAddresses = referenceData.ip_addresses && referenceData.ip_addresses.length > 0;
      const ipAddressOptions = hasIpAddresses
        ? referenceData.ip_addresses.map(ip => ({
            value: String(ip.id),
            label: ip.address || `IP #${ip.id}`
          }))
        : [];
      
      return (
        <Select
          label="IP Address"
          data={ipAddressOptions}
          value={formData.ip_address_id ? String(formData.ip_address_id) : ''}
          onChange={(selectedValue) => {
            console.log('Device IP Address selected:', selectedValue);
            handleChange('ip_address_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
          placeholder={hasIpAddresses ? "Select IP Address" : "No IP Addresses available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle Credential reference field for devices
    if (column.name === 'credential_name' && column.reference === 'credentials') {
      const hasCredentials = referenceData.credentials && referenceData.credentials.length > 0;
      const credentialOptions = hasCredentials
        ? referenceData.credentials.map(cred => ({
            value: cred.name,
            label: cred.name
          }))
        : [];
      
      return (
        <Select
          label="Credential"
          data={credentialOptions}
          value={formData.credential_name || ''}
          onChange={(selectedValue) => {
            console.log('Device Credential selected:', selectedValue);
            handleChange('credential_name', selectedValue);
          }}
          error={error}
          placeholder={hasCredentials ? "Select Credential" : "No Credentials available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle Fallback Credential reference field for devices
    if (column.name === 'fallback_credential_name' && column.reference === 'credentials') {
      const hasCredentials = referenceData.credentials && referenceData.credentials.length > 0;
      const credentialOptions = hasCredentials
        ? referenceData.credentials.map(cred => ({
            value: cred.name,
            label: cred.name
          }))
        : [];
      
      return (
        <Select
          label="Fallback Credential"
          data={credentialOptions}
          value={formData.fallback_credential_name || ''}
          onChange={(selectedValue) => {
            console.log('Device Fallback Credential selected:', selectedValue);
            handleChange('fallback_credential_name', selectedValue);
          }}
          error={error}
          placeholder={hasCredentials ? "Select Fallback Credential" : "No Credentials available"}
          searchable
          clearable
        />
      );
    }
  }
  
  // Special handling for interface forms
  if (tableName === 'interfaces') {
    // Handle Device reference field for interfaces
    if (column.name === 'device_id' && column.reference === 'devices') {
      const hasDevices = referenceData.devices && referenceData.devices.length > 0;
      const deviceOptions = hasDevices
        ? referenceData.devices.map(device => ({
            value: String(device.id),
            label: device.name || `Device #${device.id}`
          }))
        : [];
      
      return (
        <Select
          label="Device"
          data={deviceOptions}
          value={formData.device_id ? String(formData.device_id) : ''}
          onChange={(selectedValue) => {
            console.log('Interface Device selected:', selectedValue);
            handleChange('device_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
          placeholder={hasDevices ? "Select Device" : "No Devices available"}
          searchable
          clearable
        />
      );
    }
    
    // Handle IP Address reference field for interfaces
    if (column.name === 'ip_address_id' && column.reference === 'ip_addresses') {
      const hasIpAddresses = referenceData.ip_addresses && referenceData.ip_addresses.length > 0;
      const ipAddressOptions = hasIpAddresses
        ? referenceData.ip_addresses.map(ip => ({
            value: String(ip.id),
            label: ip.address || `IP #${ip.id}`
          }))
        : [];
      
      return (
        <Select
          label="IP Address"
          data={ipAddressOptions}
          value={formData.ip_address_id ? String(formData.ip_address_id) : ''}
          onChange={(selectedValue) => {
            console.log('Interface IP Address selected:', selectedValue);
            handleChange('ip_address_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
          placeholder={hasIpAddresses ? "Select IP Address" : "No IP Addresses available"}
          searchable
          clearable
        />
      );
    }
  }
  
  // Special handling for VRF forms
  if (tableName === 'vrfs') {
    // Handle Tenant reference field for VRFs
    if (column.name === 'tenant_id' && column.reference === 'tenants') {
      const hasTenants = referenceData.tenants && referenceData.tenants.length > 0;
      const tenantOptions = hasTenants
        ? referenceData.tenants.map(tenant => ({
            value: String(tenant.id),
            label: tenant.name || `Tenant #${tenant.id}`
          }))
        : [];
      
      return (
        <Select
          label="Tenant"
          data={tenantOptions}
          value={formData.tenant_id ? String(formData.tenant_id) : ''}
          onChange={(selectedValue) => {
            console.log('VRF Tenant selected:', selectedValue);
            handleChange('tenant_id', selectedValue ? Number(selectedValue) : null);
          }}
          error={error}
          placeholder={hasTenants ? "Select Tenant" : "No Tenants available"}
          searchable
          clearable
        />
      );
    }
  }

  // Generic field handling based on column type
  switch (column.type) {
    case 'boolean':
      return (
        <BooleanField
          name={column.name}
          label={label}
          value={formData[column.name]}
          onChange={onChange}
          error={error}
        />
      );
      
    case 'number':
      return (
        <NumberField
          name={column.name}
          label={label}
          value={formData[column.name]}
          onChange={onChange}
          error={error}
        />
      );
      
    case 'string':
      // Special handling for status fields
      if (column.name === 'status') {
        return (
          <StatusField
            name={column.name}
            label={label}
            value={formData[column.name]}
            onChange={onChange}
            error={error}
          />
        );
      }
      
      // Special handling for description fields
      if (column.name === 'description') {
        return (
          <TextareaField
            name={column.name}
            label={label}
            value={formData[column.name]}
            onChange={onChange}
            error={error}
          />
        );
      }
      
      // Default string field
      return (
        <TextField
          name={column.name}
          label={label}
          value={formData[column.name]}
          onChange={onChange}
          error={error}
        />
      );
      
    case 'foreignKey':
    case 'manyToMany':
      if (column.reference) {
        return (
          <ReferenceField
            name={name}
            label={label}
            value={formData[column.name]}
            onChange={onChange}
            error={error}
            referenceTable={column.reference}
            referenceData={referenceData}
            formatReferenceValue={formatReferenceValue}
            getReferenceItem={getReferenceItem}
          />
        );
      }
      break;
      
    default:
      return (
        <TextField
          name={column.name}
          label={label}
          value={formData[column.name]}
          onChange={onChange}
          error={error}
        />
      );
  }
});
