export type TableName = 'regions' | 'site_groups' | 'sites' | 'locations' | 'vrfs' | 'rirs' | 'aggregates' | 'roles' | 'prefixes' | 'ip_ranges' | 'ip_addresses' | 'asns' | 'asn_ranges' | 'vlans' | 'vlan_groups' | 'tenants' | 'route_targets' | 'vrf_import_targets' | 'vrf_export_targets' | 'devices' | 'interfaces';

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

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
