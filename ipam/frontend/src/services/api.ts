const API_BASE_URL = 'http://localhost:8000/api/v1';

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
    const response = await fetch(`${API_BASE_URL}/schema/${table}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
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
        const response = await fetch(`${API_BASE_URL}/${table}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        data[table] = await response.json();
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
    const response = await fetch(`${API_BASE_URL}/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
};

export const updateItem = async <T extends object>(table: TableName, id: number, item: T): Promise<ApiResponse<T>> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${table}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

export const deleteItem = async (table: TableName, id: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${table}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

export const fetchReferenceOptions = async (table: TableName, fieldName: string): Promise<any[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/reference-options/${table}/${fieldName}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching reference options:', error);
    throw error;
  }
};