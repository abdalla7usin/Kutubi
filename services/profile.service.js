/**
 * Kutubi - Profile Service
 * Manages user profile information and calculates reading milestone statistics
 */

const { getDb } = require('../db/database');
const { getInitials } = require('../utils/formatting');

class ProfileService {
  /**
   * Get user profile
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {object}
   */
  getProfile(dbInstance) {
    const db = dbInstance || getDb();
    let profile = db.prepare(`
      SELECT display_name AS displayName, bio, updated_at AS updatedAt
      FROM profile
      WHERE id = 1
    `).get();

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
   * @param {object} input
   * @param {string} input.displayName
   * @param {string} [input.bio]
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {{ success: boolean, profile?: object, error?: string }}
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

    db.prepare(`
      UPDATE profile
      SET display_name = ?, bio = ?, updated_at = ?
      WHERE id = 1
    `).run(displayName, bio, now);

    return { success: true, profile: this.getProfile(db) };
  }

  /**
   * Calculate profile milestone statistics
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {object}
   */
  getProfileStats(dbInstance) {
    const db = dbInstance || getDb();

    // 1. Completed books count
    const completedCount = db.prepare(`
      SELECT COUNT(*) AS total
      FROM books
      WHERE status = 'Completed'
    `).get().total;

    // 2. Total pages read (sum of current_page)
    const pagesResult = db.prepare(`
      SELECT COALESCE(SUM(current_page), 0) AS totalPages
      FROM books
    `).get();
    const totalPagesRead = pagesResult.totalPages;

    // 3. Favorite category (category with highest book count)
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
