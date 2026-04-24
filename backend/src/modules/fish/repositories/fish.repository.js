import { getDatabasePool } from '../../../config/database.js';
import { resolveSpeciesName } from '../constants/species-display.constants.js';

export async function listFishSpecies() {
  const db = getDatabasePool();
  const [rows] = await db.query('SELECT * FROM fish_species WHERE is_active = 1 ORDER BY label ASC');
  return rows;
}

export async function listFishCategories() {
  const db = getDatabasePool();
  const [rows] = await db.query('SELECT * FROM fish_categories WHERE is_active = 1 ORDER BY sort_order ASC, label ASC');
  return rows;
}

function mapEntryRow(row) {
  return {
    ...row,
    source_water_object_id: row.source_water_object_id ?? null
  };
}

export async function listFishEntryEvents() {
  const db = getDatabasePool();
  const [rows] = await db.query(
    `SELECT fee.*, wo.code AS water_object_code, fs.code AS species_code, fs.label AS species_label,
            fc.code AS category_code, fc.label AS category_label,
            swo.code AS source_water_object_code
     FROM fish_entry_events fee
     INNER JOIN water_objects wo ON wo.id = fee.water_object_id
     INNER JOIN fish_species fs ON fs.id = fee.species_id
     INNER JOIN fish_categories fc ON fc.id = fee.category_id
     LEFT JOIN water_objects swo ON swo.id = fee.source_water_object_id
     ORDER BY fee.event_date DESC, fee.id DESC`
  );

  return rows.map(mapEntryRow);
}

export async function findFishEntryEventById(id) {
  const db = getDatabasePool();
  const [rows] = await db.query(
    `SELECT fee.*, wo.code AS water_object_code, fs.code AS species_code, fs.label AS species_label,
            fc.code AS category_code, fc.label AS category_label,
            swo.code AS source_water_object_code
     FROM fish_entry_events fee
     INNER JOIN water_objects wo ON wo.id = fee.water_object_id
     INNER JOIN fish_species fs ON fs.id = fee.species_id
     INNER JOIN fish_categories fc ON fc.id = fee.category_id
     LEFT JOIN water_objects swo ON swo.id = fee.source_water_object_id
     WHERE fee.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] ? mapEntryRow(rows[0]) : null;
}

export async function createFishEntryEvent(payload) {
  const db = getDatabasePool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO fish_entry_events (
        water_object_id, event_date, event_type, species_id, category_id, count_total,
        weight_avg_kg, weight_total_kg, source_kind, source_water_object_id, source_label, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.water_object_id,
        payload.event_date,
        payload.event_type,
        payload.species_id,
        payload.category_id,
        payload.count_total,
        payload.weight_avg_kg,
        payload.weight_total_kg,
        payload.source_kind,
        payload.source_water_object_id,
        payload.source_label,
        payload.notes
      ]
    );

    await upsertStockFromEntry(connection, payload);

    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function upsertStockFromEntry(connection, payload) {
  const [rows] = await connection.query(
    'SELECT * FROM fish_stock_current WHERE water_object_id = ? AND species_id = ? LIMIT 1',
    [payload.water_object_id, payload.species_id]
  );

  if (!rows[0]) {
    const countTotal = payload.count_total;
    const weightTotal = payload.weight_total_kg;
    const weightAvg = countTotal > 0 ? weightTotal / countTotal : 0;

    await connection.query(
      `INSERT INTO fish_stock_current (
        water_object_id, species_id, count_total, weight_avg_kg, weight_total_kg,
        last_refresh_type, last_refresh_date, notes
      ) VALUES (?, ?, ?, ?, ?, 'entry', ?, ?)`,
      [payload.water_object_id, payload.species_id, countTotal, weightAvg, weightTotal, payload.event_date, payload.notes]
    );
    return;
  }

  const existing = rows[0];
  const countTotal = Number(existing.count_total) + payload.count_total;
  const weightTotal = Number(existing.weight_total_kg) + payload.weight_total_kg;
  const weightAvg = countTotal > 0 ? weightTotal / countTotal : 0;

  await connection.query(
    `UPDATE fish_stock_current
     SET count_total = ?,
         weight_total_kg = ?,
         weight_avg_kg = ?,
         last_refresh_type = 'entry',
         last_refresh_date = ?,
         notes = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [countTotal, weightTotal, weightAvg, payload.event_date, payload.notes, existing.id]
  );
}

export async function listFishControlEvents() {
  const db = getDatabasePool();
  const [rows] = await db.query(
    `SELECT fce.*, wo.code AS water_object_code
     FROM fish_control_events fce
     INNER JOIN water_objects wo ON wo.id = fce.water_object_id
     ORDER BY fce.control_date DESC, fce.id DESC`
  );

  return rows;
}

export async function findFishControlEventById(id) {
  const db = getDatabasePool();
  const [eventRows] = await db.query(
    `SELECT fce.*, wo.code AS water_object_code
     FROM fish_control_events fce
     INNER JOIN water_objects wo ON wo.id = fce.water_object_id
     WHERE fce.id = ?
     LIMIT 1`,
    [id]
  );

  if (!eventRows[0]) {
    return null;
  }

  const event = eventRows[0];
  const [lineRows] = await db.query(
    `SELECT fcl.*, fs.code AS species_code, fs.label AS species_label
     FROM fish_control_lines fcl
     INNER JOIN fish_species fs ON fs.id = fcl.species_id
     WHERE fcl.fish_control_event_id = ?
     ORDER BY fcl.id ASC`,
    [id]
  );

  return {
    ...event,
    lines: lineRows
  };
}

export async function createFishControlEvent(payload) {
  const db = getDatabasePool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [headerResult] = await connection.query(
      `INSERT INTO fish_control_events (
        water_object_id, control_date, sample_area_m2, estimated_total_area_m2, notes
      ) VALUES (?, ?, ?, ?, ?)`,
      [payload.water_object_id, payload.control_date, payload.sample_area_m2, payload.estimated_total_area_m2, payload.notes]
    );

    for (const line of payload.lines) {
      await connection.query(
        `INSERT INTO fish_control_lines (
          fish_control_event_id, species_id, sample_count, sample_weight_total_kg,
          sample_weight_avg_kg, estimated_count_total, estimated_weight_total_kg, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          headerResult.insertId,
          line.species_id,
          line.sample_count,
          line.sample_weight_total_kg,
          line.sample_weight_avg_kg,
          line.estimated_count_total,
          line.estimated_weight_total_kg,
          line.notes
        ]
      );

      const weightAvg = line.estimated_count_total > 0
        ? line.estimated_weight_total_kg / line.estimated_count_total
        : 0;

      await connection.query(
        `INSERT INTO fish_stock_current (
          water_object_id, species_id, count_total, weight_avg_kg, weight_total_kg,
          last_refresh_type, last_refresh_date, notes
        ) VALUES (?, ?, ?, ?, ?, 'control', ?, ?)
        ON DUPLICATE KEY UPDATE
          count_total = VALUES(count_total),
          weight_avg_kg = VALUES(weight_avg_kg),
          weight_total_kg = VALUES(weight_total_kg),
          last_refresh_type = 'control',
          last_refresh_date = VALUES(last_refresh_date),
          notes = VALUES(notes),
          updated_at = CURRENT_TIMESTAMP`,
        [
          payload.water_object_id,
          line.species_id,
          line.estimated_count_total,
          weightAvg,
          line.estimated_weight_total_kg,
          payload.control_date,
          line.notes
        ]
      );
    }

    await connection.commit();
    return headerResult.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listFishStockCurrent(waterObjectId) {
  const db = getDatabasePool();
  const params = [];
  let whereSql = '';

  if (waterObjectId) {
    whereSql = 'WHERE fsc.water_object_id = ?';
    params.push(waterObjectId);
  }

  const [rows] = await db.query(
    `SELECT fsc.*, wo.code AS water_object_code, fs.code AS species_code, fs.label AS species_label
     FROM fish_stock_current fsc
     INNER JOIN water_objects wo ON wo.id = fsc.water_object_id
     INNER JOIN fish_species fs ON fs.id = fsc.species_id
     ${whereSql}
     ORDER BY wo.code ASC, fs.label ASC`,
    params
  );

  return rows;
}

export async function listFishStockAggregate() {
  const db = getDatabasePool();
  const [rows] = await db.query(
    `SELECT
       wo.code AS water_object_code,
       fs.code AS species_code,
       fs.label AS species_label,
       SUM(fsc.count_total) AS count_total,
       SUM(fsc.weight_total_kg) AS weight_total_kg,
       CASE
         WHEN SUM(fsc.count_total) > 0 THEN SUM(fsc.weight_total_kg) / SUM(fsc.count_total)
         ELSE 0
       END AS weight_avg_kg
     FROM fish_stock_current fsc
     INNER JOIN water_objects wo ON wo.id = fsc.water_object_id
     INNER JOIN fish_species fs ON fs.id = fsc.species_id
     GROUP BY wo.code, fs.code, fs.label
     ORDER BY wo.code ASC, fs.code ASC`
  );

  return rows.map((row) => ({
    water_object_code: row.water_object_code,
    category_name: row.category_name,
    species_code: row.species_code,
    species_name: resolveSpeciesName(row.species_code, row.species_label),
    count_total: Number(row.count_total),
    weight_total_kg: Number(row.weight_total_kg),
    weight_avg_kg: Number(row.weight_avg_kg)
  }));
}
