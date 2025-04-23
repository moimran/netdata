// Type for component categories
export type ComponentCategory = 'view' | 'layout' | 'ui' | 'table' | 'detail' | 'common';

// Table names
export type TableName = 
  | 'prefixes' 
  | 'ip_addresses' 
  | 'vrfs' 
  | 'vlans' 
  | 'vlan_groups' 
  | 'route_targets' 
  | 'sites' 
  | 'devices' 
  | 'racks' 
  | 'regions' 
  | 'tenants' 
  | 'asns'
  | 'users'
  | 'credentials'
  | 'interfaces'
  | 'roles'
  | 'rirs'
  | 'aggregates'
  | 'ip_ranges'
  | 'site_groups'
  | 'locations'
  | 'vrf_import_targets'
  | 'vrf_export_targets'
  | 'asn_ranges'
  | 'device_inventory';

export interface TableSchema {
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    is_foreign_key?: boolean;
    input_type?: string;
    description?: string;
    default?: any;
    references?: {
      table: string;
      column: string;
    };
  }>;
}

// Generic API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Common properties for all entities
export interface BaseEntity {
  id: number;
  created_at?: string;
  updated_at?: string;
}

// Entity-specific types
export interface Region extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  parent_id?: number | null;
}

export interface Site extends BaseEntity {
  name: string;
  slug: string;
  status: 'active' | 'planned' | 'retired';
  region_id?: number | null;
  site_group_id?: number | null;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface SiteGroup extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  parent_id?: number | null;
}

export interface VRF extends BaseEntity {
  name: string;
  rd?: string | null;
  tenant_id?: number | null;
  enforce_unique?: boolean;
  description?: string;
}

export interface Prefix extends BaseEntity {
  prefix: string;
  status: 'active' | 'reserved' | 'deprecated' | 'available';
  vrf_id?: number | null;
  tenant_id?: number | null;
  site_id?: number | null;
  vlan_id?: number | null;
  role_id?: number | null;
  is_pool?: boolean;
  description?: string;
}

export interface IPAddress extends BaseEntity {
  address: string;
  status: 'active' | 'reserved' | 'deprecated' | 'dhcp';
  vrf_id?: number | null;
  tenant_id?: number | null;
  role?: string | null;
  assigned_object_type?: string | null;
  assigned_object_id?: number | null;
  description?: string;
}

export interface VLAN extends BaseEntity {
  vid: number;
  name: string;
  status: 'active' | 'reserved' | 'deprecated';
  vlan_group_id?: number | null;
  tenant_id?: number | null;
  site_id?: number | null;
  role_id?: number | null;
  description?: string;
}

export interface VLANGroup extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  site_id?: number | null;
}

export interface Role extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
}

export interface ASN extends BaseEntity {
  asn: number;
  tenant_id?: number | null;
  description?: string;
}

export interface ASNRange extends BaseEntity {
  name: string;
  first_asn: number;
  last_asn: number;
  tenant_id?: number | null;
  description?: string;
}

export interface Device extends BaseEntity {
  name: string;
  status: 'active' | 'offline' | 'planned' | 'staged' | 'failed';
  site_id?: number | null;
  tenant_id?: number | null;
  platform?: string | null;
  primary_ip4_id?: number | null;
  primary_ip6_id?: number | null;
  description?: string;
}

export interface Interface extends BaseEntity {
  name: string;
  device_id: number;
  type: string;
  enabled: boolean;
  mac_address?: string | null;
  description?: string;
}

export interface Credential extends BaseEntity {
  name: string;
  username: string;
  password?: string;
  description?: string;
}

// Type mapping for TableName to corresponding entity type
export type EntityTypeMap = {
  'regions': Region;
  'site_groups': SiteGroup;
  'sites': Site;
  'vrfs': VRF;
  'prefixes': Prefix;
  'ip_addresses': IPAddress;
  'vlans': VLAN;
  'vlan_groups': VLANGroup;
  'roles': Role;
  'asns': ASN;
  'asn_ranges': ASNRange;
  'devices': Device;
  'interfaces': Interface;
  'credentials': Credential;
  [key: string]: BaseEntity;
}

// Helper type to get entity type from table name
export type EntityType<T extends TableName> = EntityTypeMap[T];

// Response types for each entity
export type TableResponse<T extends TableName> = PaginatedResponse<EntityType<T>>;
export type ItemResponse<T extends TableName> = EntityType<T>;
