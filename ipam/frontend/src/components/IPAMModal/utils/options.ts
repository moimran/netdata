import { SelectOption } from '../types';

/**
 * Get status options based on table type
 */
export const getStatusOptions = (tableName: string): SelectOption[] => {
  if (tableName === 'prefixes') {
    return [
      { value: 'active', label: 'Active' },
      { value: 'reserved', label: 'Reserved' },
      { value: 'deprecated', label: 'Deprecated' },
      { value: 'container', label: 'Container' }
    ];
  } else if (tableName === 'ip_addresses') {
    return [
      { value: 'active', label: 'Active' },
      { value: 'reserved', label: 'Reserved' },
      { value: 'deprecated', label: 'Deprecated' },
      { value: 'dhcp', label: 'DHCP' },
      { value: 'slaac', label: 'SLAAC' }
    ];
  } else {
    return [
      { value: 'active', label: 'Active' },
      { value: 'reserved', label: 'Reserved' },
      { value: 'deprecated', label: 'Deprecated' }
    ];
  }
};

/**
 * Get role options for IP addresses
 */
export const getRoleOptions = (): SelectOption[] => {
  return [
    { value: '', label: 'None' },
    { value: 'loopback', label: 'Loopback' },
    { value: 'secondary', label: 'Secondary' },
    { value: 'anycast', label: 'Anycast' },
    { value: 'vip', label: 'VIP' },
    { value: 'vrrp', label: 'VRRP' },
    { value: 'hsrp', label: 'HSRP' },
    { value: 'glbp', label: 'GLBP' },
    { value: 'carp', label: 'CARP' }
  ];
};

/**
 * Format reference data for select options
 */
export const formatReferenceDataForSelect = (
  referenceData: any[],
  includeNoneOption: boolean = true
): SelectOption[] => {
  const options = referenceData.map((item: any) => ({
    value: item.id.toString(),
    label: item.name || item.prefix || item.address || item.rd || item.slug || String(item.id)
  }));

  if (includeNoneOption) {
    return [{ value: '', label: 'None' }, ...options];
  }

  return options;
};
