/**
 * Kutubi - Database Connection & Initialization Module
 * Uses better-sqlite3 with foreign key enforcement and WAL mode
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { wrapDatabase } = require('./adapter');

let dbInstance = null;

const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'kutubi.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

/**
 * Run safe, non-destructive migrations on existing databases
 * @param {Database.Database} db
 */
function runMigrations(db) {
  const columns = db.prepare("PRAGMA table_info(books)").all().map(c => c.name);
  if (!columns.includes('pdf_path')) {
    db.exec("ALTER TABLE books ADD COLUMN pdf_path TEXT DEFAULT ''");
  }
  if (!columns.includes('pdf_filename')) {
    db.exec("ALTER TABLE books ADD COLUMN pdf_filename TEXT DEFAULT ''");
  }
  if (!columns.includes('pdf_size')) {
    db.exec("ALTER TABLE books ADD COLUMN pdf_size INTEGER DEFAULT 0");
  }
  if (!columns.includes('pdf_page_count')) {
    db.exec("ALTER TABLE books ADD COLUMN pdf_page_count INTEGER DEFAULT 0");
  }
  if (!columns.includes('cover_image')) {
    db.exec("ALTER TABLE books ADD COLUMN cover_image TEXT DEFAULT ''");
  }
  if (!columns.includes('last_read_page')) {
    db.exec("ALTER TABLE books ADD COLUMN last_read_page INTEGER DEFAULT 1");
  }
  if (!columns.includes('idempotency_key')) {
    db.exec("ALTER TABLE books ADD COLUMN idempotency_key TEXT DEFAULT ''");
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_books_idempotency_key ON books(idempotency_key) WHERE idempotency_key IS NOT NULL AND idempotency_key != ''");

  // Referential integrity triggers
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS fk_books_category_insert
    BEFORE INSERT ON books
    FOR EACH ROW
    WHEN NEW.category_id IS NOT NULL AND (SELECT id FROM categories WHERE id = NEW.category_id) IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'FOREIGN KEY constraint failed: category_id does not exist in categories');
    END;

    CREATE TRIGGER IF NOT EXISTS fk_books_category_update
    BEFORE UPDATE OF category_id ON books
    FOR EACH ROW
    WHEN NEW.category_id IS NOT NULL AND (SELECT id FROM categories WHERE id = NEW.category_id) IS NULL
    BEGIN
      SELECT RAISE(ABORT, 'FOREIGN KEY constraint failed: category_id does not exist in categories');
    END;

    CREATE TRIGGER IF NOT EXISTS fk_categories_delete
    BEFORE DELETE ON categories
    FOR EACH ROW
    WHEN (SELECT COUNT(*) FROM books WHERE category_id = OLD.id) > 0
    BEGIN
      SELECT RAISE(ABORT, 'FOREIGN KEY constraint failed: cannot delete category referenced by books');
    END;

    CREATE TRIGGER IF NOT EXISTS fk_categories_update_id
    BEFORE UPDATE OF id ON categories
    FOR EACH ROW
    WHEN (SELECT COUNT(*) FROM books WHERE category_id = OLD.id) > 0
    BEGIN
      SELECT RAISE(ABORT, 'FOREIGN KEY constraint failed: cannot change category id while referenced by books');
    END;
  `);
}

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

  // Run versioned migrations for existing databases
  runMigrations(db);

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

  // Default categories singleton
  const { seedDefaultCategories, seedStarterBooksIfFresh } = require('./seed');
  seedDefaultCategories(db);

  // Check if starter books should be seeded (only on genuinely fresh databases)
  const starterMeta = db.prepare("SELECT value FROM app_metadata WHERE key = 'starter_books_seeded'").get();
  if (!starterMeta) {
    // Check if this is an existing database with legacy 'seeded' or 'initialized' marker
    const legacyMeta = db.prepare("SELECT value FROM app_metadata WHERE key = 'seeded' OR key = 'initialized'").get();
    if (legacyMeta) {
      // Existing database already initialized: mark starter_books_seeded without inserting starter books
      db.prepare(`
        INSERT INTO app_metadata (key, value)
        VALUES ('starter_books_seeded', '1')
        ON CONFLICT(key) DO UPDATE SET value = '1'
      `).run();
    } else {
      // Genuinely fresh installation! Seed the 8 starter books
      seedStarterBooksIfFresh(db);
    }
  }

  const wrapped = wrapDatabase(db);
  dbInstance = wrapped;
  return wrapped;
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
