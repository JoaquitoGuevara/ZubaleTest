import SQLite, {SQLiteDatabase} from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let cachedDatabaseConnection: SQLiteDatabase | null = null;

export async function getOpenDatabaseConnection(): Promise<SQLiteDatabase> {
  if (cachedDatabaseConnection) {
    return cachedDatabaseConnection;
  }

  cachedDatabaseConnection = await SQLite.openDatabase({
    name: 'zubale_offline_auditor.db',
    location: 'default',
  });

  return cachedDatabaseConnection;
}

export async function executeSqlQuery(
  sqlStatement: string,
  parameters: unknown[] = [],
): Promise<SQLite.ResultSet> {
  const databaseConnection = await getOpenDatabaseConnection();
  const [resultSet] = await databaseConnection.executeSql(sqlStatement, parameters);
  return resultSet;
}

export async function executeTransaction<T>(
  transactionalOperation: () => Promise<T>,
): Promise<T> {
  await executeSqlQuery('BEGIN TRANSACTION');

  try {
    const result = await transactionalOperation();
    await executeSqlQuery('COMMIT');
    return result;
  } catch (error) {
    await executeSqlQuery('ROLLBACK');
    throw error;
  }
}
