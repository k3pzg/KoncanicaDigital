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

export function listFishStockAggregateRequest(token) {
  return apiRequest('/api/fish/stock', { headers: authHeaders(token) });
}
