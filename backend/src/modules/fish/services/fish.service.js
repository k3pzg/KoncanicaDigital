import {
  createFishControlEvent,
  createFishEntryEvent,
  findFishControlEventById,
  findFishEntryEventById,
  listFishCategories,
  listFishControlEvents,
  listFishEntryEvents,
  listFishSpecies,
  listFishStockCurrent
} from '../repositories/fish.repository.js';
import {
  normalizeControlPayload,
  normalizeEntryPayload,
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
  const normalized = normalizeEntryPayload(payload);
  const validationError = validateEntryPayload(normalized);
  if (validationError) {
    throw new Error(validationError);
  }

  const id = await createFishEntryEvent(normalized);
  return findFishEntryEventById(id);
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
