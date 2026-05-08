import { getDatabasePool } from '../../../config/database.js';

function mapRow(row) {
  return {
    id: Number(row.id),
    water_object_id: Number(row.water_object_id),
    measurement_date: row.measurement_date ?? null,
    area_ha: row.area_ha === null || row.area_ha === undefined ? null : Number(row.area_ha),
    water_level_full_cm: row.water_level_full_cm === null || row.water_level_full_cm === undefined ? null : Number(row.water_level_full_cm),
    water_level_current_cm: row.water_level_current_cm === null || row.water_level_current_cm === undefined ? null : Number(row.water_level_current_cm),
    water_level_missing_cm: row.water_level_missing_cm === null || row.water_level_missing_cm === undefined ? null : Number(row.water_level_missing_cm),
    note: row.note ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null
  };
}

export async function listWaterLevelMeasurements(waterObjectId) {
  const db = getDatabasePool();

  if (waterObjectId) {
    const [rows] = await db.query(
      `SELECT * FROM water_level_measurements
       WHERE water_object_id = ?
       ORDER BY measurement_date IS NULL ASC, measurement_date DESC, id DESC
       LIMIT 100`,
      [waterObjectId]
    );
    return rows.map(mapRow);
  }

  const [rows] = await db.query(
    `SELECT * FROM water_level_measurements
     ORDER BY measurement_date IS NULL ASC, measurement_date DESC, id DESC
     LIMIT 500`
  );
  return rows.map(mapRow);
}

export async function findWaterLevelMeasurementById(id) {
  const db = getDatabasePool();
  const [rows] = await db.query('SELECT * FROM water_level_measurements WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createWaterLevelMeasurement(payload) {
  const db = getDatabasePool();
  const [result] = await db.query(
    `INSERT INTO water_level_measurements
       (water_object_id, measurement_date, area_ha, water_level_full_cm, water_level_current_cm, water_level_missing_cm, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.water_object_id,
      payload.measurement_date ?? null,
      payload.area_ha ?? null,
      payload.water_level_full_cm ?? null,
      payload.water_level_current_cm ?? null,
      payload.water_level_missing_cm ?? null,
      payload.note ?? null
    ]
  );
  return findWaterLevelMeasurementById(result.insertId);
}

export async function updateWaterLevelMeasurement(id, payload) {
  const db = getDatabasePool();
  await db.query(
    `UPDATE water_level_measurements
     SET measurement_date = ?,
         area_ha = ?,
         water_level_full_cm = ?,
         water_level_current_cm = ?,
         water_level_missing_cm = ?,
         note = ?
     WHERE id = ?`,
    [
      payload.measurement_date ?? null,
      payload.area_ha ?? null,
      payload.water_level_full_cm ?? null,
      payload.water_level_current_cm ?? null,
      payload.water_level_missing_cm ?? null,
      payload.note ?? null,
      id
    ]
  );
  return findWaterLevelMeasurementById(id);
}

export async function deleteWaterLevelMeasurement(id) {
  const db = getDatabasePool();
  const [result] = await db.query('DELETE FROM water_level_measurements WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
