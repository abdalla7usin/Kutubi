/**
 * Kutubi - Centralized Error Handler Middleware
 */

function errorHandler(err, req, res, next) {
  console.error('[SERVER ERROR]:', err);

  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Internal Server Error';

  res.status(status).render('pages/error', {
    title: 'Error',
    activeNav: '',
    errorCode: status,
    errorMessage: message
  });
}

module.exports = errorHandler;
