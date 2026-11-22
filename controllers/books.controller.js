/**
 * Kutubi - Books Controller
 * Manages book CRUD, reading progress, and in-app PDF reader integration
 */

const fs = require('fs');
const booksService = require('../services/books.service');
const categoriesService = require('../services/categories.service');
const pdfService = require('../services/pdf.service');
const { calculatePercentage } = require('../utils/formatting');

function getNewBookForm(req, res, next) {
  try {
    const categories = categoriesService.getAllCategories();
    res.render('pages/book-form', {
      title: 'Add Book',
      activeNav: 'library',
      isEdit: false,
      book: null,
      categories,
      errors: {},
      formData: {},
      toast: req.query.toast,
      error: req.query.error
    });
  } catch (err) {
    next(err);
  }
}

async function createBook(req, res, next) {
  try {
    const categories = categoriesService.getAllCategories();

    // 1. Check for upload error (from multer)
    if (req.uploadError) {
      return res.status(400).render('pages/book-form', {
        title: 'Add Book',
        activeNav: 'library',
        isEdit: false,
        book: null,
        categories,
        errors: { pdfFile: req.uploadError },
        formData: req.body,
        toast: null,
        error: req.uploadError
      });
    }

    let pdfData = {};

    // 2. Process uploaded PDF if present
    if (req.file) {
      try {
        pdfData = await pdfService.processUploadedPdf(req.file.path, req.file.originalname);

        // Pre-fill total pages from PDF if user didn't specify or entered 0
        if ((!req.body.totalPages || parseInt(req.body.totalPages, 10) <= 0) && pdfData.pdfPageCount > 0) {
          req.body.totalPages = pdfData.pdfPageCount;
        }
      } catch (err) {
        return res.status(400).render('pages/book-form', {
          title: 'Add Book',
          activeNav: 'library',
          isEdit: false,
          book: null,
          categories,
          errors: { pdfFile: err.message },
          formData: req.body,
          toast: null,
          error: err.message
        });
      }
    }

    // Combine form body and PDF metadata
    const bookInput = {
      ...req.body,
      ...pdfData
    };

    const result = booksService.createBook(bookInput);
    if (!result.success) {
      // If book creation failed, clean up any processed PDF files to avoid orphans
      if (pdfData.pdfPath) {
        pdfService.cleanupPdfFiles(pdfData.pdfPath, pdfData.coverImage);
      }

      return res.status(400).render('pages/book-form', {
        title: 'Add Book',
        activeNav: 'library',
        isEdit: false,
        book: null,
        categories,
        errors: result.errors || {},
        formData: req.body,
        toast: null,
        error: Object.values(result.errors || {})[0] || 'Please fix the errors below.'
      });
    }

    res.redirect(303, `/books/${result.book.id}?toast=book_created`);
  } catch (err) {
    next(err);
  }
}

function getBookDetails(req, res, next) {
  try {
    const id = req.params.id;
    const book = booksService.getBookById(id);
    if (!book) {
      return res.status(404).render('pages/error', {
        title: 'Book Not Found',
        activeNav: 'library',
        errorCode: 404,
        errorMessage: `The book with ID '${id}' could not be found. It may have been removed.`
      });
    }

    book.progressPercent = calculatePercentage(book.currentPage, book.totalPages);

    res.render('pages/book-details', {
      title: `${book.title} - Book Details`,
      activeNav: 'library',
      book,
      toast: req.query.toast,
      error: req.query.error
    });
  } catch (err) {
    next(err);
  }
}

function getEditBookForm(req, res, next) {
  try {
    const id = req.params.id;
    const book = booksService.getBookById(id);
    if (!book) {
      return res.status(404).render('pages/error', {
        title: 'Book Not Found',
        activeNav: 'library',
        errorCode: 404,
        errorMessage: `The book with ID '${id}' could not be found.`
      });
    }

    const categories = categoriesService.getAllCategories();
    res.render('pages/book-form', {
      title: `Edit ${book.title}`,
      activeNav: 'library',
      isEdit: true,
      book,
      categories,
      errors: {},
      formData: book,
      toast: req.query.toast,
      error: req.query.error
    });
  } catch (err) {
    next(err);
  }
}

async function updateBook(req, res, next) {
  try {
    const id = req.params.id;
    const existing = booksService.getBookById(id);
    if (!existing) {
      return res.status(404).render('pages/error', {
        title: 'Book Not Found',
        activeNav: 'library',
        errorCode: 404,
        errorMessage: `The book with ID '${id}' could not be found.`
      });
    }

    const categories = categoriesService.getAllCategories();

    // Check upload error
    if (req.uploadError) {
      return res.status(400).render('pages/book-form', {
        title: `Edit ${existing.title}`,
        activeNav: 'library',
        isEdit: true,
        book: existing,
        categories,
        errors: { pdfFile: req.uploadError },
        formData: { ...req.body, id },
        toast: null,
        error: req.uploadError
      });
    }

    let pdfData = {};

    // Process new replacement PDF if uploaded
    if (req.file) {
      try {
        pdfData = await pdfService.processUploadedPdf(req.file.path, req.file.originalname);
      } catch (err) {
        return res.status(400).render('pages/book-form', {
          title: `Edit ${existing.title}`,
          activeNav: 'library',
          isEdit: true,
          book: existing,
          categories,
          errors: { pdfFile: err.message },
          formData: { ...req.body, id },
          toast: null,
          error: err.message
        });
      }
    }

    const updatePayload = {
      ...req.body,
      ...pdfData,
      removePdf: req.body.removePdf === 'true' || req.body.removePdf === '1' || req.body.removePdf === 'on'
    };

    const result = booksService.updateBook(id, updatePayload);
    if (!result.success) {
      if (pdfData.pdfPath) {
        pdfService.cleanupPdfFiles(pdfData.pdfPath, pdfData.coverImage);
      }

      return res.status(400).render('pages/book-form', {
        title: `Edit ${existing ? existing.title : 'Book'}`,
        activeNav: 'library',
        isEdit: true,
        book: existing,
        categories,
        errors: result.errors || {},
        formData: { ...req.body, id },
        toast: null,
        error: Object.values(result.errors || {})[0] || 'Please fix the errors below.'
      });
    }

    res.redirect(303, `/books/${id}?toast=book_updated`);
  } catch (err) {
    next(err);
  }
}

function updateProgress(req, res, next) {
  try {
    const id = req.params.id;
    const currentPageInput = req.body.currentPage;
    const result = booksService.updateProgress(id, currentPageInput);

    if (result.notFound) {
      return res.status(404).render('pages/error', {
        title: 'Book Not Found',
        activeNav: 'library',
        errorCode: 404,
        errorMessage: `The book with ID '${id}' could not be found.`
      });
    }

    if (!result.success) {
      return res.redirect(303, `/books/${id}?error=${encodeURIComponent(result.error || 'Invalid page value.')}`);
    }

    res.redirect(303, `/books/${id}?toast=progress_updated`);
  } catch (err) {
    next(err);
  }
}

/**
 * Stream the stored PDF document with HTTP Range request support
 */
function serveBookPdf(req, res, next) {
  try {
    const id = req.params.id;
    const book = booksService.getBookById(id);
    if (!book || !book.pdfPath) {
      return res.status(404).send('PDF document not attached to this book.');
    }

    const safePath = pdfService.getSafePdfPath(book.pdfPath);
    if (!safePath) {
      return res.status(404).send('PDF file could not be found in storage.');
    }

    const filename = book.pdfFilename || `${book.title}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.sendFile(safePath, { acceptRanges: true });
  } catch (err) {
    next(err);
  }
}

/**
 * Render the dedicated, focused In-App PDF Reader screen
 */
function getPdfReader(req, res, next) {
  try {
    const id = req.params.id;
    const book = booksService.getBookById(id);
    if (!book) {
      return res.status(404).render('pages/error', {
        title: 'Book Not Found',
        activeNav: 'library',
        errorCode: 404,
        errorMessage: `The book with ID '${id}' could not be found.`
      });
    }

    if (!book.pdfPath) {
      return res.redirect(303, `/books/${id}?error=${encodeURIComponent('No PDF document is attached to this book. Please upload one first.')}`);
    }

    res.render('pages/pdf-reader', {
      title: `Reading: ${book.title}`,
      layout: false, // Dedicated full-viewport reader
      book
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update reading position (last opened page in PDF reader)
 * Does NOT alter confirmed reading progress
 */
function updateReadPosition(req, res, next) {
  try {
    const id = req.params.id;
    const { page } = req.body;
    const result = booksService.updateReadPosition(id, page);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Explicit action to mark the current PDF reader page as confirmed reading progress
 */
function markPageRead(req, res, next) {
  try {
    const id = req.params.id;
    const { page } = req.body;
    const result = booksService.updateProgress(id, page);

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json(result);
    }

    if (!result.success) {
      return res.redirect(303, `/books/${id}/read?error=${encodeURIComponent(result.error || 'Failed to update progress.')}`);
    }

    res.redirect(303, `/books/${id}/read?toast=progress_updated`);
  } catch (err) {
    next(err);
  }
}

function getDeleteConfirmation(req, res, next) {
  try {
    const id = req.params.id;
    const book = booksService.getBookById(id);
    if (!book) {
      return res.status(404).render('pages/error', {
        title: 'Book Not Found',
        activeNav: 'library',
        errorCode: 404,
        errorMessage: `The book with ID '${id}' could not be found.`
      });
    }

    res.render('pages/delete-confirmation', {
      title: `Delete '${book.title}'?`,
      activeNav: 'library',
      book
    });
  } catch (err) {
    next(err);
  }
}

function deleteBook(req, res, next) {
  try {
    const id = req.params.id;
    const result = booksService.deleteBook(id);
    if (result.notFound) {
      return res.status(404).render('pages/error', {
        title: 'Book Not Found',
        activeNav: 'library',
        errorCode: 404,
        errorMessage: `The book with ID '${id}' could not be found.`
      });
    }

    res.redirect(303, '/library?toast=book_deleted');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNewBookForm,
  createBook,
  getBookDetails,
  getEditBookForm,
  updateBook,
  updateProgress,
  serveBookPdf,
  getPdfReader,
  updateReadPosition,
  markPageRead,
  getDeleteConfirmation,
  deleteBook
};
