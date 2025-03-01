import type { TableName } from '../../types';

export interface Column {
  name: string;
  type: string;
  required?: boolean;
  reference?: string;
}

export const TABLE_SCHEMAS: Record<TableName, Column[]> = {
  regions: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'parent_id', type: 'number', reference: 'regions' },
    { name: 'description', type: 'string' }
  ],
  site_groups: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  sites: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'status', type: 'string', required: true },
    { name: 'region_id', type: 'number', reference: 'regions' },
    { name: 'site_group_id', type: 'number', reference: 'site_groups' },
    { name: 'description', type: 'string' }
  ],
  locations: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'site_id', type: 'number', reference: 'sites' },
    { name: 'parent_id', type: 'number', reference: 'locations' },
    { name: 'status', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  vlans: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
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
    { name: 'slug', type: 'string', required: true },
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
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  vrf_import_targets: [
    { name: 'vrf_id', type: 'number', reference: 'vrfs', required: true },
    { name: 'route_target_id', type: 'number', reference: 'route_targets', required: true }
  ],
  vrf_export_targets: [
    { name: 'vrf_id', type: 'number', reference: 'vrfs', required: true },
    { name: 'route_target_id', type: 'number', reference: 'route_targets', required: true }
  ],
  rirs: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  aggregates: [
    { name: 'id', type: 'number' },
    { name: 'prefix', type: 'string', required: true },
    { name: 'rir_id', type: 'number', reference: 'rirs' },
    { name: 'description', type: 'string' }
  ],
  roles: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  prefixes: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string' },
    { name: 'slug', type: 'string' },
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
    { name: 'assigned_object_type', type: 'string' },
    { name: 'assigned_object_id', type: 'number' },
    { name: 'description', type: 'string' }
  ],
  devices: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' },
    { name: 'location_id', type: 'number', reference: 'locations' },
    { name: 'ip_address_id', type: 'number', reference: 'ip_addresses' }
  ],
  interfaces: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' },
    { name: 'device_id', type: 'number', reference: 'devices' }
  ],
  asns: [
    { name: 'id', type: 'number' },
    { name: 'asn', type: 'number', required: true },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' },
    { name: 'rir_id', type: 'number', reference: 'rirs' }
  ],
  asn_ranges: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'start', type: 'number', required: true },
    { name: 'end', type: 'number', required: true },
    { name: 'rir_id', type: 'number', reference: 'rirs' },
    { name: 'description', type: 'string' }
  ],
  tenants: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ]
};
