/**
 * Kutubi - Books Service
 * Handles full book CRUD operations, search, multi-factor filtering, sorting,
 * and reading progress business logic.
 */

const { getDb } = require('../db/database');
const { validateBookInput, validateProgressInput } = require('../utils/validation');
const { formatDate } = require('../utils/formatting');
const categoriesService = require('./categories.service');

class BooksService {
  /**
   * Query books with dynamic search, status filtering, category filtering, and sorting
   * @param {object} [filters]
   * @param {string} [filters.search] - Partial match on title or author (English + Arabic)
   * @param {string} [filters.status] - 'All' | 'Reading' | 'Completed' | 'To Read'
   * @param {string|number} [filters.category] - Category ID or name or 'All'
   * @param {string} [filters.sort] - 'recently-added' | 'title' | 'progress' | 'rating'
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {Array<object>}
   */
  getBooks(filters = {}, dbInstance) {
    const db = dbInstance || getDb();
    let query = `
      SELECT 
        b.id,
        b.title,
        b.author,
        b.category_id AS categoryId,
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
      WHERE 1=1
    `;

    const params = [];

    // 1. Search (Title or Author, case-insensitive substring)
    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query += ` AND (b.title LIKE ? OR b.author LIKE ?)`;
      params.push(term, term);
    }

    // 2. Status Filter
    if (filters.status && filters.status !== 'All') {
      query += ` AND b.status = ?`;
      params.push(filters.status);
    }

    // 3. Category Filter (by Name or ID)
    if (filters.category && filters.category !== 'All') {
      const catNum = parseInt(filters.category, 10);
      if (!isNaN(catNum)) {
        query += ` AND b.category_id = ?`;
        params.push(catNum);
      } else {
        query += ` AND c.name = ? COLLATE NOCASE`;
        params.push(filters.category);
      }
    }

    // 4. Sorting (Whitelisted SQL Order By)
    const sort = filters.sort || 'recently-added';
    switch (sort) {
      case 'title':
        query += ` ORDER BY b.title COLLATE NOCASE ASC`;
        break;
      case 'progress':
        query += ` ORDER BY (CAST(b.current_page AS FLOAT) / b.total_pages) DESC, b.created_at DESC`;
        break;
      case 'rating':
        query += ` ORDER BY CASE WHEN b.rating IS NULL THEN 0 ELSE b.rating END DESC, b.created_at DESC`;
        break;
      case 'recently-added':
      default:
        query += ` ORDER BY b.created_at DESC`;
        break;
    }

    return db.prepare(query).all(...params);
  }

  /**
   * Get single book by ID
   * @param {number|string} id
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {object|null}
   */
  getBookById(id, dbInstance) {
    const db = dbInstance || getDb();
    const book = db.prepare(`
      SELECT 
        b.id,
        b.title,
        b.author,
        b.category_id AS categoryId,
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
      WHERE b.id = ?
    `).get(id);

    return book || null;
  }

  /**
   * Create a new book
   * @param {object} inputData
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {{ success: boolean, book?: object, errors?: Record<string, string> }}
   */
  createBook(inputData, dbInstance) {
    const db = dbInstance || getDb();
    const validation = validateBookInput(inputData);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const { normalized } = validation;

    // Resolve Category ID
    let categoryId = normalized.categoryId;
    if (!categoryId && inputData.category) {
      // Find category by name
      const foundCat = categoriesService.getCategoryByName(inputData.category, db);
      if (foundCat) {
        categoryId = foundCat.id;
      }
    }

    if (!categoryId) {
      // Fallback to Uncategorized
      const uncategorized = categoriesService.getUncategorizedCategory(db);
      categoryId = uncategorized.id;
    }

    // Auto-normalize reading status & current page
    let finalStatus = normalized.status;
    let finalCurrentPage = normalized.currentPage;
    const totalPages = normalized.totalPages;

    if (finalStatus === 'Completed') {
      finalCurrentPage = totalPages;
    } else if (finalCurrentPage >= totalPages) {
      finalStatus = 'Completed';
      finalCurrentPage = totalPages;
    } else if (finalCurrentPage > 0 && finalStatus === 'To Read') {
      finalStatus = 'Reading';
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const dateAdded = formatDate(now);

    const info = db.prepare(`
      INSERT INTO books (
        title, author, category_id, status, total_pages, current_page,
        cover_url, rating, description, date_added, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      normalized.title,
      normalized.author,
      categoryId,
      finalStatus,
      totalPages,
      finalCurrentPage,
      normalized.coverUrl || '',
      normalized.rating,
      normalized.description || '',
      dateAdded,
      nowIso,
      nowIso
    );

    const createdBook = this.getBookById(info.lastInsertRowid, db);
    return { success: true, book: createdBook };
  }

  /**
   * Update an existing book
   * @param {number|string} id
   * @param {object} inputData
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {{ success: boolean, book?: object, errors?: Record<string, string>, notFound?: boolean }}
   */
  updateBook(id, inputData, dbInstance) {
    const db = dbInstance || getDb();
    const existing = this.getBookById(id, db);
    if (!existing) {
      return { success: false, notFound: true };
    }

    const validation = validateBookInput(inputData);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const { normalized } = validation;

    // Resolve Category ID
    let categoryId = normalized.categoryId;
    if (!categoryId && inputData.category) {
      const foundCat = categoriesService.getCategoryByName(inputData.category, db);
      if (foundCat) categoryId = foundCat.id;
    }
    if (!categoryId) {
      categoryId = existing.categoryId;
    }

    // Auto-normalize reading status & current page
    let finalStatus = normalized.status;
    let finalCurrentPage = normalized.currentPage;
    const totalPages = normalized.totalPages;

    if (finalStatus === 'Completed') {
      finalCurrentPage = totalPages;
    } else if (finalCurrentPage >= totalPages) {
      finalStatus = 'Completed';
      finalCurrentPage = totalPages;
    } else if (finalCurrentPage > 0 && finalStatus === 'To Read') {
      finalStatus = 'Reading';
    }

    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE books
      SET title = ?,
          author = ?,
          category_id = ?,
          status = ?,
          total_pages = ?,
          current_page = ?,
          cover_url = ?,
          rating = ?,
          description = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      normalized.title,
      normalized.author,
      categoryId,
      finalStatus,
      totalPages,
      finalCurrentPage,
      normalized.coverUrl || '',
      normalized.rating,
      normalized.description || '',
      nowIso,
      id
    );

    const updatedBook = this.getBookById(id, db);
    return { success: true, book: updatedBook };
  }

  /**
   * Update reading progress for a book
   * Applies state transitions:
   * - currentPage === totalPages -> status = 'Completed'
   * - 0 < currentPage < totalPages -> status = 'Reading'
   * - currentPage === 0 -> status = 'To Read'
   * @param {number|string} id
   * @param {number|string} newPageInput
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {{ success: boolean, book?: object, error?: string, notFound?: boolean }}
   */
  updateProgress(id, newPageInput, dbInstance) {
    const db = dbInstance || getDb();
    const book = this.getBookById(id, db);
    if (!book) {
      return { success: false, notFound: true, error: 'Book not found.' };
    }

    const validation = validateProgressInput(newPageInput, book.totalPages);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const newPage = validation.currentPage;
    let newStatus = book.status;

    if (newPage === book.totalPages) {
      newStatus = 'Completed';
    } else if (newPage > 0) {
      newStatus = 'Reading';
    } else if (newPage === 0) {
      newStatus = 'To Read';
    }

    const nowIso = new Date().toISOString();

    db.prepare(`
      UPDATE books
      SET current_page = ?,
          status = ?,
          updated_at = ?
      WHERE id = ?
    `).run(newPage, newStatus, nowIso, id);

    const updatedBook = this.getBookById(id, db);
    return { success: true, book: updatedBook };
  }

  /**
   * Delete book by ID
   * @param {number|string} id
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {{ success: boolean, notFound?: boolean }}
   */
  deleteBook(id, dbInstance) {
    const db = dbInstance || getDb();
    const result = db.prepare('DELETE FROM books WHERE id = ?').run(id);
    if (result.changes === 0) {
      return { success: false, notFound: true };
    }
    return { success: true };
  }
}

module.exports = new BooksService();
