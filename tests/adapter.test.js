const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
const { SQLiteAdapter, TursoAdapter, wrapDatabase } = require('../db/adapter');

test('SQLiteAdapter: Core query, execute, and batch operations', (t) => {
  const rawDb = new Database(':memory:');
  const db = new SQLiteAdapter(rawDb);

  db.exec(`
    CREATE TABLE test_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      count INTEGER DEFAULT 0
    );
  `);

  // execute insert
  const res1 = db.execute('INSERT INTO test_items (name, count) VALUES (?, ?)', ['Item 1', 10]);
  assert.strictEqual(res1.lastInsertRowid, 1);
  assert.strictEqual(res1.rowsAffected, 1);

  // queryOne
  const row = db.queryOne('SELECT * FROM test_items WHERE id = ?', [1]);
  assert.ok(row);
  assert.strictEqual(row.name, 'Item 1');
  assert.strictEqual(row.count, 10);

  // queryAll
  const all = db.queryAll('SELECT * FROM test_items ORDER BY id');
  assert.strictEqual(all.length, 1);

  // batch
  const batchRes = db.batch([
    { sql: 'INSERT INTO test_items (name, count) VALUES (?, ?)', args: ['Item 2', 20] },
    { sql: 'INSERT INTO test_items (name, count) VALUES (?, ?)', args: ['Item 3', 30] }
  ]);
  assert.strictEqual(batchRes.length, 2);
  assert.strictEqual(db.queryAll('SELECT * FROM test_items').length, 3);

  // backwards-compatibility prepare()
  const prepRow = db.prepare('SELECT count FROM test_items WHERE id = ?').get(2);
  assert.strictEqual(prepRow.count, 20);

  db.close();
});

test('SQLiteAdapter: Referential Integrity Triggers', (t) => {
  const rawDb = new Database(':memory:');
  const db = new SQLiteAdapter(rawDb);

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  const now = new Date().toISOString();
  db.execute('INSERT INTO categories (id, name, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
    1, 'Tech', 0, now, now
  ]);

  // Valid book insert
  const validBook = db.execute(`
    INSERT INTO books (title, author, category_id, total_pages, current_page, date_added, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, ['Good Code', 'Author A', 1, 200, 0, now, now, now]);
  assert.strictEqual(validBook.rowsAffected, 1);

  // Invalid book insert with nonexistent category
  assert.throws(() => {
    db.execute(`
      INSERT INTO books (title, author, category_id, total_pages, current_page, date_added, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['Bad Book', 'Author B', 9999, 100, 0, now, now, now]);
  }, /FOREIGN KEY constraint failed/);

  // Invalid update to nonexistent category
  assert.throws(() => {
    db.execute('UPDATE books SET category_id = 9999 WHERE id = ?', [validBook.lastInsertRowid]);
  }, /FOREIGN KEY constraint failed/);

  // Deleting referenced category must be rejected
  assert.throws(() => {
    db.execute('DELETE FROM categories WHERE id = 1');
  }, /FOREIGN KEY constraint failed/);

  db.close();
});

test('TursoAdapter: Operations over libSQL client', async (t) => {
  const dbFile = path.join(__dirname, 'test_turso_adapter.db');
  if (fs.existsSync(dbFile)) {
    try { fs.unlinkSync(dbFile); } catch {}
  }

  const client = createClient({ url: 'file:' + dbFile });
  const db = new TursoAdapter(client);

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schemaSql);

  const now = new Date().toISOString();
  const catRes = await db.execute(
    'INSERT INTO categories (id, name, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [1, 'General', 1, now, now]
  );
  assert.strictEqual(catRes.rowsAffected, 1);

  // Insert valid book
  const bookRes = await db.execute(`
    INSERT INTO books (title, author, category_id, total_pages, current_page, date_added, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, ['Turso Book', 'Cloud Author', 1, 300, 50, now, now, now]);
  assert.strictEqual(bookRes.lastInsertRowid, 1);

  // Query one
  const book = await db.queryOne('SELECT * FROM books WHERE id = ?', [1]);
  assert.ok(book);
  assert.strictEqual(book.title, 'Turso Book');
  assert.strictEqual(book.current_page, 50);

  // Query all
  const books = await db.queryAll('SELECT * FROM books');
  assert.strictEqual(books.length, 1);

  // Reject invalid foreign key
  let threwFk = false;
  try {
    await db.execute(`
      INSERT INTO books (title, author, category_id, total_pages, current_page, date_added, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, ['Invalid FK', 'Author X', 8888, 100, 0, now, now, now]);
  } catch (err) {
    threwFk = true;
    assert.match(err.message, /FOREIGN KEY constraint failed/);
  }
  assert.strictEqual(threwFk, true, 'Turso triggers must reject invalid category_id');

  // Reject delete referenced category
  let threwDel = false;
  try {
    await db.execute('DELETE FROM categories WHERE id = 1');
  } catch (err) {
    threwDel = true;
    assert.match(err.message, /FOREIGN KEY constraint failed/);
  }
  assert.strictEqual(threwDel, true, 'Turso triggers must reject deleting referenced category');

  // Batch execution
  const batchRes = await db.batch([
    {
      sql: 'INSERT INTO categories (name, is_system, created_at, updated_at) VALUES (?, ?, ?, ?)',
      args: ['Category Batch 1', 0, now, now]
    },
    {
      sql: 'INSERT INTO categories (name, is_system, created_at, updated_at) VALUES (?, ?, ?, ?)',
      args: ['Category Batch 2', 0, now, now]
    }
  ]);
  assert.strictEqual(batchRes.length, 2);

  await db.close();
  try { fs.unlinkSync(dbFile); } catch {}
});
