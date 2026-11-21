/**
 * Kutubi - Reactive Store & localStorage Persistence Layer
 */

import { INITIAL_BOOKS, INITIAL_CATEGORIES, INITIAL_PROFILE, INITIAL_SETTINGS } from './seedData.js';

const STORAGE_KEYS = {
  BOOKS: 'kutubi_books_v1',
  CATEGORIES: 'kutubi_categories_v1',
  PROFILE: 'kutubi_profile_v1',
  SETTINGS: 'kutubi_settings_v1',
  SIDEBAR: 'kutubi_sidebar_collapsed_v1'
};

class KutubiStore {
  constructor() {
    this.listeners = new Set();
    this.init();
  }

  init() {
    if (!localStorage.getItem(STORAGE_KEYS.BOOKS)) {
      this.resetToDefaults();
    }
  }

  resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(INITIAL_BOOKS));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(INITIAL_PROFILE));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    this.notify('reset');
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(event, data = {}) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    }
  }

  // --- BOOKS API ---

  getBooks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return INITIAL_BOOKS;
    }
  }

  getBook(id) {
    return this.getBooks().find(b => b.id === id) || null;
  }

  addBook(bookData) {
    const books = this.getBooks();
    const newBook = {
      id: 'book-' + Date.now(),
      title: bookData.title.trim(),
      author: bookData.author.trim(),
      category: bookData.category || 'Uncategorized',
      status: bookData.status || 'To Read',
      totalPages: Number(bookData.totalPages) || 1,
      currentPage: Number(bookData.currentPage) || 0,
      rating: bookData.rating ? Number(bookData.rating) : null,
      coverUrl: (bookData.coverUrl || '').trim(),
      dateAdded: bookData.dateAdded || this.formatDate(new Date()),
      notes: (bookData.notes || '').trim()
    };

    // Auto status adjust
    if (newBook.status === 'Completed') {
      newBook.currentPage = newBook.totalPages;
    } else if (newBook.currentPage >= newBook.totalPages) {
      newBook.status = 'Completed';
      newBook.currentPage = newBook.totalPages;
    } else if (newBook.currentPage > 0 && newBook.status === 'To Read') {
      newBook.status = 'Reading';
    }

    books.unshift(newBook);
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    this.notify('books_changed', { action: 'add', book: newBook });
    return newBook;
  }

  updateBook(id, updates) {
    const books = this.getBooks();
    const index = books.findIndex(b => b.id === id);
    if (index === -1) return null;

    const current = books[index];
    const updated = { ...current, ...updates };

    if ('totalPages' in updates) updated.totalPages = Number(updates.totalPages);
    if ('currentPage' in updates) updated.currentPage = Number(updates.currentPage);
    if ('rating' in updates) updated.rating = updates.rating ? Number(updates.rating) : null;

    // Reading logic transitions
    if (updated.status === 'Completed' && updates.status === 'Completed' && current.status !== 'Completed') {
      updated.currentPage = updated.totalPages;
    } else if (updated.currentPage >= updated.totalPages && updated.totalPages > 0) {
      updated.status = 'Completed';
      updated.currentPage = updated.totalPages;
    } else if (updated.currentPage > 0 && updated.status === 'To Read') {
      updated.status = 'Reading';
    }

    books[index] = updated;
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    this.notify('books_changed', { action: 'update', book: updated });
    return updated;
  }

  deleteBook(id) {
    const books = this.getBooks();
    const filtered = books.filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(filtered));
    this.notify('books_changed', { action: 'delete', bookId: id });
    return true;
  }

  // --- CATEGORIES API ---

  getCategories() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      return data ? JSON.parse(data) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  }

  addCategory(name) {
    const trimmed = name.trim();
    if (!trimmed) return { error: 'Category name cannot be empty.' };

    const categories = this.getCategories();
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      return { error: 'Category already exists.' };
    }

    const newCat = {
      id: 'cat-' + Date.now(),
      name: trimmed,
      isSystem: false
    };

    categories.push(newCat);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    this.notify('categories_changed', { action: 'add', category: newCat });
    return { category: newCat };
  }

  renameCategory(id, newName) {
    const trimmed = newName.trim();
    if (!trimmed) return { error: 'Category name cannot be empty.' };

    const categories = this.getCategories();
    const cat = categories.find(c => c.id === id);
    if (!cat) return { error: 'Category not found.' };
    if (cat.isSystem) return { error: 'System default category cannot be renamed.' };

    const oldName = cat.name;
    if (categories.some(c => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
      return { error: 'Category name already in use.' };
    }

    cat.name = trimmed;
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));

    // Update all books with old category name
    const books = this.getBooks();
    let booksUpdated = false;
    for (const b of books) {
      if (b.category === oldName) {
        b.category = trimmed;
        booksUpdated = true;
      }
    }
    if (booksUpdated) {
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    }

    this.notify('categories_changed', { action: 'rename', id, oldName, newName: trimmed });
    return { success: true };
  }

  deleteCategory(id) {
    const categories = this.getCategories();
    const cat = categories.find(c => c.id === id);
    if (!cat) return { error: 'Category not found.' };
    if (cat.isSystem) return { error: 'System default category cannot be deleted.' };

    const catName = cat.name;
    const filteredCategories = categories.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filteredCategories));

    // Reassign all books to Uncategorized
    const books = this.getBooks();
    let reassignCount = 0;
    for (const b of books) {
      if (b.category === catName) {
        b.category = 'Uncategorized';
        reassignCount++;
      }
    }
    if (reassignCount > 0) {
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    }

    this.notify('categories_changed', { action: 'delete', id, reassignCount });
    return { success: true, reassignCount };
  }

  getCategoryBookCount(categoryName) {
    return this.getBooks().filter(b => b.category === categoryName).length;
  }

  // --- PROFILE API ---

  getProfile() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return data ? JSON.parse(data) : INITIAL_PROFILE;
    } catch {
      return INITIAL_PROFILE;
    }
  }

  updateProfile(profileData) {
    const current = this.getProfile();
    const updated = {
      ...current,
      displayName: (profileData.displayName || '').trim() || 'Ahmed Khaled',
      bio: (profileData.bio || '').trim()
    };
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    this.notify('profile_changed', updated);
    return updated;
  }

  // --- SETTINGS API ---

  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  updateSettings(updates) {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    this.notify('settings_changed', updated);
    return updated;
  }

  // --- SIDEBAR STATE ---

  isSidebarCollapsed() {
    return localStorage.getItem(STORAGE_KEYS.SIDEBAR) === 'true';
  }

  setSidebarCollapsed(collapsed) {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR, collapsed ? 'true' : 'false');
    this.notify('sidebar_toggled', { collapsed });
  }

  // --- METRICS & AGGREGATIONS ---

  getMetrics() {
    const books = this.getBooks();
    const categories = this.getCategories();
    const total = books.length;
    const reading = books.filter(b => b.status === 'Reading').length;
    const completed = books.filter(b => b.status === 'Completed').length;
    const toRead = books.filter(b => b.status === 'To Read').length;
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Total pages read
    const totalPagesRead = books.reduce((sum, b) => sum + (Number(b.currentPage) || 0), 0);

    // Favorite category
    const catCounts = {};
    for (const b of books) {
      const cat = b.category || 'Uncategorized';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    let favoriteCategory = 'None';
    let maxCount = -1;
    for (const [cat, count] of Object.entries(catCounts)) {
      if (count > maxCount) {
        maxCount = count;
        favoriteCategory = cat;
      }
    }

    return {
      total,
      categoriesCount: categories.length,
      reading,
      completed,
      toRead,
      completedPercent,
      totalPagesRead,
      favoriteCategory
    };
  }

  // --- EXPORT JSON ---

  exportJSON() {
    const payload = {
      app: 'Kutubi',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profile: this.getProfile(),
      settings: this.getSettings(),
      categories: this.getCategories(),
      books: this.getBooks()
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kutubi-library-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = months[date.getMonth()];
    const d = String(date.getDate()).padStart(2, '0');
    const y = date.getFullYear();
    return `${m} ${d}, ${y}`;
  }
}

export const store = new KutubiStore();
