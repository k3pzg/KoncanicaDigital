import { getDatabasePool } from '../../../config/database.js';

function mapRow(row) {
  return {
    ...row,
    is_active: Boolean(row.is_active)
  };
}

export async function listWaterObjects() {
  const db = getDatabasePool();
  const [rows] = await db.query('SELECT * FROM water_objects ORDER BY created_at DESC');
  return rows.map(mapRow);
}

export async function findWaterObjectById(id) {
  const db = getDatabasePool();
  const [rows] = await db.query('SELECT * FROM water_objects WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createWaterObject(payload) {
  const db = getDatabasePool();
  const [result] = await db.query(
    `INSERT INTO water_objects (
      code, object_type, area_total_m2, area_productive_m2,
      max_depth_m, max_volume_m3, centroid_wkt, polygon_geojson,
      is_active, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.code,
      payload.object_type,
      payload.area_total_m2,
      payload.area_productive_m2,
      payload.max_depth_m,
      payload.max_volume_m3,
      payload.centroid_wkt,
      payload.polygon_geojson,
      payload.is_active,
      payload.notes
    ]
  );

  return findWaterObjectById(result.insertId);
}

export async function updateWaterObject(id, payload) {
  const db = getDatabasePool();
  await db.query(
    `UPDATE water_objects
     SET code = ?,
         object_type = ?,
         area_total_m2 = ?,
         area_productive_m2 = ?,
         max_depth_m = ?,
         max_volume_m3 = ?,
         centroid_wkt = ?,
         polygon_geojson = ?,
         is_active = ?,
         notes = ?
     WHERE id = ?`,
    [
      payload.code,
      payload.object_type,
      payload.area_total_m2,
      payload.area_productive_m2,
      payload.max_depth_m,
      payload.max_volume_m3,
      payload.centroid_wkt,
      payload.polygon_geojson,
      payload.is_active,
      payload.notes,
      id
    ]
  );

  return findWaterObjectById(id);
}

export async function deleteWaterObject(id) {
  const db = getDatabasePool();
  const [result] = await db.query('DELETE FROM water_objects WHERE id = ?', [id]);
  return result.affectedRows > 0;
}
