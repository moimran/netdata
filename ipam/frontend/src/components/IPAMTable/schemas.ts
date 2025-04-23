import type { TableName } from '../../types';

export interface Column {
  name: string;
  type: string;
  required?: boolean;
  reference?: string;
  width?: number;
  header?: string;
}

export const TABLE_SCHEMAS: Record<TableName, Column[]> = {
  regions: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'parent_id', type: 'number', reference: 'regions', header: 'Parent Region' },
    { name: 'description', type: 'string' }
  ],
  site_groups: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'description', type: 'string' }
  ],
  sites: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'status', type: 'string', required: true },
    { name: 'region_id', type: 'number', reference: 'regions' },
    { name: 'site_group_id', type: 'number', reference: 'site_groups' },
    { name: 'description', type: 'string' }
  ],
  locations: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'site_id', type: 'number', reference: 'sites' },
    { name: 'parent_id', type: 'number', reference: 'locations' },
    { name: 'status', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  vlans: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'vid', type: 'number', required: true },
    { name: 'status', type: 'string', required: true },
    { name: 'group_id', type: 'number', reference: 'vlan_groups' },
    { name: 'tenant_id', type: 'number', reference: 'tenants' },
    { name: 'site_id', type: 'number', reference: 'sites' },
    { name: 'role_id', type: 'number', reference: 'roles' },
    { name: 'description', type: 'string' }
  ],
  vlan_groups: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'vlan_id_ranges', type: 'string' }
    // min_vid and max_vid are still stored in the database but not shown in the table
  ],
  vrfs: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'rd', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'enforce_unique', type: 'boolean' },
    { name: 'tenant_id', type: 'number', reference: 'tenants' }
  ],
  route_targets: [
    { name: 'id', type: 'number', width: 80 },
    { name: 'name', type: 'string', required: true, width: 200 },
    { name: 'slug', type: 'string', width: 150 },
    { name: 'description', type: 'string' }
  ],
  rirs: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'description', type: 'string' }
  ],
  aggregates: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'prefix', type: 'string', required: true },
    { name: 'rir_id', type: 'number', reference: 'rirs' },
    { name: 'description', type: 'string' }
  ],
  roles: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'description', type: 'string' }
  ],
  prefixes: [
    { name: 'id', type: 'number' },
    { name: 'prefix', type: 'string', required: true },
    { name: 'vrf_id', type: 'number', reference: 'vrfs' },
    { name: 'site_id', type: 'number', reference: 'sites' },
    { name: 'vlan_id', type: 'number', reference: 'vlans' },
    { name: 'tenant_id', type: 'number', reference: 'tenants' },
    { name: 'role_id', type: 'number', reference: 'roles' },
    { name: 'status', type: 'string', required: true },
    { name: 'is_pool', type: 'boolean' },
    { name: 'mark_utilized', type: 'boolean' },
    { name: 'description', type: 'string' }
  ],
  ip_ranges: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string' },
    { name: 'slug', type: 'string' },
    { name: 'start_address', type: 'string', required: true },
    { name: 'end_address', type: 'string', required: true },
    { name: 'vrf_id', type: 'number', reference: 'vrfs' },
    { name: 'tenant_id', type: 'number', reference: 'tenants' },
    { name: 'status', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  ip_addresses: [
    { name: 'id', type: 'number' },
    { name: 'address', type: 'string', required: true },
    { name: 'status', type: 'string', required: true },
    { name: 'role', type: 'string' },
    { name: 'dns_name', type: 'string' },
    { name: 'vrf_id', type: 'number', reference: 'vrfs' },
    { name: 'tenant_id', type: 'number', reference: 'tenants' },
    { name: 'nat_inside_id', type: 'number', reference: 'ip_addresses' },
    { name: 'prefix_id', type: 'number', reference: 'prefixes' },
    { name: 'description', type: 'string' }
  ],
  devices: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'location_id', type: 'number', reference: 'locations' },
    { name: 'ip_address_id', type: 'number', reference: 'ip_addresses' },
    { name: 'credential_name', type: 'string', reference: 'credentials' },
    { name: 'fallback_credential_name', type: 'string', reference: 'credentials' }
  ],
  interfaces: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'device_id', type: 'number', reference: 'devices' },
    { name: 'ip_address_id', type: 'number', reference: 'ip_addresses' }
  ],
  asns: [
    { name: 'id', type: 'number' },
    { name: 'asn', type: 'number', required: true },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'rir_id', type: 'number', reference: 'rirs' }
  ],
  asn_ranges: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'start', type: 'number', required: true },
    { name: 'end', type: 'number', required: true },
    { name: 'rir_id', type: 'number', reference: 'rirs' },
    { name: 'description', type: 'string' }
  ],
  tenants: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'description', type: 'string' }
  ],
  credentials: [
    { name: 'name', type: 'string', required: true },
    { name: 'username', type: 'string', required: true },
    { name: 'password', type: 'string', required: true },
    { name: 'enable_password', type: 'string' },
    { name: 'is_default', type: 'boolean' }
  ],

  // Add definition for device_inventory
  device_inventory: [
    { name: 'time', type: 'datetime' }, // Use datetime type
    { name: 'device_uuid', type: 'string', width: 300 }, // Treat UUID as string
    { name: 'hostname', type: 'string' },
    { name: 'platform_type_id', type: 'number', header: 'Platform Type ID' }, // Added
    { name: 'release', type: 'string' },
    { name: 'running_image', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'restarted', type: 'datetime' }, // Added
    { name: 'reload_reason', type: 'string' }, // Added
    { name: 'rommon', type: 'string' }, // Added
    { name: 'serial', type: 'string' }, // Added (Assuming string for now, might need adjustment for Array)
    { name: 'software_image', type: 'string' }, // Added
    // Note: More fields like serial, mac, uptime, config_register, hardware could be added later or handled with custom renderers
  ],

  // Add missing table schemas
  racks: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'site_id', type: 'number', reference: 'sites' },
    { name: 'location_id', type: 'number', reference: 'locations' },
    { name: 'tenant_id', type: 'number', reference: 'tenants' },
    { name: 'status', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  
  users: [
    { name: 'id', type: 'number' },
    { name: 'username', type: 'string', required: true },
    { name: 'email', type: 'string', required: true },
    { name: 'first_name', type: 'string' },
    { name: 'last_name', type: 'string' },
    { name: 'is_active', type: 'boolean' },
    { name: 'is_staff', type: 'boolean' },
    { name: 'is_superuser', type: 'boolean' }
  ]
};
