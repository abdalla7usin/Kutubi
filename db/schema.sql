-- Kutubi (كتبي) - SQLite Database Schema
PRAGMA foreign_keys = ON;

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Books Table
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  status TEXT CHECK(status IN ('Reading', 'Completed', 'To Read')) NOT NULL DEFAULT 'To Read',
  total_pages INTEGER NOT NULL CHECK(total_pages >= 1),
  current_page INTEGER NOT NULL DEFAULT 0 CHECK(current_page >= 0 AND current_page <= total_pages),
  cover_url TEXT DEFAULT '',
  rating INTEGER CHECK(rating IS NULL OR (rating >= 1 AND rating <= 5)),
  description TEXT DEFAULT '',
  pdf_path TEXT DEFAULT '',
  pdf_filename TEXT DEFAULT '',
  pdf_size INTEGER DEFAULT 0,
  pdf_page_count INTEGER DEFAULT 0,
  cover_image TEXT DEFAULT '',
  last_read_page INTEGER DEFAULT 1,
  idempotency_key TEXT,
  date_added TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Settings Table (Singleton: id = 1)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_library_view TEXT CHECK(default_library_view IN ('grid', 'list')) NOT NULL DEFAULT 'grid',
  default_sort_order TEXT CHECK(default_sort_order IN ('recently-added', 'title', 'progress', 'rating')) NOT NULL DEFAULT 'recently-added',
  updated_at TEXT NOT NULL
);

-- Profile Table (Singleton: id = 1)
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL DEFAULT 'Ahmed Khaled',
  bio TEXT DEFAULT '',
  updated_at TEXT NOT NULL
);

-- App Metadata Table (tracks seed status, migrations, versions)
CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_created ON books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_rating ON books(rating);
