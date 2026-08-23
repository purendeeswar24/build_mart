import { Pool, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

export function isDatabaseConfigured(): boolean {
  return (
    !!env.DATABASE_URL &&
    !env.DATABASE_URL.includes('your-neon') &&
    !env.DATABASE_URL.includes('USER:PASSWORD')
  );
}

let pool: Pool | null = null;
let migratePool: Pool | null = null;

function makePool(url: string, max: number): Pool {
  const needsSsl = /sslmode=require|neon\.tech/i.test(url);
  return new Pool({
    connectionString: url,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max,
  });
}

export function getPool(): Pool {
  if (!isDatabaseConfigured()) {
    throw new Error(
      'DATABASE_URL is not set. Add a Neon or local Postgres URL to .env',
    );
  }
  if (!pool) {
    pool = makePool(env.DATABASE_URL!, 10);
  }
  return pool;
}

/** Direct (non-pooler) connection — required for DDL / migrations on Neon. */
export function getMigratePool(): Pool {
  const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!migratePool) {
    migratePool = makePool(url, 2);
  }
  return migratePool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result: QueryResult<T> = await getPool().query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function pingDatabase(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  try {
    await query('select 1 as ok');
    return true;
  } catch {
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
