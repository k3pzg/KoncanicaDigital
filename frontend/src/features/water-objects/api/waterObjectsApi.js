import { apiRequest } from '../../../shared/api/httpClient';

function authHeaders(token, includeJson = false) {
  return {
    Authorization: `Bearer ${token}`,
    ...(includeJson ? { 'Content-Type': 'application/json' } : {})
  };
}

export function listWaterObjectsRequest(token) {
  return apiRequest('/water-objects', { headers: authHeaders(token) });
}

export function createWaterObjectRequest(token, payload) {
  return apiRequest('/water-objects', {
    method: 'POST',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload)
  });
}

export function updateWaterObjectRequest(token, id, payload) {
  return apiRequest(`/water-objects/${id}`, {
    method: 'PUT',
    headers: authHeaders(token, true),
    body: JSON.stringify(payload)
  });
}

export function deleteWaterObjectRequest(token, id) {
  return apiRequest(`/water-objects/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
}
