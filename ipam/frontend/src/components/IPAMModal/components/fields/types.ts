import { ValidationErrors } from '../../../../hooks/forms/useFormState';

/**
 * Common field props interface
 */
export interface CommonFieldProps {
  name: string;
  label: string;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

/**
 * Reference field props interface
 */
export interface ReferenceFieldProps extends CommonFieldProps {
  referenceTable: string;
  referenceData: Record<string, any[]>;
  formatReferenceValue: (value: number | string | null, tableName: string) => string;
  getReferenceItem?: (tableName: string, id: number | string | null) => any;
}

/**
 * VLAN ID ranges field props interface
 */
export interface VlanIdRangesFieldProps {
  vlanIdRanges: string;
  setVlanIdRanges: (value: string) => void;
  validationErrors: ValidationErrors;
}
