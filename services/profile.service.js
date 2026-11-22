/**
 * Kutubi - Profile Service
 * Manages user profile information and calculates reading milestone statistics.
 * Fully dual-mode: synchronous with SQLiteAdapter, asynchronous with TursoAdapter.
 */

const { getDb } = require('../db/database');
const { getInitials } = require('../utils/formatting');

class ProfileService {
  /**
   * Get user profile
   */
  getProfile(dbInstance) {
    const db = dbInstance || getDb();
    const sql = `
      SELECT display_name AS displayName, bio, updated_at AS updatedAt
      FROM profile
      WHERE id = 1
    `;

    if (db.isAsync) {
      return (async () => {
        let profile = await db.queryOne(sql);
        if (!profile) {
          const now = new Date().toISOString();
          await db.execute(`
            INSERT INTO profile (id, display_name, bio, updated_at)
            VALUES (1, 'Ahmed Khaled', 'Software Engineering student reading 20 books in 2026', ?)
          `, [now]);
          profile = {
            displayName: 'Ahmed Khaled',
            bio: 'Software Engineering student reading 20 books in 2026',
            updatedAt: now
          };
        }
        profile.initials = getInitials(profile.displayName);
        return profile;
      })();
    }

    let profile = db.prepare(sql).get();
    if (!profile) {
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO profile (id, display_name, bio, updated_at)
        VALUES (1, 'Ahmed Khaled', 'Software Engineering student reading 20 books in 2026', ?)
      `).run(now);
      profile = {
        displayName: 'Ahmed Khaled',
        bio: 'Software Engineering student reading 20 books in 2026',
        updatedAt: now
      };
    }

    profile.initials = getInitials(profile.displayName);
    return profile;
  }

  /**
   * Update profile
   */
  updateProfile(input, dbInstance) {
    const db = dbInstance || getDb();
    const displayName = (input.displayName || '').trim();
    if (!displayName) {
      return { success: false, error: 'Display Name is required.' };
    }
    if (displayName.length > 100) {
      return { success: false, error: 'Display Name cannot exceed 100 characters.' };
    }

    const bio = (input.bio || '').trim();
    const now = new Date().toISOString();

    if (db.isAsync) {
      return (async () => {
        await db.execute(`
          UPDATE profile
          SET display_name = ?, bio = ?, updated_at = ?
          WHERE id = 1
        `, [displayName, bio, now]);
        const updated = await this.getProfile(db);
        return { success: true, profile: updated };
      })();
    }

    db.prepare(`
      UPDATE profile
      SET display_name = ?, bio = ?, updated_at = ?
      WHERE id = 1
    `).run(displayName, bio, now);

    return { success: true, profile: this.getProfile(db) };
  }

  /**
   * Calculate profile milestone statistics
   */
  getProfileStats(dbInstance) {
    const db = dbInstance || getDb();

    if (db.isAsync) {
      return (async () => {
        const completedRes = await db.queryOne(`
          SELECT COUNT(*) AS total
          FROM books
          WHERE status = 'Completed'
        `);
        const completedCount = completedRes ? completedRes.total : 0;

        const pagesRes = await db.queryOne(`
          SELECT COALESCE(SUM(current_page), 0) AS totalPages
          FROM books
        `);
        const totalPagesRead = pagesRes ? pagesRes.totalPages : 0;

        const favCatRow = await db.queryOne(`
          SELECT c.name, COUNT(b.id) AS book_count
          FROM categories c
          JOIN books b ON b.category_id = c.id
          GROUP BY c.id
          ORDER BY book_count DESC, c.name ASC
          LIMIT 1
        `);
        const favoriteCategory = favCatRow ? favCatRow.name : 'None';

        const profile = await this.getProfile(db);

        return {
          profile,
          stats: {
            completedBooks: completedCount,
            totalPagesRead,
            favoriteCategory
          }
        };
      })();
    }

    const completedCount = db.prepare(`
      SELECT COUNT(*) AS total
      FROM books
      WHERE status = 'Completed'
    `).get().total;

    const pagesResult = db.prepare(`
      SELECT COALESCE(SUM(current_page), 0) AS totalPages
      FROM books
    `).get();
    const totalPagesRead = pagesResult.totalPages;

    const favCatRow = db.prepare(`
      SELECT c.name, COUNT(b.id) AS book_count
      FROM categories c
      JOIN books b ON b.category_id = c.id
      GROUP BY c.id
      ORDER BY book_count DESC, c.name ASC
      LIMIT 1
    `).get();

    const favoriteCategory = favCatRow ? favCatRow.name : 'None';
    const profile = this.getProfile(db);

    return {
      profile,
      stats: {
        completedBooks: completedCount,
        totalPagesRead,
        favoriteCategory
      }
    };
  }
}

module.exports = new ProfileService();
