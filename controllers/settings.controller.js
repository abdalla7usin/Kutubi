/**
 * Kutubi - Settings Controller
 */

const settingsService = require('../services/settings.service');
const categoriesService = require('../services/categories.service');

async function getSettings(req, res, next) {
  try {
    const settings = await settingsService.getSettings();
    const categories = await categoriesService.getAllCategories();

    let toastMessage = null;
    if (req.query.toast === 'category_created') toastMessage = 'Category created successfully';
    else if (req.query.toast === 'category_renamed') toastMessage = 'Category renamed successfully';
    else if (req.query.toast === 'category_deleted') {
      const count = req.query.reassigned || 0;
      toastMessage = `Category deleted. Reassigned ${count} book(s) to Uncategorized.`;
    }
    else if (req.query.toast === 'settings_saved') toastMessage = 'Preferences saved successfully';

    res.render('pages/settings', {
      title: 'Settings',
      activeNav: 'settings',
      settings,
      categories,
      toast: toastMessage,
      error: req.query.error
    });
  } catch (err) {
    next(err);
  }
}

async function updatePreferences(req, res, next) {
  try {
    const { defaultLibraryView, defaultSortOrder } = req.body;
    await settingsService.updateSettings({
      defaultLibraryView,
      defaultSortOrder
    });

    res.redirect(303, '/settings?toast=settings_saved');
  } catch (err) {
    next(err);
  }
}

async function exportJson(req, res, next) {
  try {
    const backup = await settingsService.exportLibraryJson();
    const filename = `kutubi-library-${new Date().toISOString().slice(0, 10)}.json`;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updatePreferences,
  exportJson
};
