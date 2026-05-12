import { Router } from 'express';
import { requireAuth } from '../../auth/middleware/require-auth.middleware.js';
import {
  addFeedReceipt,
  addFeedType,
  addFeedingEvent,
  getFeedReceipts,
  getFeedStock,
  getFeedTypes,
  getFeedingEvents
} from '../services/feeding.service.js';

export const feedingRouter = Router();

feedingRouter.use(requireAuth);

feedingRouter.get('/feed-types', async (_req, res) => {
  try {
    const items = await getFeedTypes();
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

feedingRouter.post('/feed-types', async (req, res) => {
  try {
    const item = await addFeedType(req.body ?? {});
    return res.status(201).json({ item });
  } catch (err) {
    const status = err.message === 'feed_type_already_exists' ? 409 : 400;
    return res.status(status).json({ message: err.message });
  }
});

feedingRouter.get('/feed-stock', async (_req, res) => {
  try {
    const items = await getFeedStock();
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

feedingRouter.get('/feed-receipts', async (req, res) => {
  try {
    const items = await getFeedReceipts(req.query.feedTypeId);
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

feedingRouter.post('/feed-receipts', async (req, res) => {
  try {
    const item = await addFeedReceipt(req.body ?? {});
    return res.status(201).json({ item });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

feedingRouter.get('/feeding-events', async (req, res) => {
  try {
    const items = await getFeedingEvents(req.query.waterObjectId, req.query.feedTypeId);
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

feedingRouter.post('/feeding-events', async (req, res) => {
  try {
    const item = await addFeedingEvent(req.body ?? {});
    return res.status(201).json({ item });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});
