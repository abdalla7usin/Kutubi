/**
 * Kutubi - Unified Database Adapter
 * Provides a common contract across both:
 * 1. better-sqlite3 (Local development & test suites)
 * 2. Turso / @libsql/client (Production & cloud environments)
 */

class SQLiteAdapter {
  constructor(db) {
    this.engine = 'sqlite';
    this.db = db;
    this.isAsync = false;
  }

  queryOne(sql, params = []) {
    const stmt = this.db.prepare(sql);
    const row = Array.isArray(params) ? stmt.get(...params) : stmt.get(params);
    return row || null;
  }

  queryAll(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return Array.isArray(params) ? stmt.all(...params) : stmt.all(params);
  }

  execute(sql, params = []) {
    const stmt = this.db.prepare(sql);
    const res = Array.isArray(params) ? stmt.run(...params) : stmt.run(params);
    return {
      lastInsertRowid: Number(res.lastInsertRowid),
      rowsAffected: res.changes,
      changes: res.changes
    };
  }

  batch(statements) {
    const runBatch = this.db.transaction(() => {
      const results = [];
      for (const item of statements) {
        if (typeof item === 'string') {
          results.push(this.db.exec(item));
        } else {
          const { sql, args = [] } = item;
          const stmt = this.db.prepare(sql);
          const res = Array.isArray(args) ? stmt.run(...args) : stmt.run(args);
          results.push({
            lastInsertRowid: Number(res.lastInsertRowid),
            rowsAffected: res.changes,
            changes: res.changes
          });
        }
      }
      return results;
    });
    return runBatch();
  }

  exec(sql) {
    return this.db.exec(sql);
  }

  prepare(sql) {
    const stmt = this.db.prepare(sql);
    return {
      get: (...params) => stmt.get(...params),
      all: (...params) => stmt.all(...params),
      run: (...params) => {
        const res = stmt.run(...params);
        return {
          lastInsertRowid: Number(res.lastInsertRowid),
          changes: res.changes
        };
      }
    };
  }

  transaction(fn) {
    return this.db.transaction(fn);
  }

  pragma(sql) {
    return this.db.pragma(sql);
  }

  backup(dest, options) {
    return this.db.backup(dest, options);
  }

  close() {
    return this.db.close();
  }

  raw() {
    return this.db;
  }
}

class TursoAdapter {
  constructor(client) {
    this.engine = 'turso';
    this.client = client;
    this.isAsync = true;
  }

  async queryOne(sql, params = []) {
    const args = Array.isArray(params) ? params : [params];
    const res = await this.client.execute({ sql, args });
    if (!res.rows || res.rows.length === 0) return null;
    return { ...res.rows[0] };
  }

  async queryAll(sql, params = []) {
    const args = Array.isArray(params) ? params : [params];
    const res = await this.client.execute({ sql, args });
    return (res.rows || []).map(r => ({ ...r }));
  }

  async execute(sql, params = []) {
    const args = Array.isArray(params) ? params : [params];
    const res = await this.client.execute({ sql, args });
    return {
      lastInsertRowid: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : null,
      rowsAffected: res.rowsAffected,
      changes: res.rowsAffected
    };
  }

  async batch(statements) {
    const normalized = statements.map(s => {
      if (typeof s === 'string') return { sql: s, args: [] };
      return { sql: s.sql, args: Array.isArray(s.args) ? s.args : [] };
    });
    const results = await this.client.batch(normalized, 'write');
    return results.map(r => ({
      lastInsertRowid: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : null,
      rowsAffected: r.rowsAffected,
      changes: r.rowsAffected
    }));
  }

  async exec(sql) {
    return await this.client.executeMultiple(sql);
  }

  prepare(sql) {
    return {
      get: async (...args) => this.queryOne(sql, args),
      all: async (...args) => this.queryAll(sql, args),
      run: async (...args) => this.execute(sql, args)
    };
  }

  transaction(fn) {
    return async (...args) => {
      if (typeof this.client.transaction === 'function') {
        const tx = await this.client.transaction('write');
        try {
          const txAdapter = new TursoAdapter(tx);
          const result = await fn(txAdapter, ...args);
          await tx.commit();
          return result;
        } catch (err) {
          await tx.rollback();
          throw err;
        }
      } else {
        // Fallback to sequential execution
        return await fn(this, ...args);
      }
    };
  }

  async pragma(sql) {
    return await this.client.execute(`PRAGMA ${sql}`);
  }

  close() {
    return this.client.close();
  }

  raw() {
    return this.client;
  }
}

/**
 * Wrap any database instance (better-sqlite3 or @libsql/client) into the unified adapter
 */
function wrapDatabase(rawDb) {
  if (!rawDb) return null;
  if (rawDb instanceof SQLiteAdapter || rawDb instanceof TursoAdapter) {
    return rawDb;
  }
  // If rawDb has .batch and .execute (libSQL client)
  if (typeof rawDb.execute === 'function' && typeof rawDb.batch === 'function') {
    return new TursoAdapter(rawDb);
  }
  // Default to SQLiteAdapter
  return new SQLiteAdapter(rawDb);
}

/**
 * Dual-mode execution helper:
 * If result is a Promise, chains through .then(transform).
 * If result is synchronous, returns transform(result) directly.
 */
function handleResult(result, transform) {
  if (result && typeof result.then === 'function') {
    return result.then(val => (transform ? transform(val) : val));
  }
  return transform ? transform(result) : result;
}

module.exports = {
  SQLiteAdapter,
  TursoAdapter,
  wrapDatabase,
  handleResult
};
