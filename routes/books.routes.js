const express = require('express');
const router = express.Router();
const booksController = require('../controllers/books.controller');
const { pdfUploadMiddleware } = require('../middleware/upload');

// Book creation
router.get('/books/new', booksController.getNewBookForm);
router.post('/books', pdfUploadMiddleware('pdfFile'), booksController.createBook);

// Book details, edit & progress
router.get('/books/:id', booksController.getBookDetails);
router.get('/books/:id/edit', booksController.getEditBookForm);
router.post('/books/:id/edit', pdfUploadMiddleware('pdfFile'), booksController.updateBook);
router.post('/books/:id/progress', booksController.updateProgress);

// In-app PDF Reader & file endpoints
router.get('/books/:id/pdf', booksController.serveBookPdf);
router.get('/books/:id/read', booksController.getPdfReader);
router.post('/books/:id/read-position', booksController.updateReadPosition);
router.post('/books/:id/mark-read-page', booksController.markPageRead);

// Book deletion
router.get('/books/:id/delete', booksController.getDeleteConfirmation);
router.post('/books/:id/delete', booksController.deleteBook);

module.exports = router;
