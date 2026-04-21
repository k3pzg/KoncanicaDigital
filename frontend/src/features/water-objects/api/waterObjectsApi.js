import { apiRequest } from '../../../shared/api/httpClient';

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export function listWaterObjectsRequest(token) {
  return apiRequest('/water-objects', { headers: authHeaders(token) });
}

export function createWaterObjectRequest(token, payload) {
  return apiRequest('/water-objects', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function updateWaterObjectRequest(token, id, payload) {
  return apiRequest(`/water-objects/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function deleteWaterObjectRequest(token, id) {
  return apiRequest(`/water-objects/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
}
