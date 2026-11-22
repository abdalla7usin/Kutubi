/**
 * Kutubi - Categories Controller
 */

const categoriesService = require('../services/categories.service');

async function createCategory(req, res, next) {
  try {
    const { name } = req.body;
    const result = await categoriesService.createCategory(name);
    if (!result.success) {
      return res.redirect(303, `/settings?error=${encodeURIComponent(result.error || 'Failed to create category.')}`);
    }

    res.redirect(303, '/settings?toast=category_created');
  } catch (err) {
    next(err);
  }
}

async function renameCategory(req, res, next) {
  try {
    const id = req.params.id;
    const { name } = req.body;
    const result = await categoriesService.renameCategory(id, name);
    if (!result.success) {
      return res.redirect(303, `/settings?error=${encodeURIComponent(result.error || 'Failed to rename category.')}`);
    }

    res.redirect(303, '/settings?toast=category_renamed');
  } catch (err) {
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const id = req.params.id;
    const result = await categoriesService.deleteCategory(id);
    if (!result.success) {
      return res.redirect(303, `/settings?error=${encodeURIComponent(result.error || 'Failed to delete category.')}`);
    }

    res.redirect(303, `/settings?toast=category_deleted&reassigned=${result.reassignedCount || 0}`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCategory,
  renameCategory,
  deleteCategory
};
