import { MIN_QUANTITY_KG } from '../constants/feeding.constants.js';
import {
  createFeedReceipt,
  createFeedingEvent,
  createFeedType,
  findFeedReceiptById,
  findFeedTypeByName,
  findFeedingEventById,
  listFeedReceipts,
  listFeedStock,
  listFeedTypes,
  listFeedingEvents
} from '../repositories/feeding.repository.js';

// ── feed types ─────────────────────────────────────────────────────────────────

export async function getFeedTypes() {
  return listFeedTypes();
}

export async function addFeedType(payload) {
  const name = String(payload?.name ?? '').trim();
  if (!name) throw new Error('name is required');
  if (name.length > 100) throw new Error('name is too long');

  const existing = await findFeedTypeByName(name);
  if (existing) throw new Error('feed_type_already_exists');

  return createFeedType(name);
}

// ── feed stock ─────────────────────────────────────────────────────────────────

export async function getFeedStock() {
  return listFeedStock();
}

// ── feed receipts ──────────────────────────────────────────────────────────────

function normalizeReceiptPayload(payload) {
  return {
    feed_type_id: payload.feed_type_id ? Number(payload.feed_type_id) : null,
    new_feed_type_name: payload.new_feed_type_name ? String(payload.new_feed_type_name).trim() : null,
    quantity_kg: payload.quantity_kg !== undefined && payload.quantity_kg !== '' ? Number(payload.quantity_kg) : null,
    supplier: payload.supplier ? String(payload.supplier).trim() || null : null,
    receipt_date: payload.receipt_date ? String(payload.receipt_date).trim() : null,
    note: payload.note ? String(payload.note).trim() || null : null
  };
}

function validateReceiptPayload(p) {
  if (!p.feed_type_id && !p.new_feed_type_name) return 'feed_type_id or new_feed_type_name is required';
  if (p.quantity_kg === null || !Number.isFinite(p.quantity_kg)) return 'quantity_kg is required';
  if (p.quantity_kg < MIN_QUANTITY_KG) return 'quantity_kg must be greater than zero';
  if (!p.receipt_date) return 'receipt_date is required';
  return null;
}

async function resolveFeedTypeId(payload) {
  if (Number.isInteger(payload.feed_type_id) && payload.feed_type_id > 0) {
    return payload.feed_type_id;
  }
  if (!payload.new_feed_type_name) throw new Error('feed_type_id or new_feed_type_name is required');

  const existing = await findFeedTypeByName(payload.new_feed_type_name);
  if (existing) return existing.id;

  const created = await createFeedType(payload.new_feed_type_name);
  return created.id;
}

export async function getFeedReceipts(feedTypeId) {
  const parsedId = feedTypeId ? Number(feedTypeId) : null;
  return listFeedReceipts(parsedId);
}

export async function addFeedReceipt(payload) {
  const normalized = normalizeReceiptPayload(payload);
  const error = validateReceiptPayload(normalized);
  if (error) throw new Error(error);

  const feedTypeId = await resolveFeedTypeId(normalized);
  const id = await createFeedReceipt({ ...normalized, feed_type_id: feedTypeId });
  return findFeedReceiptById(id);
}

// ── feeding events ─────────────────────────────────────────────────────────────

function normalizeFeedingEventPayload(payload) {
  return {
    feed_type_id: payload.feed_type_id ? Number(payload.feed_type_id) : null,
    water_object_id: payload.water_object_id ? Number(payload.water_object_id) : null,
    quantity_kg: payload.quantity_kg !== undefined && payload.quantity_kg !== '' ? Number(payload.quantity_kg) : null,
    event_date: payload.event_date ? String(payload.event_date).trim() : null,
    note: payload.note ? String(payload.note).trim() || null : null
  };
}

function validateFeedingEventPayload(p) {
  if (!p.feed_type_id || !Number.isInteger(p.feed_type_id) || p.feed_type_id <= 0) return 'feed_type_id is required';
  if (!p.water_object_id || !Number.isInteger(p.water_object_id) || p.water_object_id <= 0) return 'water_object_id is required';
  if (p.quantity_kg === null || !Number.isFinite(p.quantity_kg)) return 'quantity_kg is required';
  if (p.quantity_kg < MIN_QUANTITY_KG) return 'quantity_kg must be greater than zero';
  if (!p.event_date) return 'event_date is required';
  return null;
}

export async function getFeedingEvents(waterObjectId, feedTypeId) {
  const parsedWoId = waterObjectId ? Number(waterObjectId) : null;
  const parsedFtId = feedTypeId ? Number(feedTypeId) : null;
  return listFeedingEvents(parsedWoId, parsedFtId);
}

export async function addFeedingEvent(payload) {
  const normalized = normalizeFeedingEventPayload(payload);
  const error = validateFeedingEventPayload(normalized);
  if (error) throw new Error(error);

  const id = await createFeedingEvent(normalized);
  return findFeedingEventById(id);
}
