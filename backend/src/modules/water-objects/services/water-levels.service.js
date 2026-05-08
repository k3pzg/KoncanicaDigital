import {
  createWaterLevelMeasurement,
  deleteWaterLevelMeasurement,
  findWaterLevelMeasurementById,
  listWaterLevelMeasurements,
  updateWaterLevelMeasurement
} from '../repositories/water-levels.repository.js';

function validatePayload(payload) {
  if (!payload.water_object_id) {
    return 'water_object_id is required';
  }
  return null;
}

export async function getWaterLevelMeasurements(waterObjectId) {
  const parsedId = waterObjectId ? Number(waterObjectId) : null;
  return listWaterLevelMeasurements(parsedId);
}

export async function addWaterLevelMeasurement(payload) {
  const error = validatePayload(payload);
  if (error) {
    throw new Error(error);
  }
  return createWaterLevelMeasurement({
    ...payload,
    water_object_id: Number(payload.water_object_id)
  });
}

export async function editWaterLevelMeasurement(id, payload) {
  const existing = await findWaterLevelMeasurementById(id);
  if (!existing) {
    return null;
  }
  return updateWaterLevelMeasurement(id, payload);
}

export async function removeWaterLevelMeasurement(id) {
  return deleteWaterLevelMeasurement(id);
}
