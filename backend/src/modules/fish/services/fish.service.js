import {
  createFishControlEvent,
  createFishEntryEvent,
  createFishEntryEvents,
  findFishControlEventById,
  findFishEntryEventById,
  listFishCategories,
  listFishControlEvents,
  listFishEntryEvents,
  listFishSpecies,
  listFishStockAggregate,
  listFishStockCurrent
} from '../repositories/fish.repository.js';
import {
  normalizeControlPayload,
  normalizeEntryPayload,
  normalizeEntryPayloads,
  validateControlPayload,
  validateEntryPayload
} from '../validation/fish.validation.js';

export async function getFishSpecies() {
  return listFishSpecies();
}

export async function getFishCategories() {
  return listFishCategories();
}

export async function getFishEntryEvents() {
  return listFishEntryEvents();
}

export async function getFishEntryEventById(id) {
  return findFishEntryEventById(id);
}

export async function addFishEntryEvent(payload) {
  if (Array.isArray(payload?.entries)) {
    return addFishEntryEvents(payload);
  }

  const normalized = normalizeEntryPayload(payload);
  const validationError = validateEntryPayload(normalized);
  if (validationError) {
    throw new Error(validationError);
  }

  const id = await createFishEntryEvent(normalized);
  return findFishEntryEventById(id);
}

export async function addFishEntryEvents(payload) {
  const normalizedEntries = normalizeEntryPayloads(payload);
  if (!normalizedEntries.length) {
    throw new Error('at least one entry is required');
  }

  for (const [index, entry] of normalizedEntries.entries()) {
    const validationError = validateEntryPayload(entry);
    if (validationError) {
      throw new Error(`entries[${index}]: ${validationError}`);
    }
  }

  const ids = await createFishEntryEvents(normalizedEntries);
  return Promise.all(ids.map((id) => findFishEntryEventById(id)));
}

export async function getFishControlEvents() {
  return listFishControlEvents();
}

export async function getFishControlEventById(id) {
  return findFishControlEventById(id);
}

export async function addFishControlEvent(payload) {
  const normalized = normalizeControlPayload(payload);
  const validationError = validateControlPayload(normalized);
  if (validationError) {
    throw new Error(validationError);
  }

  const id = await createFishControlEvent(normalized);
  return findFishControlEventById(id);
}

export async function getFishStock(waterObjectId) {
  const parsedWaterObjectId = waterObjectId ? Number(waterObjectId) : null;
  return listFishStockCurrent(parsedWaterObjectId);
}

export async function getFishStockAggregate() {
  return listFishStockAggregate();
}
