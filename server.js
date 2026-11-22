/**
 * Kutubi (كتبي) - Express Application Entry Point
 * Fullstack personal book library management web application
 */

const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');

const { initDatabase } = require('./db/database');
const booksService = require('./services/books.service');
const {
  renderBookCover,
  renderListThumbnail,
  renderTypographicCover,
  getEffectiveCoverUrl,
  isArabic,
  escapeHtml
} = require('./utils/covers');
const {
  formatDate,
  calculatePercentage,
  getInitials
} = require('./utils/formatting');

// Import routes
const dashboardRoutes = require('./routes/dashboard.routes');
const libraryRoutes = require('./routes/library.routes');
const booksRoutes = require('./routes/books.routes');
const categoriesRoutes = require('./routes/categories.routes');
const settingsRoutes = require('./routes/settings.routes');
const profileRoutes = require('./routes/profile.routes');

// Import middleware
const notFoundHandler = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');

// Initialize database
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup with express-ejs-layouts
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Body parsers
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/storage/covers', express.static(path.join(__dirname, 'storage', 'covers')));
app.get('/storage/covers/:filename(*)', async (req, res, next) => {
  const filename = req.params.filename;
  const storage = require('./services/storage.service').getStorage();
  if (storage.isCloudStorage()) {
    try {
      const signedUrl = await storage.getSignedCoverUrl(filename);
      if (signedUrl) {
        return res.redirect(signedUrl);
      }
    } catch (err) {
      console.warn('[Cover Delivery] Signed URL warning:', err.message);
    }
  }
  const safePath = storage.getSafeCoverPath(filename);
  if (safePath) {
    return res.sendFile(safePath);
  }
  res.status(404).send('Cover not found');
});
app.use('/vendor/pdfjs', express.static(path.join(__dirname, 'node_modules', 'pdfjs-dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    } else if (filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));
app.use('/vendor/pdfjs', express.static(path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Global locals for all EJS templates
app.use((req, res, next) => {
  try {
    // Dynamic real-time count of total books from SQLite
    res.locals.totalBooksCount = booksService.getBooks().length;
  } catch {
    res.locals.totalBooksCount = 0;
  }

  // Template utilities & helpers
  res.locals.renderBookCover = renderBookCover;
  res.locals.renderListThumbnail = renderListThumbnail;
  res.locals.renderTypographicCover = renderTypographicCover;
  res.locals.getEffectiveCoverUrl = getEffectiveCoverUrl;
  res.locals.isArabic = isArabic;
  res.locals.escapeHtml = escapeHtml;
  res.locals.formatDate = formatDate;
  res.locals.calculatePercentage = calculatePercentage;
  res.locals.getInitials = getInitials;

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Mount domain routes
app.use('/', dashboardRoutes);
app.use('/', libraryRoutes);
app.use('/', booksRoutes);
app.use('/', categoriesRoutes);
app.use('/', settingsRoutes);
app.use('/', profileRoutes);

// Catch-all 404 and global error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server if executed directly
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`[Kutubi Server] Running at http://localhost:${PORT}`);
    console.log(`[Kutubi Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Graceful shutdown
  const handleShutdown = () => {
    console.log('\n[Kutubi Server] Shutting down gracefully...');
    server.close(() => {
      const { closeDb } = require('./db/database');
      closeDb();
      console.log('[Kutubi Server] Closed database connection and HTTP server.');
      process.exit(0);
    });
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);
}

module.exports = app;
