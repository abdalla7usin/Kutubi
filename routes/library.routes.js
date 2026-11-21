const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/library.controller');

router.get('/library', libraryController.getLibrary);

module.exports = router;
