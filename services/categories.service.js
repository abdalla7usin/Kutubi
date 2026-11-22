/**
 * Kutubi - Categories Service
 * Handles category CRUD, system category protection, and safe reassignment of books.
 * Fully dual-mode: synchronous with SQLiteAdapter, asynchronous with TursoAdapter.
 */

const { getDb } = require('../db/database');
const { validateCategoryName } = require('../utils/validation');

class CategoriesService {
  /**
   * Get all categories with dynamic count of books in each
   */
  getAllCategories(dbInstance) {
    const db = dbInstance || getDb();
    const sql = `
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
    `;

    if (db.isAsync) {
      return (async () => {
        return await db.queryAll(sql);
      })();
    }

    return db.prepare(sql).all();
  }

  /**
   * Get category by ID
   */
  getCategoryById(id, dbInstance) {
    const db = dbInstance || getDb();
    const sql = `
      SELECT id, name, is_system AS isSystem, created_at, updated_at
      FROM categories
      WHERE id = ?
    `;

    if (db.isAsync) {
      return (async () => {
        return await db.queryOne(sql, [id]);
      })();
    }

    const cat = db.prepare(sql).get(id);
    return cat || null;
  }

  /**
   * Get category by Name (case-insensitive)
   */
  getCategoryByName(name, dbInstance) {
    const db = dbInstance || getDb();
    const sql = `
      SELECT id, name, is_system AS isSystem, created_at, updated_at
      FROM categories
      WHERE name = ? COLLATE NOCASE
    `;

    if (db.isAsync) {
      return (async () => {
        return await db.queryOne(sql, [name]);
      })();
    }

    const cat = db.prepare(sql).get(name);
    return cat || null;
  }

  /**
   * Get the system 'Uncategorized' category
   */
  getUncategorizedCategory(dbInstance) {
    const db = dbInstance || getDb();
    const querySql = "SELECT id, name, is_system AS isSystem FROM categories WHERE name = 'Uncategorized'";

    if (db.isAsync) {
      return (async () => {
        let cat = await db.queryOne(querySql);
        if (!cat) {
          const now = new Date().toISOString();
          const info = await db.execute(`
            INSERT INTO categories (name, is_system, created_at, updated_at)
            VALUES ('Uncategorized', 1, ?, ?)
          `, [now, now]);
          cat = { id: info.lastInsertRowid, name: 'Uncategorized', isSystem: 1 };
        }
        return cat;
      })();
    }

    let cat = db.prepare(querySql).get();
    if (!cat) {
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
   */
  createCategory(name, dbInstance) {
    const db = dbInstance || getDb();
    const validation = validateCategoryName(name);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    if (db.isAsync) {
      return (async () => {
        const existing = await this.getCategoryByName(validation.name, db);
        if (existing) {
          return { success: false, error: `Category '${validation.name}' already exists.` };
        }

        const now = new Date().toISOString();
        const info = await db.execute(`
          INSERT INTO categories (name, is_system, created_at, updated_at)
          VALUES (?, 0, ?, ?)
        `, [validation.name, now, now]);

        const newCategory = await this.getCategoryById(info.lastInsertRowid, db);
        return { success: true, category: newCategory };
      })();
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
   */
  renameCategory(id, newName, dbInstance) {
    const db = dbInstance || getDb();
    const validation = validateCategoryName(newName);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    if (db.isAsync) {
      return (async () => {
        const cat = await this.getCategoryById(id, db);
        if (!cat) {
          return { success: false, error: 'Category not found.' };
        }
        if (cat.isSystem) {
          return { success: false, error: 'The system default category cannot be renamed.' };
        }

        const existing = await this.getCategoryByName(validation.name, db);
        if (existing && Number(existing.id) !== Number(id)) {
          return { success: false, error: `Category '${validation.name}' already exists.` };
        }

        const now = new Date().toISOString();
        await db.execute(`
          UPDATE categories
          SET name = ?, updated_at = ?
          WHERE id = ?
        `, [validation.name, now, id]);

        return { success: true };
      })();
    }

    const cat = this.getCategoryById(id, db);
    if (!cat) {
      return { success: false, error: 'Category not found.' };
    }
    if (cat.isSystem) {
      return { success: false, error: 'The system default category cannot be renamed.' };
    }

    const existing = this.getCategoryByName(validation.name, db);
    if (existing && Number(existing.id) !== Number(id)) {
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
   */
  deleteCategory(id, dbInstance) {
    const db = dbInstance || getDb();

    if (db.isAsync) {
      return (async () => {
        const cat = await this.getCategoryById(id, db);
        if (!cat) {
          return { success: false, error: 'Category not found.' };
        }
        if (cat.isSystem) {
          return { success: false, error: 'The system default category cannot be deleted.' };
        }

        const uncategorized = await this.getUncategorizedCategory(db);
        const now = new Date().toISOString();

        // Atomic batch reassign and delete
        const results = await db.batch([
          {
            sql: 'UPDATE books SET category_id = ?, updated_at = ? WHERE category_id = ?',
            args: [uncategorized.id, now, id]
          },
          {
            sql: 'DELETE FROM categories WHERE id = ?',
            args: [id]
          }
        ]);

        return { success: true, reassignedCount: results[0].rowsAffected };
      })();
    }

    const cat = this.getCategoryById(id, db);
    if (!cat) {
      return { success: false, error: 'Category not found.' };
    }
    if (cat.isSystem) {
      return { success: false, error: 'The system default category cannot be deleted.' };
    }

    const uncategorized = this.getUncategorizedCategory(db);

    const deleteTx = db.transaction(() => {
      const reassignResult = db.prepare(`
        UPDATE books
        SET category_id = ?, updated_at = ?
        WHERE category_id = ?
      `).run(uncategorized.id, new Date().toISOString(), id);

      db.prepare('DELETE FROM categories WHERE id = ?').run(id);
      return reassignResult.changes;
    });

    const reassignedCount = deleteTx();
    return { success: true, reassignedCount };
  }
}

module.exports = new CategoriesService();
