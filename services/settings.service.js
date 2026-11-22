/**
 * Kutubi - Settings Service
 * Handles preferences persistence and JSON library backups
 */

const { getDb } = require('../db/database');

class SettingsService {
  /**
   * Get application settings
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {object}
   */
  getSettings(dbInstance) {
    const db = dbInstance || getDb();
    let settings = db.prepare(`
      SELECT default_library_view AS defaultLibraryView, default_sort_order AS defaultSortOrder, updated_at AS updatedAt
      FROM settings
      WHERE id = 1
    `).get();

    if (!settings) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO settings (id, default_library_view, default_sort_order, updated_at)
        VALUES (1, 'grid', 'recently-added', ?)
      `).run(now);
      settings = { defaultLibraryView: 'grid', defaultSortOrder: 'recently-added', updatedAt: now };
    }

    return settings;
  }

  /**
   * Update preferences
   * @param {object} updates
   * @param {string} [updates.defaultLibraryView] - 'grid' | 'list'
   * @param {string} [updates.defaultSortOrder] - 'recently-added' | 'title' | 'progress' | 'rating'
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {object}
   */
  updateSettings(updates, dbInstance) {
    const db = dbInstance || getDb();
    const current = this.getSettings(db);

    const allowedViews = ['grid', 'list'];
    const allowedSorts = ['recently-added', 'title', 'progress', 'rating'];

    const newView = allowedViews.includes(updates.defaultLibraryView)
      ? updates.defaultLibraryView
      : current.defaultLibraryView;

    const newSort = allowedSorts.includes(updates.defaultSortOrder)
      ? updates.defaultSortOrder
      : current.defaultSortOrder;

    const now = new Date().toISOString();

    db.prepare(`
      UPDATE settings
      SET default_library_view = ?,
          default_sort_order = ?,
          updated_at = ?
      WHERE id = 1
    `).run(newView, newSort, now);

    return this.getSettings(db);
  }

  /**
   * Export complete library as a JSON backup object
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {object}
   */
  exportLibraryJson(dbInstance) {
    const db = dbInstance || getDb();

    const profile = db.prepare('SELECT display_name AS displayName, bio FROM profile WHERE id = 1').get() || {};
    const settings = this.getSettings(db);
    const categories = db.prepare('SELECT id, name, is_system AS isSystem FROM categories ORDER BY id ASC').all();
    const books = db.prepare(`
      SELECT 
        b.id,
        b.title,
        b.author,
        c.name AS category,
        b.status,
        b.total_pages AS totalPages,
        b.current_page AS currentPage,
        b.cover_url AS coverUrl,
        b.rating,
        b.description,
        b.date_added AS dateAdded,
        b.created_at AS createdAt
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      ORDER BY b.id ASC
    `).all();

    return {
      app: 'Kutubi',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profile,
      settings,
      categories,
      books
    };
  }
}

module.exports = new SettingsService();
