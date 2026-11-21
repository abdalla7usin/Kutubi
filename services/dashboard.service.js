/**
 * Kutubi - Dashboard Service
 * Live calculated aggregations and queries for Dashboard screen
 */

const { getDb } = require('../db/database');
const { calculatePercentage } = require('../utils/formatting');

class DashboardService {
  /**
   * Get all live dashboard metrics and sections
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {object}
   */
  getDashboardData(dbInstance) {
    const db = dbInstance || getDb();

    // 1. Total counts
    const totalBooks = db.prepare('SELECT COUNT(*) AS total FROM books').get().total;
    const categoriesCount = db.prepare('SELECT COUNT(*) AS total FROM categories').get().total;

    // 2. Status breakdowns
    const statusCounts = db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM books
      GROUP BY status
    `).all();

    let reading = 0;
    let completed = 0;
    let toRead = 0;

    for (const row of statusCounts) {
      if (row.status === 'Reading') reading = row.count;
      else if (row.status === 'Completed') completed = row.count;
      else if (row.status === 'To Read') toRead = row.count;
    }

    const completedPercent = calculatePercentage(completed, totalBooks);

    // 3. Currently Reading (up to 3 books in progress)
    const currentlyReading = db.prepare(`
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
        b.created_at AS createdAt,
        b.updated_at AS updatedAt
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.status = 'Reading'
      ORDER BY b.updated_at DESC
      LIMIT 3
    `).all();

    // Attach calculated percentage to each currently reading book
    for (const book of currentlyReading) {
      book.progressPercent = calculatePercentage(book.currentPage, book.totalPages);
    }

    // 4. Recently Added (4 newest books)
    const recentlyAdded = db.prepare(`
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
        b.date_added AS dateAdded,
        b.created_at AS createdAt
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      ORDER BY b.created_at DESC
      LIMIT 4
    `).all();

    return {
      metrics: {
        totalBooks,
        categoriesCount,
        reading,
        completed,
        toRead,
        completedPercent
      },
      currentlyReading,
      recentlyAdded
    };
  }
}

module.exports = new DashboardService();
