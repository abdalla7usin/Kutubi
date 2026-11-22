/**
 * Kutubi - Books Service
 * Handles full book CRUD operations, search, multi-factor filtering, sorting,
 * and reading progress business logic.
 */

const { getDb } = require('../db/database');
const { validateBookInput, validateProgressInput } = require('../utils/validation');
const { formatDate } = require('../utils/formatting');
const categoriesService = require('./categories.service');
const { cleanupPdfFiles } = require('./pdf.service');

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
        b.pdf_path AS pdfPath,
        b.pdf_filename AS pdfFilename,
        b.pdf_size AS pdfSize,
        b.pdf_page_count AS pdfPageCount,
        b.cover_image AS coverImage,
        b.last_read_page AS lastReadPage,
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
        b.pdf_path AS pdfPath,
        b.pdf_filename AS pdfFilename,
        b.pdf_size AS pdfSize,
        b.pdf_page_count AS pdfPageCount,
        b.cover_image AS coverImage,
        b.last_read_page AS lastReadPage,
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

    // Check for idempotency key to prevent accidental duplicate submissions
    const idempotencyKey = (normalized.idempotencyKey || '').trim();
    if (idempotencyKey) {
      const existing = db.prepare('SELECT id FROM books WHERE idempotency_key = ?').get(idempotencyKey);
      if (existing) {
        if (inputData.pdfPath) {
          cleanupPdfFiles(inputData.pdfPath, inputData.coverImage);
        }
        return {
          success: true,
          book: this.getBookById(existing.id, db),
          isDuplicatePrevented: true
        };
      }
    }

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

    let info;
    try {
      info = db.prepare(`
        INSERT INTO books (
          title, author, category_id, status, total_pages, current_page,
          cover_url, rating, description, pdf_path, pdf_filename, pdf_size,
          pdf_page_count, cover_image, last_read_page, idempotency_key, date_added, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        inputData.pdfPath || '',
        inputData.pdfFilename || '',
        inputData.pdfSize || 0,
        inputData.pdfPageCount || 0,
        inputData.coverImage || '',
        inputData.lastReadPage || 1,
        idempotencyKey || null,
        dateAdded,
        nowIso,
        nowIso
      );
    } catch (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' && idempotencyKey) {
        if (inputData.pdfPath) {
          cleanupPdfFiles(inputData.pdfPath, inputData.coverImage);
        }
        const existing = db.prepare('SELECT id FROM books WHERE idempotency_key = ?').get(idempotencyKey);
        if (existing) {
          return {
            success: true,
            book: this.getBookById(existing.id, db),
            isDuplicatePrevented: true
          };
        }
      }
      throw err;
    }

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

    // Handle PDF metadata updates
    let pdfPath = existing.pdfPath || '';
    let pdfFilename = existing.pdfFilename || '';
    let pdfSize = existing.pdfSize || 0;
    let pdfPageCount = existing.pdfPageCount || 0;
    let coverImage = existing.coverImage || '';
    let lastReadPage = existing.lastReadPage || 1;

    if (inputData.removePdf === true || inputData.removePdf === 'true' || inputData.removePdf === '1') {
      // User explicitly requested to remove attached PDF
      cleanupPdfFiles(existing.pdfPath, existing.coverImage);
      pdfPath = '';
      pdfFilename = '';
      pdfSize = 0;
      pdfPageCount = 0;
      coverImage = '';
      lastReadPage = 1;
    } else if (inputData.pdfPath) {
      // User uploaded a replacement PDF: clean up old files if different
      if (existing.pdfPath && existing.pdfPath !== inputData.pdfPath) {
        cleanupPdfFiles(existing.pdfPath, existing.coverImage);
      }
      pdfPath = inputData.pdfPath;
      pdfFilename = inputData.pdfFilename || '';
      pdfSize = inputData.pdfSize || 0;
      pdfPageCount = inputData.pdfPageCount || 0;
      coverImage = inputData.coverImage || '';
      lastReadPage = 1;
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
          pdf_path = ?,
          pdf_filename = ?,
          pdf_size = ?,
          pdf_page_count = ?,
          cover_image = ?,
          last_read_page = ?,
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
      pdfPath,
      pdfFilename,
      pdfSize,
      pdfPageCount,
      coverImage,
      lastReadPage,
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
   * Update the last opened page position for the in-app PDF reader
   * (Does not alter confirmed reading progress or status)
   * @param {number|string} id
   * @param {number|string} pageNum
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {{ success: boolean, lastReadPage?: number, notFound?: boolean, error?: string }}
   */
  updateReadPosition(id, pageNum, dbInstance) {
    const db = dbInstance || getDb();
    const book = this.getBookById(id, db);
    if (!book) {
      return { success: false, notFound: true, error: 'Book not found' };
    }

    const page = parseInt(pageNum, 10);
    if (isNaN(page) || page < 1) {
      return { success: false, error: 'Invalid page number' };
    }

    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE books
      SET last_read_page = ?,
          updated_at = ?
      WHERE id = ?
    `).run(page, nowIso, id);

    return { success: true, lastReadPage: page };
  }

  /**
   * Delete book by ID and clean up associated storage files
   * @param {number|string} id
   * @param {import('better-sqlite3').Database} [dbInstance]
   * @returns {{ success: boolean, notFound?: boolean }}
   */
  deleteBook(id, dbInstance) {
    const db = dbInstance || getDb();
    const book = this.getBookById(id, db);
    if (!book) {
      return { success: false, notFound: true };
    }

    const result = db.prepare('DELETE FROM books WHERE id = ?').run(id);
    if (result.changes === 0) {
      return { success: false, notFound: true };
    }

    // Safely remove associated PDF and generated cover thumbnail
    cleanupPdfFiles(book.pdfPath, book.coverImage);

    return { success: true };
  }
}

module.exports = new BooksService();
