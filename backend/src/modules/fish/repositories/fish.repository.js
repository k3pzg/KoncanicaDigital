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

async function findExistingSpeciesByLabel(connection, label) {
  const [rows] = await connection.query(
    'SELECT id FROM fish_species WHERE LOWER(TRIM(label)) = LOWER(TRIM(?)) LIMIT 1',
    [label]
  );

  return rows[0]?.id ?? null;
}

async function findExistingCategoryByLabel(connection, label) {
  const [rows] = await connection.query(
    'SELECT id FROM fish_categories WHERE LOWER(TRIM(label)) = LOWER(TRIM(?)) LIMIT 1',
    [label]
  );

  return rows[0]?.id ?? null;
}

function slugifyForCode(value) {
  const normalized = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized.slice(0, 48) || 'custom';
}

async function buildUniqueGeneratedCode(connection, tableName, prefix, label) {
  const base = `${prefix}_${slugifyForCode(label)}`;
  let candidate = base;
  let suffix = 2;

  while (true) {
    const [rows] = await connection.query(`SELECT id FROM ${tableName} WHERE code = ? LIMIT 1`, [candidate]);
    if (!rows[0]) {
      return candidate;
    }

    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
}

async function resolveSpeciesId(connection, payload) {
  if (Number.isInteger(payload.species_id) && payload.species_id > 0) {
    return payload.species_id;
  }

  if (!payload.new_species_label) {
    throw new Error('species_id or new_species_label is required');
  }

  const existingId = await findExistingSpeciesByLabel(connection, payload.new_species_label);
  if (existingId) {
    return existingId;
  }

  const code = await buildUniqueGeneratedCode(connection, 'fish_species', 'custom_species', payload.new_species_label);
  const [result] = await connection.query(
    'INSERT INTO fish_species (code, label, is_active) VALUES (?, ?, 1)',
    [code, payload.new_species_label]
  );

  return result.insertId;
}

async function resolveCategoryId(connection, payload) {
  if (Number.isInteger(payload.category_id) && payload.category_id > 0) {
    return payload.category_id;
  }

  if (!payload.new_category_label) {
    throw new Error('category_id or new_category_label is required');
  }

  const existingId = await findExistingCategoryByLabel(connection, payload.new_category_label);
  if (existingId) {
    return existingId;
  }

  const code = await buildUniqueGeneratedCode(connection, 'fish_categories', 'custom_category', payload.new_category_label);
  const [result] = await connection.query(
    'INSERT INTO fish_categories (code, label, sort_order, is_active) VALUES (?, ?, 999, 1)',
    [code, payload.new_category_label]
  );

  return result.insertId;
}

async function insertFishEntryEvent(connection, payload) {
  const speciesId = await resolveSpeciesId(connection, payload);
  const categoryId = await resolveCategoryId(connection, payload);

  const [result] = await connection.query(
    `INSERT INTO fish_entry_events (
      water_object_id, event_date, event_type, species_id, category_id, count_total,
      weight_avg_kg, weight_total_kg, source_kind, source_water_object_id, source_label, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.water_object_id,
      payload.event_date,
      payload.event_type,
      speciesId,
      categoryId,
      payload.count_total,
      payload.weight_avg_kg,
      payload.weight_total_kg,
      payload.source_kind,
      payload.source_water_object_id,
      payload.source_label,
      payload.notes
    ]
  );

  return {
    insertId: result.insertId,
    speciesId,
    categoryId
  };
}

export async function createFishEntryEvents(payloads) {
  const db = getDatabasePool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const insertedIds = [];

    for (const payload of payloads) {
      const { insertId, speciesId, categoryId } = await insertFishEntryEvent(connection, payload);

      await upsertStockFromEntry(connection, {
        ...payload,
        species_id: speciesId,
        category_id: categoryId
      });

      insertedIds.push(insertId);
    }

    await connection.commit();
    return insertedIds;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createFishEntryEvent(payload) {
  const [insertId] = await createFishEntryEvents([payload]);
  return insertId;
}

async function upsertStockFromEntry(connection, payload) {
  const existing = await findCurrentStockRow(connection, payload);
  const countTotal = Number(existing?.count_total ?? 0) + payload.count_total;
  const weightTotal = Number(existing?.weight_total_kg ?? 0) + payload.weight_total_kg;
  const weightAvg = countTotal > 0 ? weightTotal / countTotal : 0;

  await upsertCurrentStockRow(connection, {
    ...payload,
    count_total: countTotal,
    weight_total_kg: weightTotal,
    weight_avg_kg: weightAvg,
    last_refresh_type: 'entry',
    last_refresh_date: payload.event_date
  });
}

function mapExitRow(row) {
  return {
    ...row,
    destination_water_object_id: row.destination_water_object_id ?? null
  };
}

export async function listFishExitEvents() {
  const db = getDatabasePool();
  const [rows] = await db.query(
    `SELECT fxe.*, wo.code AS water_object_code, fs.code AS species_code, fs.label AS species_label,
            fc.code AS category_code, fc.label AS category_label,
            dwo.code AS destination_water_object_code
     FROM fish_exit_events fxe
     INNER JOIN water_objects wo ON wo.id = fxe.water_object_id
     INNER JOIN fish_species fs ON fs.id = fxe.species_id
     INNER JOIN fish_categories fc ON fc.id = fxe.category_id
     LEFT JOIN water_objects dwo ON dwo.id = fxe.destination_water_object_id
     ORDER BY fxe.event_date DESC, fxe.id DESC`
  );

  return rows.map(mapExitRow);
}

export async function findFishExitEventById(id) {
  const db = getDatabasePool();
  const [rows] = await db.query(
    `SELECT fxe.*, wo.code AS water_object_code, fs.code AS species_code, fs.label AS species_label,
            fc.code AS category_code, fc.label AS category_label,
            dwo.code AS destination_water_object_code
     FROM fish_exit_events fxe
     INNER JOIN water_objects wo ON wo.id = fxe.water_object_id
     INNER JOIN fish_species fs ON fs.id = fxe.species_id
     INNER JOIN fish_categories fc ON fc.id = fxe.category_id
     LEFT JOIN water_objects dwo ON dwo.id = fxe.destination_water_object_id
     WHERE fxe.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] ? mapExitRow(rows[0]) : null;
}

export async function createFishExitEvent(payload) {
  const db = getDatabasePool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const speciesId = await resolveSpeciesId(connection, payload);
    const categoryId = await resolveCategoryId(connection, payload);

    const [result] = await connection.query(
      `INSERT INTO fish_exit_events (
        water_object_id, event_date, event_type, species_id, category_id, count_total,
        weight_avg_kg, weight_total_kg, destination_kind, destination_water_object_id, destination_label, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.water_object_id,
        payload.event_date,
        payload.event_type,
        speciesId,
        categoryId,
        payload.count_total,
        payload.weight_avg_kg,
        payload.weight_total_kg,
        payload.destination_kind,
        payload.destination_water_object_id,
        payload.destination_label,
        payload.notes
      ]
    );

    await upsertStockFromExit(connection, {
      ...payload,
      species_id: speciesId,
      category_id: categoryId
    });

    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function upsertStockFromExit(connection, payload) {
  const existing = await findCurrentStockRow(connection, payload);
  const countTotal = Number(existing?.count_total ?? 0) - payload.count_total;
  const weightTotal = Number(existing?.weight_total_kg ?? 0) - payload.weight_total_kg;

  if (countTotal < 0 || weightTotal < 0) {
    throw new Error('izlov cannot reduce stock below zero');
  }

  const weightAvg = countTotal > 0 ? weightTotal / countTotal : 0;
  await upsertCurrentStockRow(connection, {
    ...payload,
    count_total: countTotal,
    weight_total_kg: weightTotal,
    weight_avg_kg: weightAvg,
    last_refresh_type: 'izlov',
    last_refresh_date: payload.event_date
  });
}

async function findCurrentStockRow(connection, payload) {
  const [rows] = await connection.query(
    'SELECT * FROM fish_stock_current WHERE water_object_id = ? AND species_id = ? AND category_id = ? LIMIT 1',
    [payload.water_object_id, payload.species_id, payload.category_id]
  );
  return rows[0] ?? null;
}

async function upsertCurrentStockRow(connection, payload) {
  await connection.query(
    `INSERT INTO fish_stock_current (
      water_object_id, species_id, category_id, count_total, weight_avg_kg, weight_total_kg,
      last_refresh_type, last_refresh_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      count_total = VALUES(count_total),
      weight_avg_kg = VALUES(weight_avg_kg),
      weight_total_kg = VALUES(weight_total_kg),
      last_refresh_type = VALUES(last_refresh_type),
      last_refresh_date = VALUES(last_refresh_date),
      notes = VALUES(notes),
      updated_at = CURRENT_TIMESTAMP`,
    [
      payload.water_object_id,
      payload.species_id,
      payload.category_id,
      payload.count_total,
      payload.weight_avg_kg,
      payload.weight_total_kg,
      payload.last_refresh_type,
      payload.last_refresh_date,
      payload.notes
    ]
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
    `SELECT fcl.*, fs.code AS species_code, fs.label AS species_label,
            fc.code AS category_code, fc.label AS category_label
     FROM fish_control_lines fcl
     INNER JOIN fish_species fs ON fs.id = fcl.species_id
     INNER JOIN fish_categories fc ON fc.id = fcl.category_id
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
          fish_control_event_id, species_id, category_id, sample_count, sample_weight_total_kg,
          sample_weight_avg_kg, estimated_count_total, estimated_weight_total_kg, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          headerResult.insertId,
          line.species_id,
          line.category_id,
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

      await upsertCurrentStockRow(connection, {
        water_object_id: payload.water_object_id,
        species_id: line.species_id,
        category_id: line.category_id,
        count_total: line.estimated_count_total,
        weight_avg_kg: weightAvg,
        weight_total_kg: line.estimated_weight_total_kg,
        last_refresh_type: 'control',
        last_refresh_date: payload.control_date,
        notes: line.notes
      });
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
    `SELECT fsc.*, wo.code AS water_object_code, fs.code AS species_code, fs.label AS species_label,
            fc.code AS category_code, fc.label AS category_label
     FROM fish_stock_current fsc
     INNER JOIN water_objects wo ON wo.id = fsc.water_object_id
     INNER JOIN fish_species fs ON fs.id = fsc.species_id
     INNER JOIN fish_categories fc ON fc.id = fsc.category_id
     ${whereSql}
     ORDER BY wo.code ASC, fs.label ASC, fc.sort_order ASC, fc.label ASC`,
    params
  );

  return rows;
}

export async function listFishStockAggregate() {
  const db = getDatabasePool();
  const [rows] = await db.query(
    `SELECT
       wo.code AS water_object_code,
       fc.code AS category_code,
       fc.label AS category_label,
       fs.code AS species_code,
       fs.label AS species_label,
       fsc.count_total AS count_total,
       fsc.weight_total_kg AS weight_total_kg,
       CASE
         WHEN fsc.count_total > 0 THEN fsc.weight_total_kg / fsc.count_total
         ELSE 0
       END AS weight_avg_kg
     FROM fish_stock_current fsc
     INNER JOIN water_objects wo ON wo.id = fsc.water_object_id
     INNER JOIN fish_species fs ON fs.id = fsc.species_id
     INNER JOIN fish_categories fc ON fc.id = fsc.category_id
     ORDER BY wo.code ASC, fs.code ASC, fc.sort_order ASC, fc.code ASC`
  );

  return rows.map((row) => ({
    water_object_code: row.water_object_code,
    category_id: Number(row.category_id),
    category_code: row.category_code,
    category_label: row.category_label,
    species_code: row.species_code,
    species_name: resolveSpeciesName(row.species_code, row.species_label),
    count_total: Number(row.count_total),
    weight_total_kg: Number(row.weight_total_kg),
    weight_avg_kg: Number(row.weight_avg_kg)
  }));
}
