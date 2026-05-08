import { apiRequest } from '../../../shared/api/httpClient';

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export function listWaterLevelMeasurementsRequest(token, waterObjectId) {
  const suffix = waterObjectId ? `?waterObjectId=${waterObjectId}` : '';
  return apiRequest(`/water-level-measurements${suffix}`, { headers: authHeaders(token) });
}

export function createWaterLevelMeasurementRequest(token, payload) {
  return apiRequest('/water-level-measurements', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function updateWaterLevelMeasurementRequest(token, id, payload) {
  return apiRequest(`/water-level-measurements/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function deleteWaterLevelMeasurementRequest(token, id) {
  return apiRequest(`/water-level-measurements/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
}
