import { apiRequest } from '../../../shared/api/httpClient';

function authHeaders(token) {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function listFeedTypesRequest(token) {
  return apiRequest('/feed-types', { headers: authHeaders(token) });
}

export function createFeedTypeRequest(token, payload) {
  return apiRequest('/feed-types', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function listFeedStockRequest(token) {
  return apiRequest('/feed-stock', { headers: authHeaders(token) });
}

export function listFeedReceiptsRequest(token, feedTypeId) {
  const suffix = feedTypeId ? `?feedTypeId=${feedTypeId}` : '';
  return apiRequest(`/feed-receipts${suffix}`, { headers: authHeaders(token) });
}

export function createFeedReceiptRequest(token, payload) {
  return apiRequest('/feed-receipts', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function listFeedingEventsRequest(token, { waterObjectId, feedTypeId } = {}) {
  const params = new URLSearchParams();
  if (waterObjectId) params.set('waterObjectId', waterObjectId);
  if (feedTypeId) params.set('feedTypeId', feedTypeId);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/feeding-events${suffix}`, { headers: authHeaders(token) });
}

export function createFeedingEventRequest(token, payload) {
  return apiRequest('/feeding-events', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}
