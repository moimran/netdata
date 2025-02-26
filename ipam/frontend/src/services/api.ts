import axios from 'axios';
import { API_URL, apiClient } from '../api/client';

const API_BASE_URL = API_URL;

type TableName = 'regions' | 'site_groups' | 'sites' | 'locations' | 'vrfs' | 'rirs' | 'aggregates' | 'roles' | 'prefixes' | 'ip_ranges' | 'ip_addresses';

interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface TableData {
  [key: string]: any[];
}

interface TableSchema {
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

export const fetchTableSchema = async (table: TableName): Promise<TableSchema> => {
  try {
    const response = await apiClient.get(`schema/${table}`);
    if (!response.data) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching table schema:', error);
    throw error;
  }
};

export const fetchData = async (): Promise<TableData> => {
  try {
    const tables: TableName[] = ['regions', 'site_groups', 'sites', 'locations', 'vrfs', 'rirs', 'aggregates', 'roles', 'prefixes', 'ip_ranges', 'ip_addresses'];
    const data: TableData = {};

    await Promise.all(
      tables.map(async (table) => {
        const response = await apiClient.get(`${table}`);
        if (!response.data) throw new Error(`HTTP error! status: ${response.status}`);
        data[table] = response.data;
      })
    );

    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

export const createItem = async <T extends object>(table: TableName, item: T): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.post(`${table}`, item);

    if (!response.data) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = response.data;
    return result;
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
};

export const updateItem = async <T extends object>(table: TableName, id: number, item: T): Promise<ApiResponse<T>> => {
  try {
    const response = await apiClient.put(`${table}/${id}`, item);

    if (!response.data) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = response.data;
    return result;
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

export const deleteItem = async (table: TableName, id: number): Promise<void> => {
  try {
    const response = await apiClient.delete(`${table}/${id}`);

    if (!response.data) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

export const fetchReferenceOptions = async (table: TableName, fieldName: string): Promise<any[]> => {
  try {
    const response = await apiClient.get(`reference-options/${table}/${fieldName}`);
    if (!response.data) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching reference options:', error);
    throw error;
  }
};