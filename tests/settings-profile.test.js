const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { initDatabase, closeDb } = require('../db/database');
const { seedSampleBooksForTests } = require('../db/seed');
const settingsService = require('../services/settings.service');
const profileService = require('../services/profile.service');
const booksService = require('../services/books.service');

describe('Settings & Profile Persistence and Features', () => {
  let db;

  beforeEach(() => {
    db = initDatabase(':memory:');
  });

  afterEach(() => {
    closeDb();
  });

  it('should persist settings preferences updates', () => {
    const updated = settingsService.updateSettings({
      defaultLibraryView: 'list',
      defaultSortOrder: 'progress'
    }, db);

    assert.strictEqual(updated.defaultLibraryView, 'list');
    assert.strictEqual(updated.defaultSortOrder, 'progress');

    // Retrieve fresh
    const fresh = settingsService.getSettings(db);
    assert.strictEqual(fresh.defaultLibraryView, 'list');
    assert.strictEqual(fresh.defaultSortOrder, 'progress');
  });

  it('should export valid JSON backup containing all books and categories', () => {
    const backupEmpty = settingsService.exportLibraryJson(db);

    assert.strictEqual(backupEmpty.app, 'Kutubi');
    assert.strictEqual(backupEmpty.version, '1.0.0');
    assert.ok(backupEmpty.exportedAt);
    assert.strictEqual(backupEmpty.books.length, 0);
    assert.strictEqual(backupEmpty.categories.length, 5);

    // After adding a book
    booksService.createBook({
      title: 'Operating Systems',
      author: 'Remzi',
      category: 'Engineering',
      totalPages: 500,
      status: 'Reading'
    }, db);

    const backupWithBook = settingsService.exportLibraryJson(db);
    assert.strictEqual(backupWithBook.books.length, 1);
    assert.strictEqual(backupWithBook.categories.length, 5);
  });

  it('should update profile and calculate dynamic milestone statistics and initials', () => {
    seedSampleBooksForTests(db);

    const updated = profileService.updateProfile({
      displayName: 'Sarah Connor',
      bio: 'Reading to save the future.'
    }, db);

    assert.strictEqual(updated.success, true);
    assert.strictEqual(updated.profile.displayName, 'Sarah Connor');
    assert.strictEqual(updated.profile.initials, 'SC');

    const profileData = profileService.getProfileStats(db);
    assert.strictEqual(profileData.stats.completedBooks, 14);
    assert.strictEqual(profileData.stats.totalPagesRead, 6948);
    assert.strictEqual(profileData.stats.favoriteCategory, 'Engineering');
  });

  it('should generate consistent avatar initials according to Unicode and word-count rules', () => {
    const { getInitials } = require('../utils/formatting');

    // English multi-word names
    assert.strictEqual(getInitials('Ahmed Khaled'), 'AK');
    assert.strictEqual(getInitials('Sarah Jenkins'), 'SJ');
    assert.strictEqual(getInitials('John Fitzgerald Kennedy'), 'JF');

    // English single-word names (first two characters)
    assert.strictEqual(getInitials('Ahmed'), 'AH');
    assert.strictEqual(getInitials('Kutubi'), 'KU');
    assert.strictEqual(getInitials('A'), 'A');

    // Arabic multi-word names
    assert.strictEqual(getInitials('ابن خلدون'), 'اخ');
    assert.strictEqual(getInitials('نجيب محفوظ'), 'نم');

    // Arabic single-word names (first two Unicode characters)
    assert.strictEqual(getInitials('أحمد'), 'أح');
    assert.strictEqual(getInitials('كتبي'), 'كت');

    // Leading / trailing whitespace & multiple spaces
    assert.strictEqual(getInitials('   Ahmed   Khaled   '), 'AK');
    assert.strictEqual(getInitials('   Kutubi   '), 'KU');
    assert.strictEqual(getInitials('  ابن   خلدون  '), 'اخ');

    // Empty input, whitespace-only, and non-string fallbacks
    assert.strictEqual(getInitials(''), 'K');
    assert.strictEqual(getInitials('   '), 'K');
    assert.strictEqual(getInitials(null), 'K');
    assert.strictEqual(getInitials(undefined), 'K');
  });
});
