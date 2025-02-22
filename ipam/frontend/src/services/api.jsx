const API_BASE_URL = 'http://localhost:8000/api/v1';

export const fetchData = async () => {
  try {
    const tables = ['regions', 'site_groups', 'sites', 'locations', 'vrfs', 'rirs', 'aggregates', 'roles', 'prefixes', 'ip_ranges', 'ip_addresses'];
    const data = {};

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

export const createItem = async (table, item) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
};

export const updateItem = async (table, id, item) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${table}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

export const deleteItem = async (table, id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/${table}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};