/**
 * Kutubi - Application Entry Point & Router
 */

import { store } from './store.js';
import { showToast } from './toast.js';
import { openDeleteModal, openRenameModal } from './modal.js';
import { renderDashboard } from './views/dashboard.js';
import { renderLibrary, setLibraryFilter, resetLibraryFilters } from './views/library.js';
import { renderBookDetails } from './views/bookDetails.js';
import { renderBookForm } from './views/bookForm.js';
import { renderSettings } from './views/settings.js';
import { renderProfile, getInitials } from './views/profile.js';
import { escapeHtml } from './covers.js';
import { initCustomDropdowns } from './dropdown.js';

// DOM Elements
const sidebar = document.getElementById('app-sidebar');
const collapseBtn = document.getElementById('sidebar-collapse-btn');
const expandBtn = document.getElementById('sidebar-expand-btn');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileDrawerBackdrop = document.getElementById('mobile-drawer-backdrop');
const appMain = document.getElementById('app-main');
const sidebarTotalBadge = document.getElementById('sidebar-total-badge');
const sidebarTooltipLibrary = document.getElementById('sidebar-tooltip-library');

// Initial setup
function initApp() {
  function setSidebarCollapsed(collapsed) {
    if (!sidebar) return;
    sidebar.classList.add('overflow-hidden');
    sidebar.classList.add('transitioning');

    let cleanedUp = false;
    const cleanupTransition = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      sidebar.classList.remove('transitioning');
      if (!sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('overflow-hidden');
      }
    };

    const onTransitionEnd = (e) => {
      if (e.target === sidebar && (e.propertyName === 'width' || e.propertyName === 'max-width')) {
        sidebar.removeEventListener('transitionend', onTransitionEnd);
        cleanupTransition();
      }
    };
    sidebar.addEventListener('transitionend', onTransitionEnd);
    setTimeout(cleanupTransition, 260);

    if (collapsed) {
      sidebar.classList.add('collapsed');
      sidebar.classList.remove('w-60');
      sidebar.classList.add('w-16');
      sidebar.classList.add('overflow-hidden');
      store.setSidebarCollapsed(true);
    } else {
      sidebar.classList.remove('collapsed');
      sidebar.classList.remove('w-16');
      sidebar.classList.add('w-60');
      sidebar.classList.remove('overflow-hidden');
      store.setSidebarCollapsed(false);
    }
  }

  // Sidebar state
  if (store.isSidebarCollapsed()) {
    sidebar.classList.add('collapsed');
    sidebar.classList.remove('w-60');
    sidebar.classList.add('w-16');
    sidebar.classList.add('overflow-hidden');
  } else {
    sidebar.classList.remove('collapsed');
    sidebar.classList.remove('w-16');
    sidebar.classList.add('w-60');
    sidebar.classList.remove('overflow-hidden');
  }

  updateSidebarBadge();

  // Listen to store changes
  store.subscribe((event, data) => {
    updateSidebarBadge();

    // If books or categories changed and we're on dashboard/library, re-render
    const hash = window.location.hash || '#dashboard';
    if (hash === '#dashboard' || hash.startsWith('#dashboard')) {
      handleRoute();
    }
  });

  // Event Listeners for Sidebar
  if (collapseBtn) {
    collapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const shouldCollapse = !sidebar.classList.contains('collapsed');
      setSidebarCollapsed(shouldCollapse);
    });
  }

  if (expandBtn) {
    expandBtn.addEventListener('click', (e) => {
      e.preventDefault();
      setSidebarCollapsed(false);
    });
  }

  // Mobile drawer
  if (mobileMenuBtn && mobileDrawerBackdrop) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      mobileDrawerBackdrop.classList.add('open');
    });

    mobileDrawerBackdrop.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      mobileDrawerBackdrop.classList.remove('open');
    });
  }

  // Routing
  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  // Global event delegation
  setupGlobalEvents();
}

function updateSidebarBadge() {
  const count = store.getBooks().length;
  if (sidebarTotalBadge) sidebarTotalBadge.textContent = count;
  if (sidebarTooltipLibrary) sidebarTooltipLibrary.textContent = `My Library · ${count}`;
}

export function updateView(html) {
  appMain.innerHTML = html;
  initCustomDropdowns(appMain);
}

// Router
function handleRoute() {
  // Close mobile drawer on route change
  if (sidebar.classList.contains('mobile-open')) {
    sidebar.classList.remove('mobile-open');
    if (mobileDrawerBackdrop) mobileDrawerBackdrop.classList.remove('open');
  }

  const hash = window.location.hash || '#dashboard';
  let route = hash.slice(1);
  let queryString = '';

  if (route.includes('?')) {
    const parts = route.split('?');
    route = parts[0];
    queryString = parts[1];
  }

  // Parse query params
  const params = new URLSearchParams(queryString);
  if (params.has('status')) {
    setLibraryFilter('status', params.get('status'));
  }
  if (params.has('category')) {
    setLibraryFilter('category', params.get('category'));
  }

  // Highlight active sidebar item
  const navLinks = document.querySelectorAll('.sidebar-link');
  navLinks.forEach(link => {
    const targetNav = link.getAttribute('data-nav');
    if (
      (targetNav === 'dashboard' && (route === 'dashboard' || route === '')) ||
      (targetNav === 'library' && (route === 'library' || route.startsWith('book/') || route === 'add' || route.startsWith('edit/'))) ||
      (targetNav === 'settings' && route === 'settings') ||
      (targetNav === 'profile' && route === 'profile')
    ) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Render view
  if (route === '' || route === 'dashboard') {
    updateView(renderDashboard());
  } else if (route === 'library') {
    updateView(renderLibrary());
  } else if (route.startsWith('book/')) {
    const bookId = route.replace('book/', '');
    updateView(renderBookDetails(bookId));
  } else if (route === 'add') {
    updateView(renderBookForm(null));
  } else if (route.startsWith('edit/')) {
    const bookId = route.replace('edit/', '');
    updateView(renderBookForm(bookId));
  } else if (route === 'settings') {
    updateView(renderSettings());
  } else if (route === 'profile') {
    updateView(renderProfile());
  } else {
    // 404 fallback
    window.location.hash = '#dashboard';
  }

  // Scroll to top
  window.scrollTo(0, 0);
  appMain.scrollTop = 0;
}

// Global Event Listeners & Delegations
function setupGlobalEvents() {
  // 1. Library Search & Filters
  document.addEventListener('input', (e) => {
    if (e.target.id === 'library-search-input') {
      setLibraryFilter('search', e.target.value);
      updateView(renderLibrary());
      // Keep input focused & cursor at end
      const input = document.getElementById('library-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }

    // Live preview for cover URL in Add/Edit Book form
    if (e.target.id === 'book-cover-url') {
      const previewBox = document.getElementById('cover-preview-box');
      if (previewBox) {
        const url = e.target.value.trim();
        if (url) {
          previewBox.innerHTML = `
            <img
              src="${escapeHtml(url)}"
              alt="Preview"
              class="w-full h-full object-cover"
              onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'material-symbols-outlined text-[18px] text-text-muted\\'>menu_book</span>';"
            />
          `;
        } else {
          previewBox.innerHTML = `
            <span class="material-symbols-outlined text-[18px] text-text-muted" aria-hidden="true">menu_book</span>
          `;
        }
      }
    }

    // Profile Display Name live initials update
    if (e.target.id === 'profile-display-name') {
      const initialsEl = document.getElementById('avatar-initials');
      if (initialsEl) {
        initialsEl.textContent = getInitials(e.target.value);
      }
    }
  });

  document.addEventListener('change', (e) => {
    // Library Filters
    if (e.target.id === 'library-status-select') {
      setLibraryFilter('status', e.target.value);
      updateView(renderLibrary());
    }
    if (e.target.id === 'library-category-select') {
      setLibraryFilter('category', e.target.value);
      updateView(renderLibrary());
    }
    if (e.target.id === 'library-sort-select') {
      setLibraryFilter('sort', e.target.value);
      updateView(renderLibrary());
    }

    // Settings default sort order
    if (e.target.id === 'settings-default-sort') {
      store.updateSettings({ defaultSortOrder: e.target.value });
      showToast('Default sort order saved');
    }

    // Add/Edit Book: auto-fill current page if Completed is chosen
    if (e.target.id === 'book-status') {
      const totalPagesInput = document.getElementById('book-total-pages');
      const currentPageInput = document.getElementById('book-current-page');
      if (e.target.value === 'Completed' && totalPagesInput && currentPageInput) {
        if (Number(totalPagesInput.value) > 0) {
          currentPageInput.value = totalPagesInput.value;
        }
      }
    }
  });

  document.addEventListener('click', (e) => {
    // Library View Toggles (Grid / List)
    const toggleGridBtn = e.target.closest('#toggle-grid-view');
    if (toggleGridBtn) {
      setLibraryFilter('view', 'grid');
      updateView(renderLibrary());
      return;
    }

    const toggleListBtn = e.target.closest('#toggle-list-view');
    if (toggleListBtn) {
      setLibraryFilter('view', 'list');
      updateView(renderLibrary());
      return;
    }

    // Clear Filters Button in empty search/filter card
    const clearFiltersBtn = e.target.closest('#clear-filters-btn');
    if (clearFiltersBtn) {
      resetLibraryFilters();
      updateView(renderLibrary());
      return;
    }

    // Delete Book Click (from List view, Book Details, or Edit Book)
    const deleteBtn = e.target.closest('[data-delete-book-id]');
    if (deleteBtn) {
      const bookId = deleteBtn.getAttribute('data-delete-book-id');
      const bookTitle = deleteBtn.getAttribute('data-delete-book-title') || 'this book';

      openDeleteModal({
        title: bookTitle,
        onConfirm: () => {
          store.deleteBook(bookId);
          showToast(`Deleted '${bookTitle}' from library`);
          // Navigate to library if on details/edit page
          if (window.location.hash.startsWith('#book/') || window.location.hash.startsWith('#edit/')) {
            window.location.hash = '#library';
          } else {
            handleRoute();
          }
        }
      });
      return;
    }

    // Star Rating Click
    const starBtn = e.target.closest('.star-btn');
    if (starBtn) {
      const starGroup = document.getElementById('star-selector');
      if (!starGroup) return;

      const clickedNum = Number(starBtn.getAttribute('data-star'));
      const currentRating = Number(starGroup.getAttribute('data-rating')) || null;
      const newRating = (currentRating === clickedNum) ? null : clickedNum;

      starGroup.setAttribute('data-rating', newRating || '');

      const allStars = starGroup.querySelectorAll('.star-btn');
      allStars.forEach(btn => {
        const num = Number(btn.getAttribute('data-star'));
        if (newRating && num <= newRating) {
          btn.classList.add('text-text-primary');
          btn.classList.remove('text-text-secondary');
        } else {
          btn.classList.remove('text-text-primary');
          btn.classList.add('text-text-secondary');
        }
      });
      return;
    }

    // Settings: Rename Category
    const renameCatBtn = e.target.closest('[data-action="rename-category"]');
    if (renameCatBtn) {
      const catId = renameCatBtn.getAttribute('data-category-id');
      const catName = renameCatBtn.getAttribute('data-category-name');

      openRenameModal({
        currentName: catName,
        onConfirm: (newName) => {
          const res = store.renameCategory(catId, newName);
          if (res.success) {
            showToast(`Renamed category to '${newName}'`);
            updateView(renderSettings());
          }
          return res;
        }
      });
      return;
    }

    // Settings: Delete Category
    const deleteCatBtn = e.target.closest('[data-action="delete-category"]');
    if (deleteCatBtn) {
      const catId = deleteCatBtn.getAttribute('data-category-id');
      const catName = deleteCatBtn.getAttribute('data-category-name');

      const res = store.deleteCategory(catId);
      if (res.success) {
        showToast(`Category '${catName}' deleted. Reassigned books to Uncategorized.`);
        updateView(renderSettings());
      } else if (res.error) {
        showToast(res.error, true);
      }
      return;
    }

    // Settings: Default Library View Toggle (Grid / List)
    const prefViewGrid = e.target.closest('#pref-view-grid');
    if (prefViewGrid) {
      store.updateSettings({ defaultLibraryView: 'grid' });
      setLibraryFilter('view', 'grid');
      showToast('Default view set to Grid');
      updateView(renderSettings());
      return;
    }

    const prefViewList = e.target.closest('#pref-view-list');
    if (prefViewList) {
      store.updateSettings({ defaultLibraryView: 'list' });
      setLibraryFilter('view', 'list');
      showToast('Default view set to List');
      updateView(renderSettings());
      return;
    }

    // Settings: Export JSON
    const exportBtn = e.target.closest('#export-library-btn');
    if (exportBtn) {
      store.exportJSON();
      showToast('Library exported as JSON');
      return;
    }
  });

  // Form Submissions
  document.addEventListener('submit', (e) => {
    // 1. Quick Page Update on Book Details
    if (e.target.id === 'quick-page-form') {
      e.preventDefault();
      const hash = window.location.hash;
      const bookId = hash.replace('#book/', '');
      const book = store.getBook(bookId);
      if (!book) return;

      const input = document.getElementById('quick-page-input');
      const errorEl = document.getElementById('quick-page-error');
      const newPage = Number(input.value);

      // Validation
      if (isNaN(newPage) || newPage < 0) {
        input.classList.add('is-invalid');
        errorEl.textContent = 'Current page cannot be negative.';
        errorEl.classList.remove('hidden');
        return;
      }
      if (newPage > book.totalPages) {
        input.classList.add('is-invalid');
        errorEl.textContent = 'Current page cannot exceed total pages';
        errorEl.classList.remove('hidden');
        return;
      }

      // Valid: clear error
      input.classList.remove('is-invalid');
      errorEl.textContent = '';
      errorEl.classList.add('hidden');

      const updated = store.updateBook(bookId, { currentPage: newPage });
      if (updated) {
        const percent = updated.totalPages > 0 ? Math.round((updated.currentPage / updated.totalPages) * 100) : 0;
        const percentEl = document.getElementById('progress-percent');
        const fillEl = document.getElementById('progress-bar-fill');
        const metaPageEl = document.getElementById('meta-current-page');

        if (percentEl) percentEl.textContent = `${percent}% Completed`;
        if (fillEl) fillEl.style.width = `${percent}%`;
        if (metaPageEl) metaPageEl.textContent = updated.currentPage;

        showToast(`Progress updated: ${percent}% completed`);
      }
      return;
    }

    // 2. Add / Edit Book Form
    if (e.target.id === 'book-form') {
      e.preventDefault();
      const form = e.target;
      const mode = form.getAttribute('data-mode');
      const bookId = form.getAttribute('data-book-id');

      const titleInput = document.getElementById('book-title');
      const authorInput = document.getElementById('book-author');
      const categoryInput = document.getElementById('book-category');
      const statusInput = document.getElementById('book-status');
      const totalPagesInput = document.getElementById('book-total-pages');
      const currentPageInput = document.getElementById('book-current-page');
      const coverUrlInput = document.getElementById('book-cover-url');
      const starGroup = document.getElementById('star-selector');
      const notesInput = document.getElementById('book-notes');

      // Clear previous error states
      [titleInput, authorInput, totalPagesInput, currentPageInput].forEach(inp => {
        if (inp) inp.classList.remove('is-invalid');
      });
      document.querySelectorAll('.form-error-msg').forEach(el => {
        el.textContent = '';
        el.classList.add('hidden');
      });

      let hasError = false;

      // Validate Title
      const titleVal = titleInput.value.trim();
      if (!titleVal) {
        titleInput.classList.add('is-invalid');
        const err = document.getElementById('title-error');
        err.textContent = 'Title is required.';
        err.classList.remove('hidden');
        hasError = true;
      }

      // Validate Author
      const authorVal = authorInput.value.trim();
      if (!authorVal) {
        authorInput.classList.add('is-invalid');
        const err = document.getElementById('author-error');
        err.textContent = 'Author is required.';
        err.classList.remove('hidden');
        hasError = true;
      }

      // Validate Total Pages
      const totalVal = Number(totalPagesInput.value);
      if (isNaN(totalVal) || totalVal < 1) {
        totalPagesInput.classList.add('is-invalid');
        const err = document.getElementById('total-pages-error');
        err.textContent = 'Total pages must be at least 1.';
        err.classList.remove('hidden');
        hasError = true;
      }

      // Validate Current Page
      const currentVal = Number(currentPageInput.value) || 0;
      if (isNaN(currentVal) || currentVal < 0) {
        currentPageInput.classList.add('is-invalid');
        const err = document.getElementById('current-page-error');
        err.textContent = 'Current page cannot be negative.';
        err.classList.remove('hidden');
        hasError = true;
      } else if (totalVal > 0 && currentVal > totalVal) {
        currentPageInput.classList.add('is-invalid');
        const err = document.getElementById('current-page-error');
        err.textContent = 'Current page cannot exceed total pages';
        err.classList.remove('hidden');
        hasError = true;
      }

      if (hasError) return;

      const ratingVal = starGroup ? (Number(starGroup.getAttribute('data-rating')) || null) : null;

      const bookData = {
        title: titleVal,
        author: authorVal,
        category: categoryInput.value,
        status: statusInput.value,
        totalPages: totalVal,
        currentPage: currentVal,
        coverUrl: coverUrlInput.value.trim(),
        rating: ratingVal,
        notes: notesInput.value.trim()
      };

      if (mode === 'add') {
        const newBook = store.addBook(bookData);
        showToast('Book added to library');
        window.location.hash = `#book/${newBook.id}`;
      } else {
        const updated = store.updateBook(bookId, bookData);
        showToast('Changes saved');
        window.location.hash = `#book/${bookId}`;
      }
      return;
    }

    // 3. Settings: Add Category Form
    if (e.target.id === 'add-category-form') {
      e.preventDefault();
      const input = document.getElementById('new-category-input');
      const val = input.value.trim();
      if (!val) return;

      const res = store.addCategory(val);
      if (res.error) {
        showToast(res.error, true);
      } else {
        showToast(`Category '${val}' added`);
        input.value = '';
        updateView(renderSettings());
      }
      return;
    }

    // 4. Profile Form Submit
    if (e.target.id === 'profile-form') {
      e.preventDefault();
      const displayNameInput = document.getElementById('profile-display-name');
      const bioInput = document.getElementById('profile-bio');

      store.updateProfile({
        displayName: displayNameInput.value,
        bio: bioInput.value
      });

      showToast('Profile saved');
      updateView(renderProfile());
      return;
    }
  });
}

// Start Application
document.addEventListener('DOMContentLoaded', initApp);
