const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');

router.get('/settings', settingsController.getSettings);
router.post('/settings', settingsController.updatePreferences);
router.get('/settings/export', settingsController.exportJson);

module.exports = router;
