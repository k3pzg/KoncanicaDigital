import { getDatabasePool } from '../config/database.js';

const LEGACY_DB = process.env.LEGACY_DB_NAME ?? 'energovi_koncanicasmart';
const LEGACY_PONDS_TABLE = process.env.LEGACY_PONDS_TABLE ?? 'ponds';
const LEGACY_FISH_EVENTS_TABLE = process.env.LEGACY_FISH_EVENTS_TABLE ?? 'fish_events';

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const phaseArg = [...args].find((arg) => arg.startsWith('--phase='));
const phase = phaseArg ? phaseArg.split('=')[1] : 'all';

const OBJECT_TYPE_MAP = {
  ribnjak: 'ribnjak',
  bazen: 'bazen',
  kanal: 'kanal',
  zimovnik: 'zimovnik',
  rastiliste: 'rastiliste',
  maticnjak: 'maticnjak'
};

const SPECIES_MAP = {
  saran: 'saran_goli',
  amur: 'amur',
  tolstolobik_sivi: 'tolstolobik_sivi',
  tolstolobik_bijeli: 'tolstolobik_bijeli',
  som: 'som',
  smud: 'smud',
  stuka: 'stuka'
};

const CATEGORY_MAP = {
  mjesecnjak: 'mjesecnjak',
  jednogodisnja_mladj: 'jednogodisnja_mladj',
  dvogodisnja_mladj: 'dvogodisnja_mladj',
  konzum: 'konzum',
  matica: 'matica',
  matice: 'matica'
};

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeCodeLookup(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapObjectType(value) {
  const key = normalizeText(value);
  return OBJECT_TYPE_MAP[key] ?? null;
}

function parsePolygonValue(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      JSON.parse(text);
      return text;
    } catch {
      return null;
    }
  }

  const upper = text.toUpperCase();
  if (upper.startsWith('POLYGON')) {
    const polygon = parseWktPolygon(text);
    return polygon ? JSON.stringify(polygon) : null;
  }

  if (upper.startsWith('MULTIPOLYGON')) {
    const multipolygon = parseWktMultipolygon(text);
    return multipolygon ? JSON.stringify(multipolygon) : null;
  }

  return null;
}

function parseWktPolygon(wkt) {
  const match = wkt.match(/^POLYGON\s*\(\((.*)\)\)$/i);
  if (!match) {
    return null;
  }

  const ring = match[1]
    .split(',')
    .map((point) => point.trim().split(/\s+/).map(Number))
    .filter((coords) => coords.length >= 2 && coords.every((n) => Number.isFinite(n)))
    .map(([x, y]) => [x, y]);

  if (ring.length < 3) {
    return null;
  }

  return { type: 'Polygon', coordinates: [ring] };
}

function parseWktMultipolygon(wkt) {
  const match = wkt.match(/^MULTIPOLYGON\s*\(\(\((.*)\)\)\)$/i);
  if (!match) {
    return null;
  }

  const polygonsRaw = match[1].split(/\)\s*\)\s*,\s*\(\s*\(/);
  const polygons = polygonsRaw
    .map((polyText) => polyText
      .split(',')
      .map((point) => point.trim().split(/\s+/).map(Number))
      .filter((coords) => coords.length >= 2 && coords.every((n) => Number.isFinite(n)))
      .map(([x, y]) => [x, y]))
    .filter((ring) => ring.length >= 3)
    .map((ring) => [ring]);

  if (!polygons.length) {
    return null;
  }

  return { type: 'MultiPolygon', coordinates: polygons };
}

function isLikelyTestRow(row) {
  const text = `${row.species ?? ''} ${row.category ?? ''} ${row.notes ?? ''}`.toLowerCase();
  return text.includes('test');
}

function mapSpeciesCode(speciesText) {
  const normalized = normalizeText(speciesText);
  if (normalized.includes('linjak')) {
    return null;
  }
  if (normalized.includes('tolstolobik') && normalized.includes('sivi')) {
    return 'tolstolobik_sivi';
  }
  if (normalized.includes('tolstolobik') && normalized.includes('bijeli')) {
    return 'tolstolobik_bijeli';
  }
  if (normalized.includes('saran')) {
    return 'saran_goli';
  }
  if (normalized.includes('amur')) {
    return 'amur';
  }
  if (normalized.includes('som')) {
    return 'som';
  }
  if (normalized.includes('smud')) {
    return 'smud';
  }
  if (normalized.includes('stuka')) {
    return 'stuka';
  }

  return SPECIES_MAP[normalized] ?? null;
}

function mapCategoryCode(categoryText) {
  const normalized = normalizeText(categoryText);
  if (!normalized) {
    return null;
  }

  if (normalized.includes('jednogodis')) {
    return 'jednogodisnja_mladj';
  }
  if (normalized.includes('dvogodis')) {
    return 'dvogodisnja_mladj';
  }
  if (normalized.includes('mjesecnjak')) {
    return 'mjesecnjak';
  }
  if (normalized.includes('konzum')) {
    return 'konzum';
  }
  if (normalized.includes('matic')) {
    return 'matica';
  }

  return CATEGORY_MAP[normalized] ?? null;
}

function extractSourceFromNotes(notes, objectsByCodeLookup) {
  const text = String(notes ?? '').trim();
  if (!text) {
    return {
      source_kind: 'ostalo',
      source_water_object_id: null,
      source_label: null
    };
  }

  if (normalizeText(text).includes('mrijestiliste')) {
    return {
      source_kind: 'mrijestiliste',
      source_water_object_id: null,
      source_label: text
    };
  }

  const directMatch = text.match(/iz\s*:\s*([A-Za-z0-9\-_/ ]+)/i);
  const token = directMatch?.[1]?.trim() ?? text;
  const lookupToken = normalizeCodeLookup(token);

  for (const [codeLookup, objectId] of objectsByCodeLookup.entries()) {
    if (lookupToken.includes(codeLookup)) {
      return {
        source_kind: 'interni_objekt',
        source_water_object_id: objectId,
        source_label: null
      };
    }
  }

  return {
    source_kind: 'ostalo',
    source_water_object_id: null,
    source_label: text
  };
}

async function importWaterObjects(connection, summary) {
  const [rows] = await connection.query(
    `SELECT id, pond_name, pond_type, max_area_m2, max_depth, max_volume_m3, centroid_wkt, polygon_wkt, is_active, napomena
     FROM ${LEGACY_DB}.${LEGACY_PONDS_TABLE}`
  );

  for (const row of rows) {
    const code = String(row.pond_name ?? '').trim();
    const objectType = mapObjectType(row.pond_type);

    if (!code || !objectType) {
      summary.water.skipped += 1;
      continue;
    }

    const payload = {
      code,
      object_type: objectType,
      area_total_m2: toNumberOrNull(row.max_area_m2),
      area_productive_m2: null,
      max_depth_m: toNumberOrNull(row.max_depth),
      max_volume_m3: toNumberOrNull(row.max_volume_m3),
      centroid_wkt: row.centroid_wkt ? String(row.centroid_wkt).trim() : null,
      polygon_geojson: parsePolygonValue(row.polygon_wkt),
      is_active: row.is_active ? 1 : 0,
      notes: row.napomena ? String(row.napomena).trim() : null
    };

    if (shouldApply) {
      await connection.query(
        `INSERT INTO water_objects (
          code, object_type, area_total_m2, area_productive_m2, max_depth_m,
          max_volume_m3, centroid_wkt, polygon_geojson, is_active, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          object_type = VALUES(object_type),
          area_total_m2 = VALUES(area_total_m2),
          max_depth_m = VALUES(max_depth_m),
          max_volume_m3 = VALUES(max_volume_m3),
          centroid_wkt = VALUES(centroid_wkt),
          polygon_geojson = VALUES(polygon_geojson),
          is_active = VALUES(is_active),
          notes = VALUES(notes),
          updated_at = CURRENT_TIMESTAMP`,
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
    }

    summary.water.imported += 1;
  }
}

async function buildFishImportContext(connection) {
  const [pondRows] = await connection.query(`SELECT id, pond_name FROM ${LEGACY_DB}.${LEGACY_PONDS_TABLE}`);
  const [objectRows] = await connection.query('SELECT id, code FROM water_objects');
  const [speciesRows] = await connection.query('SELECT id, code FROM fish_species');
  const [categoryRows] = await connection.query('SELECT id, code FROM fish_categories');

  const legacyPondToCode = new Map(pondRows.map((row) => [row.id, String(row.pond_name ?? '').trim()]));
  const objectIdByCode = new Map(objectRows.map((row) => [String(row.code ?? '').trim(), row.id]));
  const objectByNormalizedCode = new Map(objectRows.map((row) => [normalizeCodeLookup(row.code), row.id]));

  return {
    legacyPondToCode,
    objectIdByCode,
    objectByNormalizedCode,
    speciesIdByCode: new Map(speciesRows.map((row) => [row.code, row.id])),
    categoryIdByCode: new Map(categoryRows.map((row) => [row.code, row.id]))
  };
}

async function hasMatchingFishEntryEvent(connection, payload) {
  const [rows] = await connection.query(
    `SELECT id
     FROM fish_entry_events
     WHERE water_object_id = ?
       AND event_date = ?
       AND event_type = 'nasad'
       AND species_id = ?
       AND category_id = ?
       AND count_total = ?
       AND weight_total_kg = ?
       AND IFNULL(notes, '') = IFNULL(?, '')
     LIMIT 1`,
    [
      payload.water_object_id,
      payload.event_date,
      payload.species_id,
      payload.category_id,
      payload.count_total,
      payload.weight_total_kg,
      payload.notes
    ]
  );

  return Boolean(rows[0]);
}

async function upsertStockFromEntry(connection, payload) {
  const [rows] = await connection.query(
    'SELECT * FROM fish_stock_current WHERE water_object_id = ? AND species_id = ? LIMIT 1',
    [payload.water_object_id, payload.species_id]
  );

  if (!rows[0]) {
    const weightAvg = payload.count_total > 0 ? payload.weight_total_kg / payload.count_total : 0;

    await connection.query(
      `INSERT INTO fish_stock_current (
        water_object_id, species_id, count_total, weight_avg_kg, weight_total_kg,
        last_refresh_type, last_refresh_date, notes
      ) VALUES (?, ?, ?, ?, ?, 'entry', ?, ?)`,
      [
        payload.water_object_id,
        payload.species_id,
        payload.count_total,
        weightAvg,
        payload.weight_total_kg,
        payload.event_date,
        payload.notes
      ]
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

async function importFishEntryEvents(connection, summary) {
  const context = await buildFishImportContext(connection);

  const [rows] = await connection.query(
    `SELECT id, pond_id, event_type, species, category, count_in, weight_avg_kg, weight_total_kg, event_date, notes
     FROM ${LEGACY_DB}.${LEGACY_FISH_EVENTS_TABLE}`
  );

  for (const row of rows) {
    if (normalizeText(row.event_type) !== 'nasad') {
      summary.fish.skipped += 1;
      continue;
    }

    if (isLikelyTestRow(row)) {
      summary.fish.skipped += 1;
      continue;
    }

    const pondCode = context.legacyPondToCode.get(row.pond_id);
    const waterObjectId = context.objectIdByCode.get(pondCode);
    const speciesCode = mapSpeciesCode(row.species);
    const categoryCode = mapCategoryCode(row.category);

    if (!waterObjectId || !speciesCode || !categoryCode) {
      summary.fish.skipped += 1;
      if (!speciesCode) {
        summary.fish.unmappedSpecies.add(String(row.species ?? 'NULL'));
      }
      if (!categoryCode) {
        summary.fish.unmappedCategories.add(String(row.category ?? 'NULL'));
      }
      continue;
    }

    const speciesId = context.speciesIdByCode.get(speciesCode);
    const categoryId = context.categoryIdByCode.get(categoryCode);
    if (!speciesId || !categoryId) {
      summary.fish.skipped += 1;
      if (!speciesId) {
        summary.fish.unmappedSpecies.add(`${row.species} -> ${speciesCode} (missing target)`);
      }
      if (!categoryId) {
        summary.fish.unmappedCategories.add(`${row.category} -> ${categoryCode} (missing target)`);
      }
      continue;
    }

    const countTotal = toNumberOrNull(row.count_in);
    const weightTotal = toNumberOrNull(row.weight_total_kg);
    const weightAvgRaw = toNumberOrNull(row.weight_avg_kg);
    const notes = row.notes ? String(row.notes).trim() : null;

    if (!countTotal || countTotal <= 0 || !weightTotal || weightTotal <= 0 || !row.event_date) {
      summary.fish.skipped += 1;
      continue;
    }

    const source = extractSourceFromNotes(notes, context.objectByNormalizedCode);

    const payload = {
      water_object_id: waterObjectId,
      event_date: row.event_date,
      event_type: 'nasad',
      species_id: speciesId,
      category_id: categoryId,
      count_total: countTotal,
      weight_avg_kg: weightAvgRaw && weightAvgRaw > 0 ? weightAvgRaw : weightTotal / countTotal,
      weight_total_kg: weightTotal,
      source_kind: source.source_kind,
      source_water_object_id: source.source_water_object_id,
      source_label: source.source_label,
      notes
    };

    const exists = await hasMatchingFishEntryEvent(connection, payload);
    if (exists) {
      summary.fish.skipped += 1;
      continue;
    }

    if (shouldApply) {
      await connection.query(
        `INSERT INTO fish_entry_events (
          water_object_id, event_date, event_type, species_id, category_id, count_total,
          weight_avg_kg, weight_total_kg, source_kind, source_water_object_id, source_label, notes
        ) VALUES (?, ?, 'nasad', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.water_object_id,
          payload.event_date,
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
    }

    summary.fish.imported += 1;
  }
}

function createSummary() {
  return {
    mode: shouldApply ? 'APPLY' : 'DRY_RUN',
    phase,
    water: {
      imported: 0,
      skipped: 0
    },
    fish: {
      imported: 0,
      skipped: 0,
      unmappedSpecies: new Set(),
      unmappedCategories: new Set()
    }
  };
}

function printSummary(summary) {
  console.log('--- LEGACY IMPORT SUMMARY ---');
  console.log(`Mode: ${summary.mode}`);
  console.log(`Phase: ${summary.phase}`);
  console.log(`Water objects imported: ${summary.water.imported}`);
  console.log(`Water objects skipped: ${summary.water.skipped}`);
  console.log(`Fish entry events imported: ${summary.fish.imported}`);
  console.log(`Fish rows skipped: ${summary.fish.skipped}`);
  console.log('Unmapped species:', [...summary.fish.unmappedSpecies]);
  console.log('Unmapped categories:', [...summary.fish.unmappedCategories]);
}

async function run() {
  const db = getDatabasePool();
  const connection = await db.getConnection();
  const summary = createSummary();

  try {
    if (shouldApply) {
      await connection.beginTransaction();
    }

    if (phase === 'all' || phase === 'water') {
      await importWaterObjects(connection, summary);
    }

    if (phase === 'all' || phase === 'fish') {
      await importFishEntryEvents(connection, summary);
    }

    if (shouldApply) {
      await connection.commit();
    }

    printSummary(summary);
  } catch (error) {
    if (shouldApply) {
      await connection.rollback();
    }
    console.error('Legacy import failed:', error);
    process.exit(1);
  } finally {
    connection.release();
  }
}

run();
