import { getDatabasePool } from '../../../config/database.js';

// ── feed types ─────────────────────────────────────────────────────────────────

export async function listFeedTypes() {
  const db = getDatabasePool();
  const [rows] = await db.query(
    'SELECT * FROM feed_types WHERE is_active = 1 ORDER BY name ASC'
  );
  return rows;
}

export async function findFeedTypeByName(name) {
  const db = getDatabasePool();
  const [rows] = await db.query(
    'SELECT * FROM feed_types WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1',
    [name]
  );
  return rows[0] ?? null;
}

export async function createFeedType(name) {
  const db = getDatabasePool();
  const [result] = await db.query(
    'INSERT INTO feed_types (name) VALUES (?)',
    [name.trim()]
  );
  const [rows] = await db.query('SELECT * FROM feed_types WHERE id = ? LIMIT 1', [result.insertId]);
  return rows[0];
}

// ── feed stock ─────────────────────────────────────────────────────────────────

export async function listFeedStock() {
  const db = getDatabasePool();
  const [rows] = await db.query(
    `SELECT ft.id AS feed_type_id, ft.name AS feed_type_name,
            COALESCE(fsc.quantity_kg, 0) AS quantity_kg,
            fsc.last_updated_at
     FROM feed_types ft
     LEFT JOIN feed_stock_current fsc ON fsc.feed_type_id = ft.id
     WHERE ft.is_active = 1
     ORDER BY ft.name ASC`
  );
  return rows.map((r) => ({
    feed_type_id: Number(r.feed_type_id),
    feed_type_name: r.feed_type_name,
    quantity_kg: Number(r.quantity_kg),
    last_updated_at: r.last_updated_at ?? null
  }));
}

// ── feed receipts ──────────────────────────────────────────────────────────────

export async function listFeedReceipts(feedTypeId) {
  const db = getDatabasePool();
  const where = feedTypeId ? 'WHERE fr.feed_type_id = ?' : '';
  const params = feedTypeId ? [feedTypeId] : [];
  const [rows] = await db.query(
    `SELECT fr.*, ft.name AS feed_type_name
     FROM feed_receipts fr
     INNER JOIN feed_types ft ON ft.id = fr.feed_type_id
     ${where}
     ORDER BY fr.receipt_date DESC, fr.id DESC`,
    params
  );
  return rows;
}

export async function findFeedReceiptById(id) {
  const db = getDatabasePool();
  const [rows] = await db.query(
    `SELECT fr.*, ft.name AS feed_type_name
     FROM feed_receipts fr
     INNER JOIN feed_types ft ON ft.id = fr.feed_type_id
     WHERE fr.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createFeedReceipt(payload) {
  const db = getDatabasePool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO feed_receipts (feed_type_id, quantity_kg, supplier, receipt_date, note)
       VALUES (?, ?, ?, ?, ?)`,
      [
        payload.feed_type_id,
        payload.quantity_kg,
        payload.supplier ?? null,
        payload.receipt_date,
        payload.note ?? null
      ]
    );

    await connection.query(
      `INSERT INTO feed_stock_current (feed_type_id, quantity_kg)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE
         quantity_kg = quantity_kg + VALUES(quantity_kg)`,
      [payload.feed_type_id, payload.quantity_kg]
    );

    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ── feeding events ─────────────────────────────────────────────────────────────

export async function listFeedingEvents(waterObjectId, feedTypeId) {
  const db = getDatabasePool();
  const conditions = [];
  const params = [];

  if (waterObjectId) {
    conditions.push('fe.water_object_id = ?');
    params.push(waterObjectId);
  }
  if (feedTypeId) {
    conditions.push('fe.feed_type_id = ?');
    params.push(feedTypeId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await db.query(
    `SELECT fe.*, ft.name AS feed_type_name, wo.code AS water_object_code
     FROM feeding_events fe
     INNER JOIN feed_types ft ON ft.id = fe.feed_type_id
     INNER JOIN water_objects wo ON wo.id = fe.water_object_id
     ${where}
     ORDER BY fe.event_date DESC, fe.id DESC`,
    params
  );
  return rows;
}

export async function findFeedingEventById(id) {
  const db = getDatabasePool();
  const [rows] = await db.query(
    `SELECT fe.*, ft.name AS feed_type_name, wo.code AS water_object_code
     FROM feeding_events fe
     INNER JOIN feed_types ft ON ft.id = fe.feed_type_id
     INNER JOIN water_objects wo ON wo.id = fe.water_object_id
     WHERE fe.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function createFeedingEvent(payload) {
  const db = getDatabasePool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the stock row and validate availability
    const [stockRows] = await connection.query(
      'SELECT quantity_kg FROM feed_stock_current WHERE feed_type_id = ? FOR UPDATE',
      [payload.feed_type_id]
    );

    const available = Number(stockRows[0]?.quantity_kg ?? 0);
    if (available < payload.quantity_kg) {
      throw new Error(
        `Nedovoljno zaliha: na stanju ${available.toFixed(3)} kg, zatraženo ${payload.quantity_kg.toFixed(3)} kg`
      );
    }

    const [result] = await connection.query(
      `INSERT INTO feeding_events (feed_type_id, water_object_id, quantity_kg, event_date, note)
       VALUES (?, ?, ?, ?, ?)`,
      [
        payload.feed_type_id,
        payload.water_object_id,
        payload.quantity_kg,
        payload.event_date,
        payload.note ?? null
      ]
    );

    await connection.query(
      'UPDATE feed_stock_current SET quantity_kg = quantity_kg - ? WHERE feed_type_id = ?',
      [payload.quantity_kg, payload.feed_type_id]
    );

    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
