import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getDatabasePool } from '../config/database.js';

const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultCsvPath = path.resolve(__dirname, '../../data/water-levels-2026-04.csv');

function getArgValue(name, fallback) {
  const prefixed = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefixed));
  if (inline) {
    return inline.slice(prefixed.length);
  }

  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) {
    return args[index + 1];
  }

  return fallback;
}

const csvPath = path.resolve(process.cwd(), getArgValue('--file', defaultCsvPath));
const measurementDate = getArgValue('--date', null);

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, headerIndex) => ({
      ...row,
      [header]: values[headerIndex] ?? '',
      row_number: index + 2
    }), {});
  });
}

function toNumber(value, field, rowNumber) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Row ${rowNumber}: ${field} must be numeric; received "${value}".`);
  }

  return parsed;
}

function toInteger(value, field, rowNumber) {
  const parsed = toNumber(value, field, rowNumber);
  return parsed === null ? null : Math.trunc(parsed);
}

function normalizeRow(row) {
  return {
    code: String(row.code ?? '').trim(),
    measurement_date: measurementDate,
    area_ha: toNumber(row.area_ha, 'area_ha', row.row_number),
    water_level_full_cm: toInteger(row.water_level_full_cm, 'water_level_full_cm', row.row_number),
    water_level_current_cm: toInteger(row.water_level_current_cm, 'water_level_current_cm', row.row_number),
    water_level_missing_cm: toInteger(row.water_level_missing_cm, 'water_level_missing_cm', row.row_number),
    note: String(row.note ?? '').trim() || null,
    row_number: row.row_number
  };
}

async function findWaterObjectByCode(connection, code) {
  const [rows] = await connection.query(
    'SELECT id, code FROM water_objects WHERE LOWER(TRIM(code)) = LOWER(TRIM(?)) LIMIT 1',
    [code]
  );
  return rows[0] ?? null;
}

async function findExistingMeasurement(connection, waterObjectId, date) {
  const [rows] = await connection.query(
    `SELECT id
     FROM water_level_measurements
     WHERE water_object_id = ?
       AND ((? IS NULL AND measurement_date IS NULL) OR measurement_date = ?)
     ORDER BY id DESC
     LIMIT 1`,
    [waterObjectId, date, date]
  );

  return rows[0] ?? null;
}

async function upsertMeasurement(connection, waterObjectId, row) {
  const existing = await findExistingMeasurement(connection, waterObjectId, row.measurement_date);

  if (existing) {
    await connection.query(
      `UPDATE water_level_measurements
       SET area_ha = ?,
           water_level_full_cm = ?,
           water_level_current_cm = ?,
           water_level_missing_cm = ?,
           note = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        row.area_ha,
        row.water_level_full_cm,
        row.water_level_current_cm,
        row.water_level_missing_cm,
        row.note,
        existing.id
      ]
    );
    return 'updated';
  }

  await connection.query(
    `INSERT INTO water_level_measurements (
      water_object_id, measurement_date, area_ha, water_level_full_cm,
      water_level_current_cm, water_level_missing_cm, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      waterObjectId,
      row.measurement_date,
      row.area_ha,
      row.water_level_full_cm,
      row.water_level_current_cm,
      row.water_level_missing_cm,
      row.note
    ]
  );
  return 'inserted';
}

function createSummary() {
  return {
    mode: shouldApply ? 'APPLY' : 'DRY_RUN',
    matched: 0,
    missing: 0,
    inserted: 0,
    updated: 0,
    invalid: 0,
    missingCodes: [],
    invalidRows: []
  };
}

function printSummary(summary) {
  console.log('--- WATER LEVEL IMPORT SUMMARY ---');
  console.log(`Mode: ${summary.mode}`);
  console.log(`CSV file: ${csvPath}`);
  console.log(`Measurement date: ${measurementDate ?? '(null)'}`);
  console.log(`Matched water objects: ${summary.matched}`);
  console.log(`Missing water objects: ${summary.missing}`);
  console.log(`Inserted measurements: ${summary.inserted}`);
  console.log(`Updated measurements: ${summary.updated}`);
  console.log(`Invalid rows: ${summary.invalid}`);
  console.log('Missing codes:', summary.missingCodes);
  console.log('Invalid row details:', summary.invalidRows);
}

async function run() {
  console.log(
    shouldApply
      ? '[WATER_LEVEL_IMPORT] APPLY mode enabled via --apply. Changes will be committed if import succeeds.'
      : '[WATER_LEVEL_IMPORT] DRY-RUN mode (default). No data will be written. Re-run with --apply to persist.'
  );

  let connection;

  try {
    const csvText = await readFile(csvPath, 'utf-8');
    const rows = parseCsv(csvText).map(normalizeRow);
    const summary = createSummary();
    const db = getDatabasePool();
    connection = await db.getConnection();

    if (shouldApply) {
      await connection.beginTransaction();
    }

    for (const row of rows) {
      if (!row.code) {
        summary.invalid += 1;
        summary.invalidRows.push({ row: row.row_number, reason: 'missing_code' });
        continue;
      }

      const waterObject = await findWaterObjectByCode(connection, row.code);
      if (!waterObject) {
        summary.missing += 1;
        summary.missingCodes.push(row.code);
        continue;
      }

      summary.matched += 1;

      if (!shouldApply) {
        continue;
      }

      const action = await upsertMeasurement(connection, waterObject.id, row);
      summary[action] += 1;
    }

    if (shouldApply) {
      await connection.commit();
    }

    printSummary(summary);
  } catch (error) {
    if (shouldApply && connection) {
      await connection.rollback();
    }
    console.error('Water level import failed:', error);
    process.exit(1);
  } finally {
    connection?.release();
  }
}

run();
