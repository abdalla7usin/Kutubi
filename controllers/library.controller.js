/**
 * Kutubi - Library Controller
 */

const booksService = require('../services/books.service');
const categoriesService = require('../services/categories.service');
const settingsService = require('../services/settings.service');

async function getLibrary(req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    const categories = await categoriesService.getAllCategories();

    // Query parameters with sensible defaults from settings
    const search = req.query.search ? String(req.query.search) : '';
    const status = req.query.status ? String(req.query.status) : 'All';
    const category = req.query.category ? String(req.query.category) : 'All';
    const sort = req.query.sort ? String(req.query.sort) : (settings.defaultSortOrder || 'recently-added');
    const view = req.query.view ? String(req.query.view) : (settings.defaultLibraryView || 'grid');

    const books = await booksService.getBooks({
      search,
      status,
      category,
      sort
    });

    res.render('pages/library', {
      title: 'My Library',
      activeNav: 'library',
      books,
      categories,
      filters: {
        search,
        status,
        category,
        sort,
        view
      },
      toast: req.query.toast,
      error: req.query.error
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLibrary
};
