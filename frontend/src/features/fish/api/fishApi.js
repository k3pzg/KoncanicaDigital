import { apiRequest } from '../../../shared/api/httpClient';

function authHeaders(token) {
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

export function listFishSpeciesRequest(token) {
  return apiRequest('/fish-species', { headers: authHeaders(token) });
}

export function listFishCategoriesRequest(token) {
  return apiRequest('/fish-categories', { headers: authHeaders(token) });
}

export function listFishEntryEventsRequest(token) {
  return apiRequest('/fish-entry-events', { headers: authHeaders(token) });
}

export function createFishEntryEventRequest(token, payload) {
  return apiRequest('/fish-entry-events', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function createFishEntryEventApiRequest(token, payload) {
  return apiRequest('/api/fish/entry-events', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function listFishControlEventsRequest(token) {
  return apiRequest('/fish-control-events', { headers: authHeaders(token) });
}

export function createFishControlEventRequest(token, payload) {
  return apiRequest('/fish-control-events', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function listFishStockCurrentRequest(token, waterObjectId) {
  const suffix = waterObjectId ? `?waterObjectId=${waterObjectId}` : '';
  return apiRequest(`/fish-stock-current${suffix}`, { headers: authHeaders(token) });
}

export async function listFishStockAggregateRequest(token) {
  try {
    const response = await apiRequest('/api/fish/stock', { headers: authHeaders(token) });
    return Array.isArray(response) ? response : response.items ?? [];
  } catch {
    const fallbackResponse = await listFishStockCurrentRequest(token);
    return Array.isArray(fallbackResponse) ? fallbackResponse : fallbackResponse.items ?? [];
  }
}


export function createFishExitEventRequest(token, payload) {
  return apiRequest('/fish-exit-events', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}
