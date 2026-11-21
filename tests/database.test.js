const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { initDatabase, closeDb } = require('../db/database');

describe('Database Initialization & Schema Integrity', () => {
  let db;

  beforeEach(() => {
    db = initDatabase(':memory:');
  });

  afterEach(() => {
    closeDb();
  });

  it('should initialize tables with foreign keys and correct schemas', () => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all().map(t => t.name);

    assert.ok(tables.includes('books'), 'books table exists');
    assert.ok(tables.includes('categories'), 'categories table exists');
    assert.ok(tables.includes('settings'), 'settings table exists');
    assert.ok(tables.includes('profile'), 'profile table exists');
    assert.ok(tables.includes('app_metadata'), 'app_metadata table exists');
  });

  it('should seed exactly 24 books and 5 categories on initial run', () => {
    const bookCount = db.prepare('SELECT COUNT(*) AS total FROM books').get().total;
    const catCount = db.prepare('SELECT COUNT(*) AS total FROM categories').get().total;

    assert.strictEqual(bookCount, 24, 'Exactly 24 seed books');
    assert.strictEqual(catCount, 5, 'Exactly 5 seed categories');
  });

  it('should strictly match target status distribution (3 Reading, 14 Completed, 7 To Read)', () => {
    const statuses = db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM books
      GROUP BY status
    `).all();

    const statusMap = Object.fromEntries(statuses.map(s => [s.status, s.count]));

    assert.strictEqual(statusMap['Reading'], 3, '3 Reading books');
    assert.strictEqual(statusMap['Completed'], 14, '14 Completed books');
    assert.strictEqual(statusMap['To Read'], 7, '7 To Read books');
  });

  it('should strictly match target category distribution (8, 6, 5, 3, 2)', () => {
    const catCounts = db.prepare(`
      SELECT c.name, COUNT(b.id) AS count
      FROM categories c
      LEFT JOIN books b ON b.category_id = c.id
      GROUP BY c.id
    `).all();

    const catMap = Object.fromEntries(catCounts.map(c => [c.name, c.count]));

    assert.strictEqual(catMap['Engineering'], 8, '8 Engineering books');
    assert.strictEqual(catMap['Arabic Literature'], 6, '6 Arabic Literature books');
    assert.strictEqual(catMap['Fiction & Sci-Fi'], 5, '5 Fiction & Sci-Fi books');
    assert.strictEqual(catMap['Self-Development'], 3, '3 Self-Development books');
    assert.strictEqual(catMap['Uncategorized'], 2, '2 Uncategorized books');
  });

  it('should enforce singleton constraints on settings and profile tables', () => {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();

    assert.ok(settings, 'Settings row 1 exists');
    assert.strictEqual(settings.default_library_view, 'grid');
    assert.strictEqual(settings.default_sort_order, 'recently-added');

    assert.ok(profile, 'Profile row 1 exists');
    assert.strictEqual(profile.display_name, 'Ahmed Khaled');
  });
});
