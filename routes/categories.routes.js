const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categories.controller');

router.post('/categories', categoriesController.createCategory);
router.post('/categories/:id/edit', categoriesController.renameCategory);
router.post('/categories/:id/delete', categoriesController.deleteCategory);

module.exports = router;
