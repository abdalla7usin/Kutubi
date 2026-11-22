/**
 * Kutubi - Dashboard Service
 * Live calculated aggregations and queries for Dashboard screen.
 * Fully dual-mode: synchronous with SQLiteAdapter, asynchronous with TursoAdapter.
 */

const { getDb } = require('../db/database');
const { calculatePercentage } = require('../utils/formatting');

class DashboardService {
  /**
   * Get all live dashboard metrics and sections
   */
  getDashboardData(dbInstance) {
    const db = dbInstance || getDb();

    if (db.isAsync) {
      return (async () => {
        const totalBooksRes = await db.queryOne('SELECT COUNT(*) AS total FROM books');
        const totalBooks = totalBooksRes ? totalBooksRes.total : 0;

        const categoriesCountRes = await db.queryOne('SELECT COUNT(*) AS total FROM categories');
        const categoriesCount = categoriesCountRes ? categoriesCountRes.total : 0;

        const statusCounts = await db.queryAll(`
          SELECT status, COUNT(*) AS count
          FROM books
          GROUP BY status
        `);

        let reading = 0;
        let completed = 0;
        let toRead = 0;

        for (const row of statusCounts) {
          if (row.status === 'Reading') reading = row.count;
          else if (row.status === 'Completed') completed = row.count;
          else if (row.status === 'To Read') toRead = row.count;
        }

        const completedPercent = calculatePercentage(completed, totalBooks);

        const currentlyReading = await db.queryAll(`
          SELECT 
            b.id,
            b.title,
            b.author,
            c.name AS category,
            b.status,
            b.total_pages AS totalPages,
            b.current_page AS currentPage,
            b.cover_url AS coverUrl,
            b.cover_image AS coverImage,
            b.pdf_path AS pdfPath,
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
        `);

        for (const book of currentlyReading) {
          book.progressPercent = calculatePercentage(book.currentPage, book.totalPages);
        }

        const recentlyAdded = await db.queryAll(`
          SELECT 
            b.id,
            b.title,
            b.author,
            c.name AS category,
            b.status,
            b.total_pages AS totalPages,
            b.current_page AS currentPage,
            b.cover_url AS coverUrl,
            b.cover_image AS coverImage,
            b.pdf_path AS pdfPath,
            b.rating,
            b.date_added AS dateAdded,
            b.created_at AS createdAt
          FROM books b
          LEFT JOIN categories c ON b.category_id = c.id
          ORDER BY b.created_at DESC
          LIMIT 4
        `);

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
      })();
    }

    // Synchronous execution for better-sqlite3 / test suite
    const totalBooks = db.prepare('SELECT COUNT(*) AS total FROM books').get().total;
    const categoriesCount = db.prepare('SELECT COUNT(*) AS total FROM categories').get().total;

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
        b.cover_image AS coverImage,
        b.pdf_path AS pdfPath,
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

    for (const book of currentlyReading) {
      book.progressPercent = calculatePercentage(book.currentPage, book.totalPages);
    }

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
        b.cover_image AS coverImage,
        b.pdf_path AS pdfPath,
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
