import { getDatabasePool } from '../config/database.js';

const TARGET_CODES = ['TEST-R-01', 'Z16 Majur', 'Z16 Siget', 'Z21 Majur', 'Z21 Siget'];
const DELETION_ORDER = [
  'fish_control_lines',
  'fish_control_events',
  'fish_stock_current',
  'fish_entry_events',
  'water_objects'
];

function parseArgs(argv) {
  const args = new Set(argv);

  if (args.has('--help') || args.has('-h')) {
    return { help: true, apply: false };
  }

  const unknownArgs = argv.filter((arg) => arg !== '--apply');
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArgs.join(', ')}`);
  }

  return { help: false, apply: args.has('--apply') };
}

function printHelp() {
  console.log(`Usage: node src/scripts/cleanup-test-data.js [--apply]\n\nSafely removes only the known test/demo water objects and their related fish records.\nDefault mode is dry-run. Pass --apply to execute the deletes.\n\nTarget water object codes:\n${TARGET_CODES.map((code) => `  - ${code}`).join('\n')}\n\nDeletion order:\n${DELETION_ORDER.map((table) => `  - ${table}`).join('\n')}`);
}

function makePlaceholders(values) {
  return values.map(() => '?').join(', ');
}

function toCount(row) {
  return Number(row?.count ?? 0);
}

async function getCount(connection, sql, params) {
  const [rows] = await connection.query(sql, params);
  return toCount(rows[0]);
}

async function loadTargetObjects(connection) {
  const [rows] = await connection.query(
    `SELECT id, code
     FROM water_objects
     WHERE code IN (${makePlaceholders(TARGET_CODES)})`,
    TARGET_CODES
  );

  const rowsByCode = new Map(rows.map((row) => [row.code, row]));

  return TARGET_CODES.map((code) => rowsByCode.get(code) ?? { id: null, code });
}

async function buildPlan(connection) {
  const objects = await loadTargetObjects(connection);
  const existingObjects = objects.filter((object) => object.id !== null);
  const targetIds = existingObjects.map((object) => object.id);
  const targetIdPlaceholders = makePlaceholders(targetIds);

  const byObject = [];

  for (const object of objects) {
    if (object.id === null) {
      byObject.push({
        code: object.code,
        id: null,
        counts: {
          fish_control_lines: 0,
          fish_control_events: 0,
          fish_stock_current: 0,
          fish_entry_events: 0,
          water_objects: 0
        }
      });
      continue;
    }

    byObject.push({
      code: object.code,
      id: object.id,
      counts: {
        fish_control_lines: await getCount(
          connection,
          `SELECT COUNT(*) AS count
           FROM fish_control_lines fcl
           INNER JOIN fish_control_events fce ON fce.id = fcl.fish_control_event_id
           WHERE fce.water_object_id = ?`,
          [object.id]
        ),
        fish_control_events: await getCount(
          connection,
          'SELECT COUNT(*) AS count FROM fish_control_events WHERE water_object_id = ?',
          [object.id]
        ),
        fish_stock_current: await getCount(
          connection,
          'SELECT COUNT(*) AS count FROM fish_stock_current WHERE water_object_id = ?',
          [object.id]
        ),
        fish_entry_events: await getCount(
          connection,
          'SELECT COUNT(*) AS count FROM fish_entry_events WHERE water_object_id = ?',
          [object.id]
        ),
        water_objects: 1
      }
    });
  }

  const totals = Object.fromEntries(DELETION_ORDER.map((table) => [table, 0]));
  for (const object of byObject) {
    for (const table of DELETION_ORDER) {
      totals[table] += object.counts[table];
    }
  }

  const blockers = {
    fish_entry_events_source_only: 0,
    fish_exit_events: 0
  };

  if (targetIds.length > 0) {
    blockers.fish_entry_events_source_only = await getCount(
      connection,
      `SELECT COUNT(*) AS count
       FROM fish_entry_events
       WHERE source_water_object_id IN (${targetIdPlaceholders})
         AND water_object_id NOT IN (${targetIdPlaceholders})`,
      [...targetIds, ...targetIds]
    );

    blockers.fish_exit_events = await getCount(
      connection,
      `SELECT COUNT(*) AS count
       FROM fish_exit_events
       WHERE water_object_id IN (${targetIdPlaceholders})
          OR destination_water_object_id IN (${targetIdPlaceholders})`,
      [...targetIds, ...targetIds]
    );
  }

  return { byObject, totals, blockers, targetIds };
}

function printPlan(plan, mode) {
  console.log(`Cleanup mode: ${mode}`);
  console.log('Only these exact water object codes are targeted:');
  for (const code of TARGET_CODES) {
    console.log(`  - ${code}`);
  }

  console.log('\nNo LIKE, wildcard, or pattern matching is used by this script.');
  console.log('\nCounts by water object:');

  for (const object of plan.byObject) {
    const label = object.id === null ? `${object.code} (not found)` : `${object.code} (id=${object.id})`;
    console.log(`\n${label}`);
    for (const table of DELETION_ORDER) {
      console.log(`  ${table}: ${object.counts[table]}`);
    }
  }

  console.log('\nTotal rows in deletion order:');
  for (const table of DELETION_ORDER) {
    console.log(`  ${table}: ${plan.totals[table]}`);
  }

  console.log('\nSafety checks for related records that this script will NOT delete:');
  console.log(`  fish_entry_events where a target object is source only: ${plan.blockers.fish_entry_events_source_only}`);
  console.log(`  fish_exit_events involving target objects: ${plan.blockers.fish_exit_events}`);

  if (plan.blockers.fish_entry_events_source_only > 0 || plan.blockers.fish_exit_events > 0) {
    console.log('\nApply is blocked until the records above are reviewed manually.');
  }
}

function assertSafeToApply(plan) {
  if (plan.blockers.fish_entry_events_source_only > 0 || plan.blockers.fish_exit_events > 0) {
    throw new Error('Refusing to delete because non-targeted related records would remain linked to target water objects. Review dry-run output.');
  }
}

async function deleteRows(connection, plan) {
  if (plan.targetIds.length === 0) {
    console.log('\nNo matching target water objects found. Nothing to delete.');
    return;
  }

  const placeholders = makePlaceholders(plan.targetIds);
  const deleteResults = [];

  await connection.beginTransaction();
  try {
    const [controlLinesResult] = await connection.query(
      `DELETE fcl
       FROM fish_control_lines fcl
       INNER JOIN fish_control_events fce ON fce.id = fcl.fish_control_event_id
       WHERE fce.water_object_id IN (${placeholders})`,
      plan.targetIds
    );
    deleteResults.push(['fish_control_lines', controlLinesResult.affectedRows]);

    const [controlEventsResult] = await connection.query(
      `DELETE FROM fish_control_events
       WHERE water_object_id IN (${placeholders})`,
      plan.targetIds
    );
    deleteResults.push(['fish_control_events', controlEventsResult.affectedRows]);

    const [stockResult] = await connection.query(
      `DELETE FROM fish_stock_current
       WHERE water_object_id IN (${placeholders})`,
      plan.targetIds
    );
    deleteResults.push(['fish_stock_current', stockResult.affectedRows]);

    const [entryEventsResult] = await connection.query(
      `DELETE FROM fish_entry_events
       WHERE water_object_id IN (${placeholders})`,
      plan.targetIds
    );
    deleteResults.push(['fish_entry_events', entryEventsResult.affectedRows]);

    const [waterObjectsResult] = await connection.query(
      `DELETE FROM water_objects
       WHERE id IN (${placeholders})
         AND code IN (${makePlaceholders(TARGET_CODES)})`,
      [...plan.targetIds, ...TARGET_CODES]
    );
    deleteResults.push(['water_objects', waterObjectsResult.affectedRows]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  console.log('\nDeleted rows:');
  for (const [table, count] of deleteResults) {
    console.log(`  ${table}: ${count}`);
  }
}

async function main() {
  const { help, apply } = parseArgs(process.argv.slice(2));

  if (help) {
    printHelp();
    return;
  }

  const mode = apply ? 'apply' : 'dry-run';
  const db = getDatabasePool();
  const connection = await db.getConnection();

  try {
    const plan = await buildPlan(connection);
    printPlan(plan, mode);

    if (!apply) {
      console.log('\nDry-run only. Re-run with --apply to delete the rows listed above.');
      return;
    }

    assertSafeToApply(plan);
    await deleteRows(connection, plan);
  } finally {
    connection.release();
    await db.end();
  }
}

main().catch((error) => {
  const details = error.message || error.code || String(error);
  console.error('Cleanup failed:', details);
  process.exit(1);
});
