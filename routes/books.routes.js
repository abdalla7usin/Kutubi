const express = require('express');
const router = express.Router();
const booksController = require('../controllers/books.controller');

router.get('/books/new', booksController.getNewBookForm);
router.post('/books', booksController.createBook);

router.get('/books/:id', booksController.getBookDetails);
router.get('/books/:id/edit', booksController.getEditBookForm);
router.post('/books/:id/edit', booksController.updateBook);
router.post('/books/:id/progress', booksController.updateProgress);

router.get('/books/:id/delete', booksController.getDeleteConfirmation);
router.post('/books/:id/delete', booksController.deleteBook);

module.exports = router;
