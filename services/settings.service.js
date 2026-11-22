/**
 * Kutubi - Settings Service
 * Handles preferences persistence and JSON library backups.
 * Fully dual-mode: synchronous with SQLiteAdapter, asynchronous with TursoAdapter.
 */

const { getDb } = require('../db/database');

class SettingsService {
  /**
   * Get application settings
   */
  getSettings(dbInstance) {
    const db = dbInstance || getDb();
    const sql = `
      SELECT default_library_view AS defaultLibraryView, default_sort_order AS defaultSortOrder, updated_at AS updatedAt
      FROM settings
      WHERE id = 1
    `;

    if (db.isAsync) {
      return (async () => {
        let settings = await db.queryOne(sql);
        if (!settings) {
          const now = new Date().toISOString();
          await db.execute(`
            INSERT INTO settings (id, default_library_view, default_sort_order, updated_at)
            VALUES (1, 'grid', 'recently-added', ?)
          `, [now]);
          settings = { defaultLibraryView: 'grid', defaultSortOrder: 'recently-added', updatedAt: now };
        }
        return settings;
      })();
    }

    let settings = db.prepare(sql).get();
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
   */
  updateSettings(updates, dbInstance) {
    const db = dbInstance || getDb();
    const allowedViews = ['grid', 'list'];
    const allowedSorts = ['recently-added', 'title', 'progress', 'rating'];
    const now = new Date().toISOString();

    if (db.isAsync) {
      return (async () => {
        const current = await this.getSettings(db);
        const newView = allowedViews.includes(updates.defaultLibraryView)
          ? updates.defaultLibraryView
          : current.defaultLibraryView;
        const newSort = allowedSorts.includes(updates.defaultSortOrder)
          ? updates.defaultSortOrder
          : current.defaultSortOrder;

        await db.execute(`
          UPDATE settings
          SET default_library_view = ?,
              default_sort_order = ?,
              updated_at = ?
          WHERE id = 1
        `, [newView, newSort, now]);

        return await this.getSettings(db);
      })();
    }

    const current = this.getSettings(db);
    const newView = allowedViews.includes(updates.defaultLibraryView)
      ? updates.defaultLibraryView
      : current.defaultLibraryView;
    const newSort = allowedSorts.includes(updates.defaultSortOrder)
      ? updates.defaultSortOrder
      : current.defaultSortOrder;

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
   */
  exportLibraryJson(dbInstance) {
    const db = dbInstance || getDb();

    if (db.isAsync) {
      return (async () => {
        const profile = (await db.queryOne('SELECT display_name AS displayName, bio FROM profile WHERE id = 1')) || {};
        const settings = await this.getSettings(db);
        const categories = await db.queryAll('SELECT id, name, is_system AS isSystem FROM categories ORDER BY id ASC');
        const books = await db.queryAll(`
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
        `);

        return {
          app: 'Kutubi',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          profile,
          settings,
          categories,
          books
        };
      })();
    }

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
