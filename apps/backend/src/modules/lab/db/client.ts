import { Pool, QueryResult, QueryResultRow } from 'pg';
import { getLabConfig } from '../config';

export interface Queryable {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const { databaseUrl } = getLabConfig();
    pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export const labDb: Queryable = {
  query: (text, params) => getPool().query(text, params),
};

export async function shutdownLabDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
