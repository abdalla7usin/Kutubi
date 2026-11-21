/**
 * Kutubi - Books Controller
 */

const booksService = require('../services/books.service');
const categoriesService = require('../services/categories.service');
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

function createBook(req, res, next) {
  try {
    const result = booksService.createBook(req.body);
    if (!result.success) {
      const categories = categoriesService.getAllCategories();
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

function updateBook(req, res, next) {
  try {
    const id = req.params.id;
    const result = booksService.updateBook(id, req.body);
    if (result.notFound) {
      return res.status(404).render('pages/error', {
        title: 'Book Not Found',
        activeNav: 'library',
        errorCode: 404,
        errorMessage: `The book with ID '${id}' could not be found.`
      });
    }

    if (!result.success) {
      const categories = categoriesService.getAllCategories();
      const existing = booksService.getBookById(id);
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
  getDeleteConfirmation,
  deleteBook
};
