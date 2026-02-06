import {executeSqlQuery, executeTransaction} from './databaseConnection';
import {createInitialTasks} from './seedData';
import {mapTaskToDatabaseParameters} from './databaseMappers';

const SEED_KEY = 'initial_seed_completed';

const CREATE_TASKS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  price REAL NOT NULL,
  business_status TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  location_lat REAL NOT NULL,
  location_lng REAL NOT NULL,
  location_address TEXT NOT NULL,
  image_uri TEXT,
  expires_at TEXT NOT NULL,
  notes TEXT NOT NULL,
  server_version INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  last_synced_at TEXT
)`;

const CREATE_SYNC_QUEUE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  state TEXT NOT NULL,
  attempt_count INTEGER NOT NULL,
  next_retry_at TEXT NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

const CREATE_CONFLICTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS conflicts (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL UNIQUE,
  server_payload_json TEXT NOT NULL,
  local_payload_json TEXT NOT NULL,
  resolution TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT
)`;

const CREATE_METADATA_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
)`;

const UPSERT_TASK_SQL = `
INSERT OR REPLACE INTO tasks (
  id,
  title,
  price,
  business_status,
  sync_status,
  location_lat,
  location_lng,
  location_address,
  image_uri,
  expires_at,
  notes,
  server_version,
  updated_at,
  last_synced_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

export async function initializeDatabaseSchemaAndSeedDataIfNeeded(): Promise<void> {
  await executeSqlQuery(CREATE_TASKS_TABLE_SQL);
  await executeSqlQuery(CREATE_SYNC_QUEUE_TABLE_SQL);
  await executeSqlQuery(CREATE_CONFLICTS_TABLE_SQL);
  await executeSqlQuery(CREATE_METADATA_TABLE_SQL);

  const metadataResult = await executeSqlQuery(
    'SELECT value FROM app_metadata WHERE key = ? LIMIT 1',
    [SEED_KEY],
  );

  const alreadySeeded =
    metadataResult.rows.length > 0 && metadataResult.rows.item(0).value === 'true';

  if (alreadySeeded) {
    return;
  }

  const seedTasks = createInitialTasks();

  await executeTransaction(async () => {
    for (const seedTask of seedTasks) {
      await executeSqlQuery(UPSERT_TASK_SQL, mapTaskToDatabaseParameters(seedTask));
    }

    await executeSqlQuery(
      'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (?, ?)',
      [SEED_KEY, 'true'],
    );
  });
}
