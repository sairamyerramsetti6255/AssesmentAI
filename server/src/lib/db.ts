/**
 * Neon Postgres data layer.
 *
 * Exposes a small query builder with the same call shape the routes already use
 * (`.from(t).select(...).eq(...).single()` resolving to `{ data, error }`), so the
 * route code reads the same whether it talks to PostgREST or straight Postgres.
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[db] DATABASE_URL not set — database routes will fail');
}

export const pool = connectionString
  ? new Pool({
      connectionString,
      // Neon terminates TLS at the pooler with a cert chain Node does not ship.
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    })
  : null;

export function isDbConfigured(): boolean {
  return Boolean(pool);
}

function requirePool(): pg.Pool {
  if (!pool) throw new Error('Database not configured — set DATABASE_URL in server/.env');
  return pool;
}

export interface DbError {
  message: string;
  code: string;
  details?: string;
  hint?: string;
}

export interface DbResult<T> {
  data: T;
  error: DbError | null;
}

/** Rows are shaped by the caller's query, so they stay loosely typed. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

type Row = Record<string, unknown>;

/** `column -> data_type` for every table in the public schema. */
type SchemaMap = Map<string, Map<string, string>>;

let schemaCache: Promise<SchemaMap> | null = null;

async function loadSchema(): Promise<SchemaMap> {
  const { rows } = await requirePool().query<{
    table_name: string;
    column_name: string;
    data_type: string;
  }>(
    `SELECT table_name, column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public'`,
  );
  const map: SchemaMap = new Map();
  for (const r of rows) {
    let cols = map.get(r.table_name);
    if (!cols) {
      cols = new Map();
      map.set(r.table_name, cols);
    }
    cols.set(r.column_name, r.data_type);
  }
  return map;
}

function getSchema(): Promise<SchemaMap> {
  if (!schemaCache) schemaCache = loadSchema().catch((e) => { schemaCache = null; throw e; });
  return schemaCache;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function quoteColumnList(cols: string): string {
  const trimmed = cols.trim();
  if (!trimmed || trimmed === '*') return '*';
  return trimmed.split(',').map((c) => quoteIdent(c.trim())).join(', ');
}

/**
 * jsonb/json columns must be sent as JSON text; without this an array value
 * would be encoded as a Postgres array literal and rejected.
 */
function bindValue(value: unknown, dataType: string | undefined): unknown {
  if (value === null || value === undefined) return null;
  if ((dataType === 'jsonb' || dataType === 'json') && typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

function mapError(e: unknown): DbError {
  const pgErr = e as { message?: string; code?: string; detail?: string; hint?: string };
  const code = pgErr?.code ?? '';
  // Routes retry on PGRST204 to drop columns that predate a migration.
  if (code === '42703') {
    return { message: pgErr.message ?? 'column does not exist', code: 'PGRST204', details: pgErr.detail };
  }
  return {
    message: pgErr?.message ?? String(e),
    code,
    details: pgErr?.detail,
    hint: pgErr?.hint,
  };
}

const NO_ROWS: DbError = {
  message: 'JSON object requested, multiple (or no) rows returned',
  code: 'PGRST116',
};

type Op = 'select' | 'insert' | 'update' | 'upsert' | 'delete';

class QueryBuilder<T = AnyRow> implements PromiseLike<DbResult<T>> {
  private op: Op = 'select';
  private opSet = false;
  private columns = '*';
  private returningCols: string | null = null;
  private payload: Row[] = [];
  private patch: Row = {};
  private conflictTarget = 'id';
  private wheres: { col: string; value: unknown }[] = [];
  private orders: { col: string; ascending: boolean }[] = [];
  private limitCount: number | null = null;
  private wantSingle = false;

  constructor(private table: string) {}

  select(cols = '*'): this {
    if (this.opSet) {
      // `.select()` chained after a write means RETURNING
      this.returningCols = cols;
    } else {
      this.op = 'select';
      this.columns = cols;
    }
    return this;
  }

  insert(values: Row | Row[]): this {
    this.op = 'insert';
    this.opSet = true;
    this.payload = Array.isArray(values) ? values : [values];
    return this;
  }

  upsert(values: Row | Row[], options?: { onConflict?: string }): this {
    this.op = 'upsert';
    this.opSet = true;
    this.payload = Array.isArray(values) ? values : [values];
    if (options?.onConflict) this.conflictTarget = options.onConflict;
    return this;
  }

  update(patch: Row): this {
    this.op = 'update';
    this.opSet = true;
    this.patch = patch;
    return this;
  }

  delete(): this {
    this.op = 'delete';
    this.opSet = true;
    return this;
  }

  eq(col: string, value: unknown): this {
    this.wheres.push({ col, value });
    return this;
  }

  order(col: string, options?: { ascending?: boolean }): this {
    this.orders.push({ col, ascending: options?.ascending !== false });
    return this;
  }

  limit(n: number): this {
    this.limitCount = n;
    return this;
  }

  single(): this {
    this.wantSingle = true;
    return this;
  }

  maybeSingle(): this {
    this.wantSingle = true;
    return this;
  }

  private buildWhere(params: unknown[], types: Map<string, string> | undefined): string {
    if (!this.wheres.length) return '';
    const parts = this.wheres.map(({ col, value }) => {
      if (value === null) return `${quoteIdent(col)} IS NULL`;
      params.push(bindValue(value, types?.get(col)));
      return `${quoteIdent(col)} = $${params.length}`;
    });
    return ` WHERE ${parts.join(' AND ')}`;
  }

  private buildOrderLimit(): string {
    let sql = '';
    if (this.orders.length) {
      const parts = this.orders.map((o) => `${quoteIdent(o.col)} ${o.ascending ? 'ASC' : 'DESC'}`);
      sql += ` ORDER BY ${parts.join(', ')}`;
    }
    if (this.limitCount !== null) sql += ` LIMIT ${Number(this.limitCount)}`;
    return sql;
  }

  private returningClause(): string {
    return this.returningCols === null ? '' : ` RETURNING ${quoteColumnList(this.returningCols)}`;
  }

  private async build(): Promise<{ sql: string; params: unknown[] }> {
    const schema = await getSchema();
    const types = schema.get(this.table);
    const table = quoteIdent(this.table);
    const params: unknown[] = [];

    if (this.op === 'select') {
      const sql =
        `SELECT ${quoteColumnList(this.columns)} FROM ${table}` +
        this.buildWhere(params, types) +
        this.buildOrderLimit();
      return { sql, params };
    }

    if (this.op === 'insert' || this.op === 'upsert') {
      const cols = Array.from(
        new Set(this.payload.flatMap((r) => Object.keys(r).filter((k) => r[k] !== undefined))),
      );
      if (!cols.length) throw new Error(`insert into ${this.table} requires at least one column`);

      const tuples = this.payload.map((row) => {
        const placeholders = cols.map((c) => {
          params.push(bindValue(row[c] ?? null, types?.get(c)));
          return `$${params.length}`;
        });
        return `(${placeholders.join(', ')})`;
      });

      let sql =
        `INSERT INTO ${table} (${cols.map(quoteIdent).join(', ')}) VALUES ${tuples.join(', ')}`;

      if (this.op === 'upsert') {
        const conflictCols = this.conflictTarget.split(',').map((c) => c.trim());
        const updatable = cols.filter((c) => !conflictCols.includes(c));
        sql += ` ON CONFLICT (${conflictCols.map(quoteIdent).join(', ')}) DO ${
          updatable.length
            ? `UPDATE SET ${updatable.map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`).join(', ')}`
            : 'NOTHING'
        }`;
      }

      return { sql: sql + this.returningClause(), params };
    }

    if (this.op === 'update') {
      const cols = Object.keys(this.patch).filter((k) => this.patch[k] !== undefined);
      if (!cols.length) {
        // Nothing to change — behave like a plain read of the targeted rows.
        const sql =
          `SELECT ${quoteColumnList(this.returningCols ?? '*')} FROM ${table}` +
          this.buildWhere(params, types);
        return { sql, params };
      }
      const assignments = cols.map((c) => {
        params.push(bindValue(this.patch[c] ?? null, types?.get(c)));
        return `${quoteIdent(c)} = $${params.length}`;
      });
      const sql =
        `UPDATE ${table} SET ${assignments.join(', ')}` +
        this.buildWhere(params, types) +
        this.returningClause();
      return { sql, params };
    }

    const sql = `DELETE FROM ${table}` + this.buildWhere(params, types) + this.returningClause();
    return { sql, params };
  }

  private async run(): Promise<DbResult<T>> {
    try {
      const { sql, params } = await this.build();
      const result = await requirePool().query(sql, params);
      const rows = result.rows as Row[];

      if (this.wantSingle) {
        if (rows.length !== 1) return { data: null as T, error: NO_ROWS };
        return { data: rows[0] as T, error: null };
      }
      // Writes without an explicit `.select()` return no body, like PostgREST.
      if (this.op !== 'select' && this.returningCols === null) {
        return { data: null as T, error: null };
      }
      return { data: rows as T, error: null };
    } catch (e) {
      return { data: null as T, error: mapError(e) };
    }
  }

  then<R1 = DbResult<T>, R2 = never>(
    onfulfilled?: ((value: DbResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.run().then(onfulfilled, onrejected);
  }
}

export interface DbClient {
  from<T = AnyRow>(table: string): QueryBuilder<T>;
}

export const db: DbClient = {
  from<T = AnyRow>(table: string) {
    return new QueryBuilder<T>(table);
  },
};

export function requireDb(): DbClient {
  requirePool();
  return db;
}

/** Verifies connectivity at boot so misconfiguration surfaces immediately. */
export async function verifyDbConnection(): Promise<void> {
  if (!pool) return;
  const { rows } = await pool.query<{ db: string; tables: string }>(
    `SELECT current_database() AS db,
            (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') AS tables`,
  );
  console.log(`[db] Connected to Neon "${rows[0].db}" (${rows[0].tables} tables in public) ✓`);
}
