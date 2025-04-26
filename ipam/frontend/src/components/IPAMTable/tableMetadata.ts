// Define a union type for all valid table names used as keys in TABLE_METADATA
export type TableName = 
  | 'regions'
  | 'site_groups'
  | 'sites'
  | 'locations'
  | 'vlans'
  | 'vlan_groups'
  | 'vrfs'
  | 'route_targets'
  | 'rirs'
  | 'aggregates'
  | 'roles'
  | 'prefixes'
  | 'ip_ranges'
  | 'ip_addresses'
  | 'asns'
  | 'asn_ranges'
  | 'tenants'
  | 'platform_types'
  | 'interfaces'
  | 'device_inventory';

// Define the structure for individual column metadata
export interface ColumnMetadata {
  name: string; // Corresponds to the key in the data object (and generated type)
  label?: string; // User-friendly header label (falls back to name)
  type?: 'string' | 'number' | 'boolean' | 'datetime' | 'object' | 'foreignKey' | 'manyToMany' | 'json' | string; 
  required?: boolean; // For form validation
  reference?: TableName; // For linking/displaying related data (should reference a TableName)
  size?: number; // For column width suggestion
  visible?: boolean; // Control default visibility (default: true)
}

// Define the structure for the metadata of a whole table
interface TableMetadata { 
  columns: ColumnMetadata[];
  // Potentially add other table-level metadata here, e.g.,
  // defaultSortField?: string;
  // creatable?: boolean;
}

// Main metadata object
export const TABLE_METADATA: Record<TableName, TableMetadata> = {
  regions: {
    columns: [
      { name: 'id', type: 'number', visible: false }, 
      { name: 'name', type: 'string', required: true },
      { name: 'slug', type: 'string' },
      { name: 'parent_id', type: 'number', reference: 'regions', label: 'Parent Region' },
      { name: 'description', type: 'string' }
    ],
  },
  site_groups: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', required: true },
      { name: 'slug', type: 'string' },
      { name: 'description', type: 'string' }
    ],
  },
  sites: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', required: true },
      { name: 'slug', type: 'string' },
      { name: 'status', type: 'string', required: true },
      { name: 'region_id', type: 'number', reference: 'regions', label: 'Region' },
      { name: 'site_group_id', type: 'number', reference: 'site_groups', label: 'Site Group' },
      { name: 'description', type: 'string' }
    ],
  },
  locations: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', required: true },
      { name: 'slug', type: 'string' },
      { name: 'site_id', type: 'number', reference: 'sites', label: 'Site' },
      { name: 'parent_id', type: 'number', reference: 'locations', label: 'Parent Location' },
      { name: 'status', type: 'string', required: true },
      { name: 'description', type: 'string' }
    ],
  },
  vlans: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', required: true },
      { name: 'slug', type: 'string' },
      { name: 'vid', type: 'number', required: true, label: 'VLAN ID' },
      { name: 'status', type: 'string', required: true },
      { name: 'group_id', type: 'number', reference: 'vlan_groups', label: 'VLAN Group' },
      { name: 'tenant_id', type: 'number', reference: 'tenants', label: 'Tenant' },
      { name: 'site_id', type: 'number', reference: 'sites', label: 'Site' },
      { name: 'role_id', type: 'number', reference: 'roles', label: 'Role' },
      { name: 'description', type: 'string' }
    ],
  },
  vlan_groups: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', required: true },
      { name: 'slug', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'vlan_id_ranges', type: 'string', label: 'VLAN ID Ranges' } 
    ],
  },
  vrfs: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', required: true },
      { name: 'rd', type: 'string', label: 'Route Distinguisher' },
      { name: 'description', type: 'string' },
      { name: 'enforce_unique', type: 'boolean', label: 'Enforce Unique' },
      { name: 'tenant_id', type: 'number', reference: 'tenants', label: 'Tenant' }
    ],
  },
  route_targets: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', required: true },
      { name: 'slug', type: 'string' },
      { name: 'description', type: 'string' }
    ],
  },
  rirs: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', required: true, label: 'RIR Name' },
      { name: 'slug', type: 'string' },
      { name: 'description', type: 'string' }
    ],
  },
  aggregates: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'prefix', type: 'string', required: true },
      { name: 'rir_id', type: 'number', reference: 'rirs', label: 'RIR' },
      { name: 'description', type: 'string' }
    ],
  },
  roles: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', required: true, label: 'Role Name' },
      { name: 'slug', type: 'string' },
      { name: 'description', type: 'string' }
    ],
  },
  prefixes: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'prefix', type: 'string', required: true },
      { name: 'vrf_id', type: 'number', reference: 'vrfs', label: 'VRF' },
      { name: 'site_id', type: 'number', reference: 'sites', label: 'Site' },
      { name: 'vlan_id', type: 'number', reference: 'vlans', label: 'VLAN' },
      { name: 'tenant_id', type: 'number', reference: 'tenants', label: 'Tenant' },
      { name: 'role_id', type: 'number', reference: 'roles', label: 'Role' },
      { name: 'status', type: 'string', required: true },
      { name: 'is_pool', type: 'boolean', label: 'Is Pool?' },
      { name: 'mark_utilized', type: 'boolean', label: 'Mark Utilized' },
      { name: 'description', type: 'string' }
    ],
  },
  ip_ranges: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', label: 'Range Name' },
      { name: 'slug', type: 'string' },
      { name: 'start_address', type: 'string', required: true, label: 'Start Address' },
      { name: 'end_address', type: 'string', required: true, label: 'End Address' },
      { name: 'vrf_id', type: 'number', reference: 'vrfs', label: 'VRF' },
      { name: 'tenant_id', type: 'number', reference: 'tenants', label: 'Tenant' },
      { name: 'status', type: 'string', required: true },
      { name: 'description', type: 'string' }
    ],
  },
  ip_addresses: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'address', type: 'string', required: true },
      { name: 'status', type: 'string', required: true },
      { name: 'role', type: 'string', label: 'IP Role' }, 
      { name: 'dns_name', type: 'string', label: 'DNS Name' },
      { name: 'vrf_id', type: 'number', reference: 'vrfs', label: 'VRF' },
      { name: 'tenant_id', type: 'number', reference: 'tenants', label: 'Tenant' },
      { name: 'nat_inside_id', type: 'number', reference: 'ip_addresses', label: 'NAT Inside IP' },
      { name: 'prefix_id', type: 'number', reference: 'prefixes', label: 'Assigned Prefix', visible: false }, 
      { name: 'description', type: 'string' }
    ],
  },
  asns: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'asn', type: 'number', required: true, label: 'ASN' },
      { name: 'name', type: 'string', required: true, label: 'ASN Name' }, 
      { name: 'slug', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'rir_id', type: 'number', reference: 'rirs', label: 'RIR' }
    ],
  },
  asn_ranges: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', required: true },
      { name: 'slug', type: 'string' },
      { name: 'start', type: 'number', required: true, label: 'Start ASN' },
      { name: 'end', type: 'number', required: true, label: 'End ASN' },
      { name: 'rir_id', type: 'number', reference: 'rirs', label: 'RIR' },
      { name: 'description', type: 'string' }
    ],
  },
  tenants: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', required: true },
      { name: 'slug', type: 'string' },
      { name: 'description', type: 'string' }
    ],
  },
  interfaces: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', required: true },
      { name: 'device_id', type: 'number', label: 'Device', reference: 'devices' }, 
      { name: 'description', type: 'string' },
      { name: 'enabled', type: 'boolean' },
      { name: 'type', type: 'string', label: 'Interface Type' }, 
      { name: 'mtu', type: 'number', label: 'MTU' },
      { name: 'mac_address', type: 'string', label: 'MAC Address' },
    ],
  },
  device_inventory: {
    columns: [
      { name: 'id', type: 'number', visible: false }, 
      { name: 'time', type: 'datetime', label: 'Timestamp' },
      { name: 'device_uuid', type: 'string', label: 'Device UUID', reference: 'devices', size: 300, visible: false }, 
      { name: 'hostname', type: 'string' },
      { name: 'platform_type_id', type: 'number', label: 'Platform Type', reference: 'platform_types' }, 
      { name: 'release', type: 'string' },
      { name: 'running_image', type: 'string', label: 'Running Image' },
      { name: 'version', type: 'string' },
      { name: 'restarted', type: 'datetime' },
      { name: 'reload_reason', type: 'string', label: 'Reload Reason' },
      { name: 'rommon', type: 'string' },
      { name: 'serial', type: 'string' }, 
    ],
  },
  platform_types: {
    columns: [
      { name: 'id', type: 'number', visible: false },
      { name: 'name', type: 'string', required: true },
      { name: 'slug', type: 'string' },
      { name: 'description', type: 'string' }
    ],
  },
};
