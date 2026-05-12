import {
  createWaterObject,
  deleteWaterObject,
  findWaterObjectById,
  listWaterObjects,
  updateWaterObject
} from '../repositories/water-objects.repository.js';
import { WATER_OBJECT_TYPES } from '../constants/object-types.js';

function normalizePayload(payload) {
  const normalized = {
    code: payload.code?.trim(),
    object_type: payload.object_type,
    area_total_m2: payload.area_total_m2 ? Number(payload.area_total_m2) : null,
    area_productive_m2: payload.area_productive_m2 ? Number(payload.area_productive_m2) : null,
    max_depth_m: payload.max_depth_m ? Number(payload.max_depth_m) : null,
    max_volume_m3: payload.max_volume_m3 ? Number(payload.max_volume_m3) : null,
  };

  // Auto-compute max volume from area × depth when not explicitly provided
  if (!normalized.max_volume_m3 && normalized.area_total_m2 && normalized.max_depth_m) {
    normalized.max_volume_m3 = Math.round(normalized.area_total_m2 * normalized.max_depth_m * 100) / 100;
  }

  Object.assign(normalized, {
    centroid_wkt: payload.centroid_wkt?.trim() || null,
    polygon_geojson: payload.polygon_geojson?.trim() || null,
    is_active: payload.is_active === false || payload.is_active === 0 ? 0 : 1,
    notes: payload.notes?.trim() || null
  });

  if (normalized.polygon_geojson) {
    JSON.parse(normalized.polygon_geojson);
  }

  return normalized;
}

export function validateWaterObjectPayload(payload) {
  if (!payload.code) {
    return 'code is required';
  }

  if (!payload.object_type) {
    return 'object_type is required';
  }

  if (!WATER_OBJECT_TYPES.includes(payload.object_type)) {
    return `object_type must be one of: ${WATER_OBJECT_TYPES.join(', ')}`;
  }

  return null;
}

export async function getWaterObjects() {
  return listWaterObjects();
}

export async function getWaterObjectById(id) {
  return findWaterObjectById(id);
}

export async function addWaterObject(payload) {
  const normalized = normalizePayload(payload);
  const validationError = validateWaterObjectPayload(normalized);
  if (validationError) {
    throw new Error(validationError);
  }

  return createWaterObject(normalized);
}

export async function editWaterObject(id, payload) {
  const normalized = normalizePayload(payload);
  const validationError = validateWaterObjectPayload(normalized);
  if (validationError) {
    throw new Error(validationError);
  }

  return updateWaterObject(id, normalized);
}

export async function removeWaterObject(id) {
  return deleteWaterObject(id);
}
