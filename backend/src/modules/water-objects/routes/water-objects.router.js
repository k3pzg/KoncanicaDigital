import { Router } from 'express';
import { requireAuth } from '../../auth/middleware/require-auth.middleware.js';
import {
  addWaterObject,
  editWaterObject,
  getWaterObjectById,
  getWaterObjects,
  removeWaterObject
} from '../services/water-objects.service.js';

export const waterObjectsRouter = Router();
waterObjectsRouter.use(requireAuth);

waterObjectsRouter.get('/', async (_, response) => {
  const items = await getWaterObjects();
  return response.status(200).json({ items });
});

waterObjectsRouter.get('/:id', async (request, response) => {
  const item = await getWaterObjectById(Number(request.params.id));
  if (!item) {
    return response.status(404).json({ message: 'Not found' });
  }

  return response.status(200).json({ item });
});

waterObjectsRouter.post('/', async (request, response) => {
  try {
    const item = await addWaterObject(request.body ?? {});
    return response.status(201).json({ item });
  } catch (error) {
    return response.status(400).json({ message: error.message });
  }
});

waterObjectsRouter.put('/:id', async (request, response) => {
  try {
    const item = await editWaterObject(Number(request.params.id), request.body ?? {});
    if (!item) {
      return response.status(404).json({ message: 'Not found' });
    }

    return response.status(200).json({ item });
  } catch (error) {
    return response.status(400).json({ message: error.message });
  }
});

waterObjectsRouter.delete('/:id', async (request, response) => {
  const isDeleted = await removeWaterObject(Number(request.params.id));
  if (!isDeleted) {
    return response.status(404).json({ message: 'Not found' });
  }

  return response.status(204).send();
});
