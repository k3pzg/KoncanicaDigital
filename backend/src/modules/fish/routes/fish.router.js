import { Router } from 'express';
import { requireAuth } from '../../auth/middleware/require-auth.middleware.js';
import {
  addFishControlEvent,
  addFishEntryEvent,
  addFishEntryEvents,
  addFishExitEvent,
  getFishCategories,
  getFishControlEventById,
  getFishControlEvents,
  getFishEntryEventById,
  getFishEntryEvents,
  getFishExitEventById,
  getFishExitEvents,
  getFishSpecies,
  getFishStockAggregate,
  getFishStock
} from '../services/fish.service.js';

export const fishRouter = Router();

fishRouter.get('/api/fish/stock', async (_, response) => {
  try {
    const items = await getFishStockAggregate();
    return response.status(200).json(items);
  } catch {
    return response.status(500).json({ message: 'Failed to load fish stock.' });
  }
});

fishRouter.use(requireAuth);

fishRouter.get('/fish-species', async (_, response) => {
  const items = await getFishSpecies();
  return response.status(200).json({ items });
});

fishRouter.get('/fish-categories', async (_, response) => {
  const items = await getFishCategories();
  return response.status(200).json({ items });
});

fishRouter.get('/fish-entry-events', async (_, response) => {
  const items = await getFishEntryEvents();
  return response.status(200).json({ items });
});

fishRouter.get('/fish-entry-events/:id', async (request, response) => {
  const item = await getFishEntryEventById(Number(request.params.id));
  if (!item) {
    return response.status(404).json({ message: 'Not found' });
  }

  return response.status(200).json({ item });
});

fishRouter.post('/fish-entry-events', async (request, response) => {
  try {
    const payload = request.body ?? {};
    if (Array.isArray(payload.entries)) {
      const items = await addFishEntryEvents(payload);
      return response.status(201).json({ items });
    }

    const item = await addFishEntryEvent(payload);
    return response.status(201).json({ item });
  } catch (error) {
    return response.status(400).json({ message: error.message });
  }
});


fishRouter.post('/api/fish/entry-events', async (request, response) => {
  try {
    const payload = request.body ?? {};
    if (Array.isArray(payload.entries)) {
      const items = await addFishEntryEvents(payload);
      return response.status(201).json({ items });
    }

    const item = await addFishEntryEvent(payload);
    return response.status(201).json({ item });
  } catch (error) {
    return response.status(400).json({ message: error.message });
  }
});

fishRouter.get('/fish-control-events', async (_, response) => {
  const items = await getFishControlEvents();
  return response.status(200).json({ items });
});

fishRouter.get('/fish-exit-events', async (_, response) => {
  const items = await getFishExitEvents();
  return response.status(200).json({ items });
});

fishRouter.get('/fish-exit-events/:id', async (request, response) => {
  const item = await getFishExitEventById(Number(request.params.id));
  if (!item) {
    return response.status(404).json({ message: 'Not found' });
  }

  return response.status(200).json({ item });
});

fishRouter.post('/fish-exit-events', async (request, response) => {
  try {
    const item = await addFishExitEvent(request.body ?? {});
    return response.status(201).json({ item });
  } catch (error) {
    return response.status(400).json({ message: error.message });
  }
});

fishRouter.post('/api/fish/exit-events', async (request, response) => {
  try {
    const item = await addFishExitEvent(request.body ?? {});
    return response.status(201).json({ item });
  } catch (error) {
    return response.status(400).json({ message: error.message });
  }
});

fishRouter.get('/fish-control-events/:id', async (request, response) => {
  const item = await getFishControlEventById(Number(request.params.id));
  if (!item) {
    return response.status(404).json({ message: 'Not found' });
  }

  return response.status(200).json({ item });
});

fishRouter.post('/fish-control-events', async (request, response) => {
  try {
    const item = await addFishControlEvent(request.body ?? {});
    return response.status(201).json({ item });
  } catch (error) {
    return response.status(400).json({ message: error.message });
  }
});

fishRouter.get('/fish-stock-current', async (request, response) => {
  const items = await getFishStock(request.query.waterObjectId);
  return response.status(200).json({ items });
});
