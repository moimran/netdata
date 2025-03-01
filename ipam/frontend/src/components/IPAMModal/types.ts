import type { TableName } from '../../types';

export interface Column {
  name: string;
  type: string;
  required?: boolean;
  reference?: string;
}

export interface IPAMModalProps {
  show: boolean;
  onHide: () => void;
  tableName: TableName;
  schema: Column[];
  item?: any;
}

export interface FormData {
  [key: string]: any;
}

export interface ValidationErrors {
  [key: string]: string | undefined;
}

export interface OpenWeatherResponse {
  main: {
    temp: number;
    humidity: number;
  };
  weather: [{ description: string }];
  wind: { speed: number };
  dt_txt?: string;
}

export interface VlanIdRangeResult {
  min_vid: number;
  max_vid: number;
}

export interface ReferenceItem {
  id: number | string;
  name?: string;
  prefix?: string;
  address?: string;
  rd?: string;
  slug?: string;
  [key: string]: any;
}

export interface SelectOption {
  value: string;
  label: string;
}
