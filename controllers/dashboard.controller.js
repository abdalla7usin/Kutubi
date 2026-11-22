/**
 * Kutubi - Dashboard Controller
 */

const dashboardService = require('../services/dashboard.service');

async function getDashboard(req, res, next) {
  try {
    const data = await dashboardService.getDashboardData();
    res.render('pages/dashboard', {
      title: 'Dashboard',
      activeNav: 'dashboard',
      metrics: data.metrics,
      currentlyReading: data.currentlyReading,
      recentlyAdded: data.recentlyAdded,
      toast: req.query.toast,
      error: req.query.error
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard
};
