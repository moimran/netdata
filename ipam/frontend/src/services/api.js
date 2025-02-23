const API_BASE_URL = 'http://localhost:8000/api';

export const fetchData = async () => {
  const response = await fetch(`${API_BASE_URL}/tables`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const fetchTableSchema = async (tableName) => {
  const response = await fetch(`${API_BASE_URL}/schema/${tableName}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const createItem = async (tableName, item) => {
  const response = await fetch(`${API_BASE_URL}/v1/${tableName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const updateItem = async (tableName, id, item) => {
  const response = await fetch(`${API_BASE_URL}/v1/${tableName}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(item),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const deleteItem = async (tableName, id) => {
  const response = await fetch(`${API_BASE_URL}/v1/${tableName}/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};
