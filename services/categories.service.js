/**
 * Kutubi - Categories Service
 * Handles category CRUD, system category protection, and safe reassignment of books
 */

const { getDb } = require('../db/database');
const { validateCategoryName } = require('../utils/validation');

class CategoriesService {
  /**
   * Get all categories with dynamic count of books in each
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {Array<object>}
   */
  getAllCategories(dbInstance) {
    const db = dbInstance || getDb();
    return db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.is_system AS isSystem,
        c.created_at,
        c.updated_at,
        COUNT(b.id) AS bookCount
      FROM categories c
      LEFT JOIN books b ON b.category_id = c.id
      GROUP BY c.id
      ORDER BY c.is_system ASC, c.name ASC
    `).all();
  }

  /**
   * Get category by ID
   * @param {number|string} id
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {object|null}
   */
  getCategoryById(id, dbInstance) {
    const db = dbInstance || getDb();
    const cat = db.prepare(`
      SELECT id, name, is_system AS isSystem, created_at, updated_at
      FROM categories
      WHERE id = ?
    `).get(id);
    return cat || null;
  }

  /**
   * Get category by Name (case-insensitive)
   * @param {string} name
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {object|null}
   */
  getCategoryByName(name, dbInstance) {
    const db = dbInstance || getDb();
    const cat = db.prepare(`
      SELECT id, name, is_system AS isSystem, created_at, updated_at
      FROM categories
      WHERE name = ? COLLATE NOCASE
    `).get(name);
    return cat || null;
  }

  /**
   * Get the system 'Uncategorized' category
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {object}
   */
  getUncategorizedCategory(dbInstance) {
    const db = dbInstance || getDb();
    let cat = db.prepare("SELECT id, name, is_system AS isSystem FROM categories WHERE name = 'Uncategorized'").get();
    if (!cat) {
      // Self-heal: ensure Uncategorized always exists
      const now = new Date().toISOString();
      const info = db.prepare(`
        INSERT INTO categories (name, is_system, created_at, updated_at)
        VALUES ('Uncategorized', 1, ?, ?)
      `).run(now, now);
      cat = { id: info.lastInsertRowid, name: 'Uncategorized', isSystem: 1 };
    }
    return cat;
  }

  /**
   * Create a new custom category
   * @param {string} name
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {{ success: boolean, category?: object, error?: string }}
   */
  createCategory(name, dbInstance) {
    const db = dbInstance || getDb();
    const validation = validateCategoryName(name);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const existing = this.getCategoryByName(validation.name, db);
    if (existing) {
      return { success: false, error: `Category '${validation.name}' already exists.` };
    }

    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO categories (name, is_system, created_at, updated_at)
      VALUES (?, 0, ?, ?)
    `).run(validation.name, now, now);

    const newCategory = this.getCategoryById(info.lastInsertRowid, db);
    return { success: true, category: newCategory };
  }

  /**
   * Rename an existing custom category
   * @param {number|string} id
   * @param {string} newName
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {{ success: boolean, error?: string }}
   */
  renameCategory(id, newName, dbInstance) {
    const db = dbInstance || getDb();
    const cat = this.getCategoryById(id, db);
    if (!cat) {
      return { success: false, error: 'Category not found.' };
    }

    if (cat.isSystem) {
      return { success: false, error: 'The system default category cannot be renamed.' };
    }

    const validation = validateCategoryName(newName);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const existing = this.getCategoryByName(validation.name, db);
    if (existing && existing.id !== Number(id)) {
      return { success: false, error: `Category '${validation.name}' already exists.` };
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE categories
      SET name = ?, updated_at = ?
      WHERE id = ?
    `).run(validation.name, now, id);

    return { success: true };
  }

  /**
   * Safely delete a category:
   * Reassigns all associated books to 'Uncategorized' inside a single transaction.
   * Protects the system 'Uncategorized' category.
   * @param {number|string} id
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {{ success: boolean, reassignedCount?: number, error?: string }}
   */
  deleteCategory(id, dbInstance) {
    const db = dbInstance || getDb();
    const cat = this.getCategoryById(id, db);
    if (!cat) {
      return { success: false, error: 'Category not found.' };
    }

    if (cat.isSystem) {
      return { success: false, error: 'The system default category cannot be deleted.' };
    }

    const uncategorized = this.getUncategorizedCategory(db);

    const deleteTx = db.transaction(() => {
      // 1. Reassign books to Uncategorized
      const reassignResult = db.prepare(`
        UPDATE books
        SET category_id = ?, updated_at = ?
        WHERE category_id = ?
      `).run(uncategorized.id, new Date().toISOString(), id);

      // 2. Delete custom category
      db.prepare('DELETE FROM categories WHERE id = ?').run(id);

      return reassignResult.changes;
    });

    const reassignedCount = deleteTx();
    return { success: true, reassignedCount };
  }
}

module.exports = new CategoriesService();
