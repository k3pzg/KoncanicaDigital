import { getDatabasePool } from '../config/database.js';

const LEGACY_DB = process.env.LEGACY_DB_NAME ?? 'energovi_koncanicasmart';
const LEGACY_PONDS_TABLE = process.env.LEGACY_PONDS_TABLE ?? 'ponds';
const LEGACY_FISH_EVENTS_TABLE = process.env.LEGACY_FISH_EVENTS_TABLE ?? 'fish_events';
const FALLBACK_CATEGORY_CODE = 'unknown';

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
  linjak: 'linjak',
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

let legacyTableColumnsCache = new Map();

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeLegacyLabel(value) {
  return String(value ?? '')
    .replace(/\uFFFD/g, '?')
    .replace(/\?+/g, '?')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9? ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCodeLookup(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function getLegacyTableColumns(connection, tableName) {
  const cacheKey = `${LEGACY_DB}.${tableName}`;
  if (legacyTableColumnsCache.has(cacheKey)) {
    return legacyTableColumnsCache.get(cacheKey);
  }

  const [rows] = await connection.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?`,
    [LEGACY_DB, tableName]
  );

  const columns = new Set(rows.map((row) => String(row.COLUMN_NAME)));
  legacyTableColumnsCache.set(cacheKey, columns);
  return columns;
}

function pickLegacyColumn(columns, candidates, requiredLabel) {
  for (const candidate of candidates) {
    if (columns.has(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Legacy tablica nema očekivani stupac za: ${requiredLabel} (kandidati: ${candidates.join(', ')})`);
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapObjectType(value) {
  const normalized = normalizeLegacyLabel(value);
  const collapsed = normalized.replace(/\s+/g, '').replace(/\?/g, '');
  const key = normalizeText(normalized).replace(/_/g, '');

  if (collapsed.includes('ribnjak') || key.includes('ribnjak')) {
    return 'ribnjak';
  }
  if (collapsed.includes('bazen') || key.includes('bazen')) {
    return 'bazen';
  }
  if (collapsed.includes('kanal') || key.includes('kanal')) {
    return 'kanal';
  }
  if (collapsed.includes('zimovnik') || key.includes('zimovnik')) {
    return 'zimovnik';
  }
  if (collapsed.includes('rastiliste') || collapsed.includes('rastilite') || key.includes('rastiliste') || key.includes('rastilite')) {
    return 'rastiliste';
  }
  if (collapsed.includes('maticnjak') || collapsed.includes('matinjak') || key.includes('maticnjak') || key.includes('matinjak')) {
    return 'maticnjak';
  }

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
  const normalized = normalizeLegacyLabel(speciesText);
  const collapsed = normalized.replace(/\s+/g, '');

  if (!collapsed) {
    return { code: null, reason: 'species_empty' };
  }
  if (collapsed.includes('linjak')) {
    return { code: 'linjak', reason: null };
  }
  if (collapsed.includes('tolstolobik') && collapsed.includes('sivi')) {
    return { code: 'tolstolobik_sivi', reason: null };
  }
  if (collapsed.includes('tolstolobik') && collapsed.includes('bijeli')) {
    return { code: 'tolstolobik_bijeli', reason: null };
  }
  if (collapsed.includes('saran') || collapsed.includes('aran') || collapsed.includes('?aran')) {
    return { code: 'saran_goli', reason: null };
  }
  if (collapsed.includes('amur')) {
    return { code: 'amur', reason: null };
  }
  if (collapsed.includes('som')) {
    return { code: 'som', reason: null };
  }
  if (collapsed.includes('smud') || collapsed.startsWith('smu')) {
    return { code: 'smud', reason: null };
  }
  if (collapsed.includes('stuka') || collapsed.includes('tuka') || collapsed.startsWith('?tuka')) {
    return { code: 'stuka', reason: null };
  }

  return { code: SPECIES_MAP[normalizeText(normalized)] ?? null, reason: 'species_unmapped' };
}

function mapCategoryCode(categoryText) {
  const normalized = normalizeLegacyLabel(categoryText);
  const collapsed = normalized.replace(/\s+/g, '');

  if (!collapsed || collapsed === 'null') {
    return { code: null, reason: null };
  }

  if (collapsed.includes('jednogod') && collapsed.includes('mla')) {
    return { code: 'jednogodisnja_mladj', reason: null };
  }
  if (collapsed.includes('dvogod') && collapsed.includes('mla')) {
    return { code: 'dvogodisnja_mladj', reason: null };
  }
  if (collapsed.includes('mjes') && collapsed.includes('njak')) {
    return { code: 'mjesecnjak', reason: null };
  }
  if (collapsed.includes('konzum')) {
    return { code: 'konzum', reason: null };
  }
  if (collapsed.includes('matic')) {
    return { code: 'matica', reason: null };
  }

  return { code: CATEGORY_MAP[normalizeText(normalized)] ?? null, reason: 'category_unmapped' };
}

function auditInvalidFishRow(row, pondCode, invalidFields, reason) {
  console.log('[FISH_IMPORT_AUDIT] invalid_row', {
    legacy_id: row.id ?? null,
    water_object: pondCode ?? null,
    species: row.species ?? null,
    category: row.category ?? null,
    event_date: row.event_date ?? null,
    count_in: row.count_in ?? null,
    weight_avg_kg: row.weight_avg_kg ?? null,
    weight_total_kg: row.weight_total_kg ?? null,
    invalid_fields: invalidFields,
    reason
  });
}

function hasCategoryValue(value) {
  return String(value ?? '').trim() !== '';
}

function incrementReason(counter, reason) {
  counter[reason] = (counter[reason] ?? 0) + 1;
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
  const columns = await getLegacyTableColumns(connection, LEGACY_PONDS_TABLE);
  const pondIdCol = pickLegacyColumn(columns, ['pond_id', 'id'], 'pond ID');
  const pondNameCol = pickLegacyColumn(columns, ['pond_name', 'name', 'pond_code'], 'pond naziv');
  const pondTypeCol = pickLegacyColumn(columns, ['pond_type', 'type'], 'pond tip');
  const maxAreaCol = pickLegacyColumn(columns, ['max_area_m2', 'max_area', 'area_m2'], 'maksimalna površina');
  const maxDepthCol = pickLegacyColumn(columns, ['max_depth', 'max_depth_m', 'depth'], 'maksimalna dubina');
  const maxVolumeCol = pickLegacyColumn(columns, ['max_volume_m3', 'max_volume', 'volume_m3'], 'maksimalni volumen');
  const centroidCol = pickLegacyColumn(columns, ['centroid_wkt', 'centroid'], 'centroid');
  const polygonCol = pickLegacyColumn(columns, ['polygon_wkt', 'polygon_geojson', 'polygon'], 'polygon');
  const isActiveCol = pickLegacyColumn(columns, ['is_active', 'active'], 'status aktivnosti');
  const notesCol = pickLegacyColumn(columns, ['napomena', 'notes', 'note'], 'napomena');

  const [rows] = await connection.query(
    `SELECT
        ${pondIdCol} AS pond_id,
        ${pondNameCol} AS pond_name,
        ${pondTypeCol} AS pond_type,
        ${maxAreaCol} AS max_area_m2,
        ${maxDepthCol} AS max_depth,
        ${maxVolumeCol} AS max_volume_m3,
        ${centroidCol} AS centroid_wkt,
        ${polygonCol} AS polygon_wkt,
        ${isActiveCol} AS is_active,
        ${notesCol} AS napomena
     FROM ${LEGACY_DB}.${LEGACY_PONDS_TABLE}`
  );

  for (const row of rows) {
    const code = String(row.pond_name ?? '').trim();
    const objectType = mapObjectType(row.pond_type);

    if (!code || !objectType) {
      summary.water.skipped += 1;
      const reason = !code ? 'missing_code' : 'unmapped_object_type';
      incrementReason(summary.water.skippedReasons, reason);
      if (summary.water.skippedRows.length < 8) {
        summary.water.skippedRows.push({
          pond_name: row.pond_name ?? null,
          pond_type: row.pond_type ?? null,
          reason
        });
      }
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
  const pondColumns = await getLegacyTableColumns(connection, LEGACY_PONDS_TABLE);
  const pondIdCol = pickLegacyColumn(pondColumns, ['pond_id', 'id'], 'pond ID');
  const pondNameCol = pickLegacyColumn(pondColumns, ['pond_name', 'name', 'pond_code'], 'pond naziv');

  const [pondRows] = await connection.query(
    `SELECT ${pondIdCol} AS pond_id, ${pondNameCol} AS pond_name
     FROM ${LEGACY_DB}.${LEGACY_PONDS_TABLE}`
  );
  const [objectRows] = await connection.query('SELECT id, code FROM water_objects');
  const [speciesRows] = await connection.query('SELECT id, code FROM fish_species');
  const [categoryRows] = await connection.query('SELECT id, code FROM fish_categories');

  const legacyPondToCode = new Map(pondRows.map((row) => [row.pond_id, String(row.pond_name ?? '').trim()]));
  const objectIdByCode = new Map(objectRows.map((row) => [String(row.code ?? '').trim(), row.id]));
  const objectByNormalizedCode = new Map(objectRows.map((row) => [normalizeCodeLookup(row.code), row.id]));

  const categoryIdByCode = new Map(categoryRows.map((row) => [row.code, row.id]));
  const fallbackCategoryId = categoryIdByCode.get(FALLBACK_CATEGORY_CODE);
  if (!fallbackCategoryId) {
    throw new Error(`Missing required fish category code: ${FALLBACK_CATEGORY_CODE}`);
  }

  return {
    legacyPondToCode,
    objectIdByCode,
    objectByNormalizedCode,
    speciesIdByCode: new Map(speciesRows.map((row) => [row.code, row.id])),
    categoryIdByCode,
    fallbackCategoryId
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
     FROM ${LEGACY_DB}.${LEGACY_FISH_EVENTS_TABLE}
     WHERE LOWER(event_type) = 'nasad'`
  );

  for (const row of rows) {
    if (isLikelyTestRow(row)) {
      summary.fish.skipped += 1;
      incrementReason(summary.fish.skippedReasons, 'test_row');
      if (summary.fish.skippedRows.length < 20) {
        summary.fish.skippedRows.push({ id: row.id, species: row.species, category: row.category, reason: 'test_row' });
      }
      continue;
    }

    const pondCode = context.legacyPondToCode.get(row.pond_id);
    const waterObjectId = context.objectIdByCode.get(pondCode) ?? context.objectByNormalizedCode.get(normalizeCodeLookup(pondCode));
    const speciesMapped = mapSpeciesCode(row.species);
    const categoryMapped = mapCategoryCode(row.category);
    const speciesCode = speciesMapped.code;
    const categoryCode = categoryMapped.code ?? FALLBACK_CATEGORY_CODE;
    const hasCategory = hasCategoryValue(row.category);

    if (!waterObjectId || !speciesCode || (hasCategory && !categoryCode)) {
      summary.fish.skipped += 1;
      const reasons = [];
      if (!waterObjectId) reasons.push('water_object_not_found');
      if (!speciesCode) reasons.push(speciesMapped.reason ?? 'species_unmapped');
      if (hasCategory && !categoryCode) reasons.push(categoryMapped.reason ?? 'category_unmapped');
      reasons.forEach((reason) => incrementReason(summary.fish.skippedReasons, reason));

      if (summary.fish.skippedRows.length < 20) {
        summary.fish.skippedRows.push({
          id: row.id,
          species: row.species,
          category: row.category,
          reason: reasons.join(', ')
        });
      }

      if (!speciesCode) {
        summary.fish.unmappedSpecies.add(String(row.species ?? 'NULL'));
      }
      if (hasCategory && !categoryCode) {
        summary.fish.unmappedCategories.add(String(row.category ?? 'NULL'));
      }
      continue;
    }

    const speciesId = context.speciesIdByCode.get(speciesCode);
    const categoryId =
      context.categoryIdByCode.get(categoryCode) ??
      context.fallbackCategoryId;
    if (!speciesId || !categoryId) {
      summary.fish.skipped += 1;
      incrementReason(summary.fish.skippedReasons, 'target_lookup_missing');
      if (summary.fish.skippedRows.length < 20) {
        summary.fish.skippedRows.push({
          id: row.id,
          species: row.species,
          category: row.category,
          reason: 'target_lookup_missing'
        });
      }
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

    const invalidFields = [];
    if (!countTotal || countTotal <= 0) invalidFields.push('count_in');
    if (!weightTotal || weightTotal <= 0) invalidFields.push('weight_total_kg');
    if (!row.event_date) invalidFields.push('event_date');

    if (invalidFields.length) {
      summary.fish.skipped += 1;
      incrementReason(summary.fish.skippedReasons, 'invalid_numeric_or_date');
      if (summary.fish.skippedRows.length < 20) {
        summary.fish.skippedRows.push({
          id: row.id,
          pond: pondCode ?? null,
          species: row.species,
          category: row.category,
          event_date: row.event_date ?? null,
          count_in: row.count_in ?? null,
          weight_avg_kg: row.weight_avg_kg ?? null,
          weight_total_kg: row.weight_total_kg ?? null,
          invalid_fields: invalidFields,
          reason: 'invalid_numeric_or_date'
        });
      }

      auditInvalidFishRow(row, pondCode, invalidFields, 'invalid_numeric_or_date');
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
      incrementReason(summary.fish.skippedReasons, 'duplicate_event');
      if (summary.fish.skippedRows.length < 20) {
        summary.fish.skippedRows.push({
          id: row.id,
          species: row.species,
          category: row.category,
          reason: 'duplicate_event'
        });
      }
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
      skipped: 0,
      skippedReasons: {},
      skippedRows: []
    },
    fish: {
      imported: 0,
      skipped: 0,
      unmappedSpecies: new Set(),
      unmappedCategories: new Set(),
      skippedReasons: {},
      skippedRows: []
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
  console.log('Water skip reasons:', summary.water.skippedReasons);
  console.log('Fish skip reasons:', summary.fish.skippedReasons);
  console.log('Water skipped rows (max 8):', summary.water.skippedRows);
  console.log('Fish skipped rows (top 20):', summary.fish.skippedRows);
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
