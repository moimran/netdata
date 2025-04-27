import type { TableName } from '../../types';

export interface Column {
  name: string;
  type: string;
  required?: boolean;
  reference?: string;
  width?: number;
  header?: string;
  visible?: boolean;
}

export const TABLE_SCHEMAS: Record<TableName, Column[]> = {
  regions: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'parent_id', type: 'foreignKey', reference: 'regions', header: 'Parent Region' },
    { name: 'description', type: 'string' }
  ],
  site_groups: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'tenant_id', type: 'foreignKey', reference: 'tenants' },
    { name: 'description', type: 'string' }
  ],
  sites: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'status', type: 'string', required: true },
    { name: 'region_id', type: 'foreignKey', reference: 'regions' },
    { name: 'site_group_id', type: 'foreignKey', reference: 'site_groups' },
    { name: 'tenant_id', type: 'foreignKey', reference: 'tenants', required: true },
    { name: 'description', type: 'string' }
  ],
  locations: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'site_id', type: 'foreignKey', reference: 'sites' },
    { name: 'parent_id', type: 'foreignKey', reference: 'locations' },
    { name: 'status', type: 'string', required: true },
    { name: 'description', type: 'string' }
  ],
  vlans: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'vid', type: 'number', required: true },
    { name: 'status', type: 'string', required: true },
    { name: 'tenant_id', type: 'number', reference: 'tenants', required: true },
    { name: 'site_id', type: 'number', reference: 'sites' },
    { name: 'group_id', type: 'number', reference: 'vlan_groups' },
    { name: 'role_id', type: 'number', reference: 'roles' }
  ],
  vlan_groups: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'min_vid', type: 'number', required: true },
    { name: 'max_vid', type: 'number', required: true },
    { name: 'description', type: 'string' },
    { name: 'site_id', type: 'number', reference: 'sites' }
  ],
  vrfs: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'rd', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'enforce_unique', type: 'boolean' },
    { name: 'tenant_id', type: 'number', reference: 'tenants', required: true }
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
    { name: 'rir_id', type: 'foreignKey', reference: 'rirs' },
    { name: 'tenant_id', type: 'foreignKey', reference: 'tenants' },
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
    { name: 'tenant_id', type: 'number', reference: 'tenants', required: true },
    { name: 'role_id', type: 'number', reference: 'roles' },
    { name: 'status', type: 'string', required: true },
    { name: 'is_pool', type: 'boolean' },
    { name: 'mark_utilized', type: 'boolean' },
    { name: 'description', type: 'string' }
  ],
  ip_ranges: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string', required: true },
    { name: 'start_address', type: 'string', required: true },
    { name: 'end_address', type: 'string', required: true },
    { name: 'vrf_id', type: 'number', reference: 'vrfs' },
    { name: 'tenant_id', type: 'number', reference: 'tenants', required: true },
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
    { name: 'tenant_id', type: 'number', reference: 'tenants', required: true },
    { name: 'nat_inside_id', type: 'number', reference: 'ip_addresses' },
    { name: 'prefix_id', type: 'number', reference: 'prefixes' },
    { name: 'description', type: 'string' }
  ],
  interfaces: [
    { name: 'id', type: 'number' },
    { name: 'interface_name', type: 'string', required: true },
    { name: 'interface_status', type: 'string' },
    { name: 'protocol_status', type: 'string' },
    { name: 'operational_mode', type: 'string' },
    { name: 'administrative_mode', type: 'string' },
    { name: 'hardware_type', type: 'string', required: true },
    { name: 'mac_address', type: 'string', required: true },
    { name: 'bia', type: 'string', required: true },
    { name: 'media_type', type: 'string' },
    { name: 'ipv4_address', type: 'string' },
    { name: 'subnet_mask', type: 'string' },
    { name: 'ipv6_address', type: 'string' },
    { name: 'virtual_ipv4_address', type: 'string' },
    { name: 'mtu', type: 'string' },
    { name: 'duplex', type: 'string' },
    { name: 'speed', type: 'string' },
    { name: 'bandwidth', type: 'string' },
    { name: 'device_id', type: 'string', reference: 'device_inventory' },
    { name: 'vrf_id', type: 'number', reference: 'vrfs' }
  ],
  asns: [
    { name: 'id', type: 'number' },
    { name: 'asn', type: 'number', required: true },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'rir_id', type: 'number', reference: 'rirs' },
    { name: 'tenant_id', type: 'number', reference: 'tenants', required: true }
  ],
  asn_ranges: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'start', type: 'number', required: true },
    { name: 'end', type: 'number', required: true },
    { name: 'rir_id', type: 'number', reference: 'rirs' },
    { name: 'tenant_id', type: 'number', reference: 'tenants', required: true },
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
    { name: 'id', type: 'number' },
    { name: 'hostname', type: 'string' },
    { name: 'platform_type_id', type: 'number', reference: 'platform_types' },
    { name: 'connection_type', type: 'string' },
    { name: 'management_ip', type: 'string' },
    { name: 'release', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'running_image', type: 'string' },
    { name: 'restarted', type: 'datetime' },
    { name: 'reload_reason', type: 'string' },
    { name: 'uptime_years', type: 'number' },
    { name: 'uptime_weeks', type: 'number' },
    { name: 'uptime_days', type: 'number' },
    { name: 'uptime_hours', type: 'number' },
    { name: 'uptime_minutes', type: 'number' },
    { name: 'ssh_handshake_time', type: 'number' },
    { name: 'site_id', type: 'number', reference: 'sites' },
    { name: 'tenant_id', type: 'number', reference: 'tenants', required: true },
    { name: 'location_id', type: 'number', reference: 'locations' }
  ],

  // Add missing table schemas
  racks: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'site_id', type: 'number', reference: 'sites' },
    { name: 'location_id', type: 'number', reference: 'locations' },
    { name: 'tenant_id', type: 'number', reference: 'tenants', required: true },
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
    { name: 'is_superuser', type: 'boolean' },
    { name: 'tenant_id', type: 'number', reference: 'tenants' }
  ],

  arp_table: [
    { name: 'id', type: 'number', visible: false },
    { name: 'ipv4_address', type: 'string', required: true, width: 150 },
    { name: 'mac_address', type: 'string', required: true, width: 150 },
    { name: 'ip_arp_age', type: 'string', required: true, width: 100 },
    { name: 'interface_name', type: 'string', required: true, width: 150 },
    { name: 'physical_interface', type: 'string', width: 150 },
    { name: 'interface_module', type: 'string', width: 150 },
    { name: 'arp_state', type: 'string', width: 120 },
    { name: 'ip_route_type', type: 'string', width: 120 },
    { name: 'vrf_name', type: 'string', width: 120 },
    { name: 'device_id', type: 'string', reference: 'device_inventory', width: 200 },
    { name: 'created_at', type: 'datetime', width: 180 },
    { name: 'updated_at', type: 'datetime', width: 180 }
  ],

  platform_types: [
    { name: 'id', type: 'number' },
    { name: 'vendor', type: 'string' },
    { name: 'slug', type: 'string' },
    { name: 'platform_signature', type: 'string' },
    { name: 'platform_type', type: 'string', required: true },
    { name: 'command', type: 'string' },
    { name: 'ignore_platform', type: 'boolean' }
  ],

  net_jobs: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string', required: true },
    { name: 'slug', type: 'string' },
    { name: 'job_uuid', type: 'string' },
    { name: 'platform_type_id', type: 'number', reference: 'platform_types' },
    { name: 'command_list', type: 'array' },
    { name: 'is_scheduled', type: 'boolean' },
    { name: 'next_run', type: 'datetime' },
    { name: 'last_run', type: 'datetime' },
    { name: 'connection_protocol', type: 'string' },
    { name: 'connection_library', type: 'string' },
    { name: 'is_encrypted', type: 'boolean' },
    { name: 'is_parse', type: 'boolean' },
    { name: 'status', type: 'string' }
  ]
};
