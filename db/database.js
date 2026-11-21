/**
 * Kutubi - Database Connection & Initialization Module
 * Uses better-sqlite3 with foreign key enforcement and WAL mode
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

let dbInstance = null;

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'kutubi.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

/**
 * Initialize and return the SQLite database instance
 * @param {string} [customPath] - Optional custom path (e.g. for testing)
 * @returns {Database.Database}
 */
function initDatabase(customPath) {
  const dbPath = customPath || process.env.DATABASE_PATH || DEFAULT_DB_PATH;

  // Ensure target directory exists if writing to disk
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);

  // Enforce WAL mode and foreign keys
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Execute schema
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schemaSql);

  // Initialize singleton defaults if not present
  const now = new Date().toISOString();

  // Settings singleton (id = 1)
  const existingSettings = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!existingSettings) {
    db.prepare(`
      INSERT INTO settings (id, default_library_view, default_sort_order, updated_at)
      VALUES (1, 'grid', 'recently-added', ?)
    `).run(now);
  }

  // Profile singleton (id = 1)
  const existingProfile = db.prepare('SELECT id FROM profile WHERE id = 1').get();
  if (!existingProfile) {
    db.prepare(`
      INSERT INTO profile (id, display_name, bio, updated_at)
      VALUES (1, 'Ahmed Khaled', 'Software Engineering student reading 20 books in 2026', ?)
    `).run(now);
  }

  // Check if initial seeding is required
  const seedMeta = db.prepare("SELECT value FROM app_metadata WHERE key = 'seeded'").get();
  if (!seedMeta) {
    const { seedInitialData } = require('./seed');
    seedInitialData(db);
  }

  dbInstance = db;
  return db;
}

/**
 * Get active database instance (initializes if needed)
 * @returns {Database.Database}
 */
function getDb() {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

/**
 * Close the database connection
 */
function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore if already closed
    }
    dbInstance = null;
  }
}

module.exports = {
  initDatabase,
  getDb,
  closeDb,
  DEFAULT_DB_PATH
};
