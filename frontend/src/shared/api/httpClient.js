const API_BASE_URL = 'http://localhost:3001';

export async function apiRequest(path, options = {}) {
  const { headers: customHeaders, ...restOptions } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(customHeaders ?? {})
    }
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? 'Request failed');
  }

  return data;
}
