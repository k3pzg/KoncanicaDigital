import { Router } from 'express';
import { requireAuth } from '../../auth/middleware/require-auth.middleware.js';
import {
  addWaterLevelMeasurement,
  editWaterLevelMeasurement,
  getWaterLevelMeasurements,
  removeWaterLevelMeasurement
} from '../services/water-levels.service.js';

export const waterLevelsRouter = Router();
waterLevelsRouter.use(requireAuth);

waterLevelsRouter.get('/', async (request, response) => {
  const items = await getWaterLevelMeasurements(request.query.waterObjectId);
  return response.status(200).json({ items });
});

waterLevelsRouter.post('/', async (request, response) => {
  try {
    const item = await addWaterLevelMeasurement(request.body ?? {});
    return response.status(201).json({ item });
  } catch (error) {
    return response.status(400).json({ message: error.message });
  }
});

waterLevelsRouter.put('/:id', async (request, response) => {
  try {
    const item = await editWaterLevelMeasurement(Number(request.params.id), request.body ?? {});
    if (!item) {
      return response.status(404).json({ message: 'Not found' });
    }
    return response.status(200).json({ item });
  } catch (error) {
    return response.status(400).json({ message: error.message });
  }
});

waterLevelsRouter.delete('/:id', async (request, response) => {
  const isDeleted = await removeWaterLevelMeasurement(Number(request.params.id));
  if (!isDeleted) {
    return response.status(404).json({ message: 'Not found' });
  }
  return response.status(204).send();
});
