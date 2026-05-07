import { getDatabasePool } from '../../../config/database.js';

function mapLatestWaterLevel(row) {
  if (!row.water_level_measurement_id) {
    return null;
  }

  return {
    id: Number(row.water_level_measurement_id),
    measurement_date: row.water_level_measurement_date ?? null,
    area_ha: row.water_level_area_ha === null || row.water_level_area_ha === undefined ? null : Number(row.water_level_area_ha),
    water_level_full_cm: row.water_level_full_cm === null || row.water_level_full_cm === undefined ? null : Number(row.water_level_full_cm),
    water_level_current_cm: row.water_level_current_cm === null || row.water_level_current_cm === undefined ? null : Number(row.water_level_current_cm),
    water_level_missing_cm: row.water_level_missing_cm === null || row.water_level_missing_cm === undefined ? null : Number(row.water_level_missing_cm),
    note: row.water_level_note ?? null,
    created_at: row.water_level_created_at ?? null,
    updated_at: row.water_level_updated_at ?? null
  };
}

function mapRow(row) {
  const {
    water_level_measurement_id,
    water_level_measurement_date,
    water_level_area_ha,
    water_level_full_cm,
    water_level_current_cm,
    water_level_missing_cm,
    water_level_note,
    water_level_created_at,
    water_level_updated_at,
    ...waterObject
  } = row;

  return {
    ...waterObject,
    is_active: Boolean(row.is_active),
    latest_water_level_measurement: mapLatestWaterLevel({
      water_level_measurement_id,
      water_level_measurement_date,
      water_level_area_ha,
      water_level_full_cm,
      water_level_current_cm,
      water_level_missing_cm,
      water_level_note,
      water_level_created_at,
      water_level_updated_at
    })
  };
}

const selectWaterObjectsWithLatestWaterLevelSql = `
  SELECT wo.*,
         wlm.id AS water_level_measurement_id,
         wlm.measurement_date AS water_level_measurement_date,
         wlm.area_ha AS water_level_area_ha,
         wlm.water_level_full_cm,
         wlm.water_level_current_cm,
         wlm.water_level_missing_cm,
         wlm.note AS water_level_note,
         wlm.created_at AS water_level_created_at,
         wlm.updated_at AS water_level_updated_at
  FROM water_objects wo
  LEFT JOIN water_level_measurements wlm
    ON wlm.id = (
      SELECT latest_wlm.id
      FROM water_level_measurements latest_wlm
      WHERE latest_wlm.water_object_id = wo.id
      ORDER BY latest_wlm.measurement_date IS NULL ASC,
               latest_wlm.measurement_date DESC,
               latest_wlm.id DESC
      LIMIT 1
    )`;

export async function listWaterObjects() {
  const db = getDatabasePool();
  const [rows] = await db.query(`${selectWaterObjectsWithLatestWaterLevelSql} ORDER BY wo.code ASC`);
  return rows.map(mapRow);
}

export async function findWaterObjectById(id) {
  const db = getDatabasePool();
  const [rows] = await db.query(`${selectWaterObjectsWithLatestWaterLevelSql} WHERE wo.id = ? LIMIT 1`, [id]);
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
