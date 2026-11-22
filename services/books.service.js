/**
 * Kutubi - Books Service
 * Comprehensive CRUD, Search, Filtering, Sorting, and Reading Progress Logic.
 * Fully dual-mode: synchronous with SQLiteAdapter, asynchronous with TursoAdapter.
 */

const { getDb } = require('../db/database');
const { validateBookInput, validateProgressInput } = require('../utils/validation');
const { formatDate } = require('../utils/formatting');
const categoriesService = require('./categories.service');
const { cleanupPdfFiles } = require('./pdf.service');

class BooksService {
  /**
   * Build SELECT query for books with category join
   */
  _buildBookQuery(filters = {}) {
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
        b.idempotency_key AS idempotencyKey,
        b.date_added AS dateAdded,
        b.created_at AS createdAt,
        b.updated_at AS updatedAt
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE 1=1
    `;

    const params = [];

    // Search filter (Title or Author - case-insensitive substring match)
    if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
      const searchTerm = `%${filters.search.trim()}%`;
      query += ` AND (b.title LIKE ? OR b.author LIKE ?)`;
      params.push(searchTerm, searchTerm);
    }

    // Status filter
    if (filters.status && filters.status !== 'All') {
      query += ` AND b.status = ?`;
      params.push(filters.status);
    }

    // Category filter
    if (filters.category && filters.category !== 'All') {
      query += ` AND c.name = ?`;
      params.push(filters.category);
    }

    // Sorting
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

    return { query, params };
  }

  /**
   * Get all books with optional filtering, search, and sorting
   */
  getBooks(filters = {}, dbInstance) {
    const db = dbInstance || getDb();
    const { query, params } = this._buildBookQuery(filters);

    if (db.isAsync) {
      return (async () => {
        return await db.queryAll(query, params);
      })();
    }

    return db.prepare(query).all(...params);
  }

  /**
   * Get single book by ID
   */
  getBookById(id, dbInstance) {
    const db = dbInstance || getDb();
    const sql = `
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
    `;

    if (db.isAsync) {
      return (async () => {
        const book = await db.queryOne(sql, [id]);
        return book || null;
      })();
    }

    const book = db.prepare(sql).get(id);
    return book || null;
  }

  /**
   * Create a new book
   */
  createBook(inputData, dbInstance) {
    const db = dbInstance || getDb();
    const validation = validateBookInput(inputData);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const { normalized } = validation;
    const idempotencyKey = (normalized.idempotencyKey || '').trim();

    if (db.isAsync) {
      return (async () => {
        if (idempotencyKey) {
          const existing = await db.queryOne('SELECT id FROM books WHERE idempotency_key = ?', [idempotencyKey]);
          if (existing) {
            if (inputData.pdfPath) {
              cleanupPdfFiles(inputData.pdfPath, inputData.coverImage);
            }
            return {
              success: true,
              book: await this.getBookById(existing.id, db),
              isDuplicatePrevented: true
            };
          }
        }

        let categoryId = normalized.categoryId;
        if (!categoryId && inputData.category) {
          const foundCat = await categoriesService.getCategoryByName(inputData.category, db);
          if (foundCat) categoryId = foundCat.id;
        }

        if (!categoryId) {
          const uncategorized = await categoriesService.getUncategorizedCategory(db);
          categoryId = uncategorized.id;
        }

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
          info = await db.execute(`
            INSERT INTO books (
              title, author, category_id, status, total_pages, current_page,
              cover_url, rating, description, pdf_path, pdf_filename, pdf_size,
              pdf_page_count, cover_image, last_read_page, idempotency_key, date_added, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
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
          ]);
        } catch (err) {
          if ((err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE'))) && idempotencyKey) {
            if (inputData.pdfPath) {
              cleanupPdfFiles(inputData.pdfPath, inputData.coverImage);
            }
            const existing = await db.queryOne('SELECT id FROM books WHERE idempotency_key = ?', [idempotencyKey]);
            if (existing) {
              return {
                success: true,
                book: await this.getBookById(existing.id, db),
                isDuplicatePrevented: true
              };
            }
          }
          throw err;
        }

        const createdBook = await this.getBookById(info.lastInsertRowid, db);
        return { success: true, book: createdBook };
      })();
    }

    // Synchronous execution for better-sqlite3 / test suite
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

    let categoryId = normalized.categoryId;
    if (!categoryId && inputData.category) {
      const foundCat = categoriesService.getCategoryByName(inputData.category, db);
      if (foundCat) categoryId = foundCat.id;
    }

    if (!categoryId) {
      const uncategorized = categoriesService.getUncategorizedCategory(db);
      categoryId = uncategorized.id;
    }

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
   */
  updateBook(id, inputData, dbInstance) {
    const db = dbInstance || getDb();

    if (db.isAsync) {
      return (async () => {
        const existing = await this.getBookById(id, db);
        if (!existing) {
          return { success: false, notFound: true };
        }

        const validation = validateBookInput(inputData);
        if (!validation.isValid) {
          return { success: false, errors: validation.errors };
        }

        const { normalized } = validation;

        let categoryId = normalized.categoryId;
        if (!categoryId && inputData.category) {
          const foundCat = await categoriesService.getCategoryByName(inputData.category, db);
          if (foundCat) categoryId = foundCat.id;
        }
        if (!categoryId) {
          categoryId = existing.categoryId;
        }

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

        let pdfPath = existing.pdfPath || '';
        let pdfFilename = existing.pdfFilename || '';
        let pdfSize = existing.pdfSize || 0;
        let pdfPageCount = existing.pdfPageCount || 0;
        let coverImage = existing.coverImage || '';
        let lastReadPage = existing.lastReadPage || 1;

        if (inputData.removePdf === true || inputData.removePdf === 'true' || inputData.removePdf === '1') {
          cleanupPdfFiles(existing.pdfPath, existing.coverImage);
          pdfPath = '';
          pdfFilename = '';
          pdfSize = 0;
          pdfPageCount = 0;
          coverImage = '';
          lastReadPage = 1;
        } else if (inputData.pdfPath) {
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

        await db.execute(`
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
        `, [
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
        ]);

        const updatedBook = await this.getBookById(id, db);
        return { success: true, book: updatedBook };
      })();
    }

    // Synchronous execution for better-sqlite3 / test suite
    const existing = this.getBookById(id, db);
    if (!existing) {
      return { success: false, notFound: true };
    }

    const validation = validateBookInput(inputData);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    const { normalized } = validation;

    let categoryId = normalized.categoryId;
    if (!categoryId && inputData.category) {
      const foundCat = categoriesService.getCategoryByName(inputData.category, db);
      if (foundCat) categoryId = foundCat.id;
    }
    if (!categoryId) {
      categoryId = existing.categoryId;
    }

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

    let pdfPath = existing.pdfPath || '';
    let pdfFilename = existing.pdfFilename || '';
    let pdfSize = existing.pdfSize || 0;
    let pdfPageCount = existing.pdfPageCount || 0;
    let coverImage = existing.coverImage || '';
    let lastReadPage = existing.lastReadPage || 1;

    if (inputData.removePdf === true || inputData.removePdf === 'true' || inputData.removePdf === '1') {
      cleanupPdfFiles(existing.pdfPath, existing.coverImage);
      pdfPath = '';
      pdfFilename = '';
      pdfSize = 0;
      pdfPageCount = 0;
      coverImage = '';
      lastReadPage = 1;
    } else if (inputData.pdfPath) {
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
   */
  updateProgress(id, newPageInput, dbInstance) {
    const db = dbInstance || getDb();

    if (db.isAsync) {
      return (async () => {
        const book = await this.getBookById(id, db);
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

        await db.execute(`
          UPDATE books
          SET current_page = ?,
              status = ?,
              updated_at = ?
          WHERE id = ?
        `, [newPage, newStatus, nowIso, id]);

        const updatedBook = await this.getBookById(id, db);
        return { success: true, book: updatedBook };
      })();
    }

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
   */
  updateReadPosition(id, pageNum, dbInstance) {
    const db = dbInstance || getDb();

    if (db.isAsync) {
      return (async () => {
        const book = await this.getBookById(id, db);
        if (!book) {
          return { success: false, notFound: true, error: 'Book not found' };
        }

        const page = parseInt(pageNum, 10);
        if (isNaN(page) || page < 1) {
          return { success: false, error: 'Invalid page number' };
        }

        const nowIso = new Date().toISOString();
        await db.execute(`
          UPDATE books
          SET last_read_page = ?,
              updated_at = ?
          WHERE id = ?
        `, [page, nowIso, id]);

        return { success: true, lastReadPage: page };
      })();
    }

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
   */
  deleteBook(id, dbInstance) {
    const db = dbInstance || getDb();

    if (db.isAsync) {
      return (async () => {
        const book = await this.getBookById(id, db);
        if (!book) {
          return { success: false, notFound: true };
        }

        const result = await db.execute('DELETE FROM books WHERE id = ?', [id]);
        if (result.rowsAffected === 0) {
          return { success: false, notFound: true };
        }

        cleanupPdfFiles(book.pdfPath, book.coverImage);
        return { success: true };
      })();
    }

    const book = this.getBookById(id, db);
    if (!book) {
      return { success: false, notFound: true };
    }

    const result = db.prepare('DELETE FROM books WHERE id = ?').run(id);
    if (result.changes === 0) {
      return { success: false, notFound: true };
    }

    cleanupPdfFiles(book.pdfPath, book.coverImage);
    return { success: true };
  }
}

module.exports = new BooksService();
