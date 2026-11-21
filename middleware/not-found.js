/**
 * Kutubi - 404 Not Found Middleware
 */

function notFoundHandler(req, res, next) {
  res.status(404).render('pages/error', {
    title: 'Page Not Found',
    activeNav: '',
    errorCode: 404,
    errorMessage: `The page at '${req.originalUrl}' does not exist.`
  });
}

module.exports = notFoundHandler;
