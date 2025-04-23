import { MRT_ColumnDef } from 'mantine-react-table';
import { TABLE_METADATA, TableName } from './tableMetadata';
import { components } from '../../api/generated-types';

type SchemaMap = {
  vlans: components['schemas']['VLANRead'];
  vlan_groups: components['schemas']['VLANGroupRead'];
  vrfs: components['schemas']['VRFRead'];
  route_targets: components['schemas']['RouteTargetRead'];
  rirs: components['schemas']['RIRRead'];
  aggregates: components['schemas']['AggregateRead'];
  prefixes: components['schemas']['PrefixRead'];
  ip_addresses: components['schemas']['IPAddressRead'];
  ip_ranges: components['schemas']['IPRangeRead'];
  asns: components['schemas']['ASNRead'];
  asn_ranges: components['schemas']['ASNRangeRead'];
  tenants: components['schemas']['TenantRead'];
  regions: components['schemas']['RegionRead'];
  site_groups: components['schemas']['SiteGroupRead'];
  sites: components['schemas']['SiteRead'];
  roles: components['schemas']['RoleRead'];
  platform_types: components['schemas']['PlatformTypeRead'];
  // device_types: components['schemas']['DeviceTypeRead']; // Commented out - Read schema not found
  devices: components['schemas']['DeviceRead'];
  interfaces: components['schemas']['InterfaceRead'];
  device_inventory: components['schemas']['DeviceInventoryRead'];
  // platforms: components['schemas']['PlatformRead']; // Commented out - Read schema not found
};

export function generateColumns<T extends keyof SchemaMap>(
  tableName: T
): MRT_ColumnDef<SchemaMap[T]>[] {
  const tableMeta = TABLE_METADATA[tableName as TableName];

  if (!tableMeta || !tableMeta.columns) {
    console.error(`No metadata or columns found for table: ${tableName}`);
    return [];
  }

  return tableMeta.columns
    .filter((meta) => meta.visible !== false)
    .map((meta) => {
      const columnDef: MRT_ColumnDef<SchemaMap[T]> = {
        accessorKey: meta.name as string,
        header: meta.label || meta.name,
      };

      if (meta.size) {
        columnDef.size = meta.size;
      }

      // TODO: Implement cell rendering based on meta.type and meta.reference
      // e.g., if (meta.type === 'foreignKey' && meta.reference) { ... create link ... }
      // e.g., if (meta.type === 'datetime') { ... format date ... }

      return columnDef;
    });
}

// Example Usage (assuming you have a component that needs columns for 'vlans'):
// const vlanColumns = generateColumns('vlans');
// const prefixColumns = generateColumns('prefixes');
