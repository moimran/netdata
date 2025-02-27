export type TableName = 'regions' | 'site_groups' | 'sites' | 'locations' | 'vrfs' | 'rirs' | 'aggregates' | 'roles' | 'prefixes' | 'ip_ranges' | 'ip_addresses' | 'asns' | 'asn_ranges';

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
