/**
 * Kutubi - My Library View (Grid & List with Live Filter/Sort Toolbar)
 */

import { store } from '../store.js';
import { renderBookCover, renderListThumbnail, escapeHtml, isArabic } from '../covers.js';

let currentSearch = '';
let currentStatus = 'All';
let currentCategory = 'All';
let currentSort = 'recently-added';
let currentViewMode = null; // defaults to settings.defaultLibraryView

export function setLibraryFilter(key, value) {
  if (key === 'status') currentStatus = value;
  if (key === 'category') currentCategory = value;
  if (key === 'search') currentSearch = value;
  if (key === 'sort') currentSort = value;
  if (key === 'view') currentViewMode = value;
}

export function resetLibraryFilters() {
  currentSearch = '';
  currentStatus = 'All';
  currentCategory = 'All';
  currentSort = store.getSettings().defaultSortOrder || 'recently-added';
}

export function renderLibrary() {
  const allBooks = store.getBooks();
  const categories = store.getCategories();
  const settings = store.getSettings();

  if (!currentViewMode) {
    currentViewMode = settings.defaultLibraryView || 'grid';
  }

  // Filter books
  let filtered = allBooks.filter(book => {
    // Status filter
    if (currentStatus !== 'All' && book.status !== currentStatus) {
      return false;
    }

    // Category filter
    if (currentCategory !== 'All' && book.category !== currentCategory) {
      return false;
    }

    // Search query (case-insensitive substring on title or author)
    if (currentSearch.trim()) {
      const q = currentSearch.trim().toLowerCase();
      const matchTitle = (book.title || '').toLowerCase().includes(q);
      const matchAuthor = (book.author || '').toLowerCase().includes(q);
      if (!matchTitle && !matchAuthor) return false;
    }

    return true;
  });

  // Sort books
  filtered.sort((a, b) => {
    if (currentSort === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (currentSort === 'progress') {
      const pA = a.totalPages > 0 ? (a.currentPage / a.totalPages) : 0;
      const pB = b.totalPages > 0 ? (b.currentPage / b.totalPages) : 0;
      return pB - pA;
    }
    if (currentSort === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    }
    // Default: recently added (by index in original list or dateAdded)
    return 0; // keeps store order which is newest first
  });

  return `
    <div class="main-container">
      <!-- Header -->
      <header class="flex items-center justify-between gap-lg">
        <div class="flex items-baseline gap-sm">
          <h1 class="font-headline text-headline-lg text-text-primary">My Library</h1>
          <span class="font-body text-body-md text-text-secondary tabular-nums" id="library-book-count">
            ${filtered.length} ${filtered.length === 1 ? 'book' : 'books'}
          </span>
        </div>
        <a href="#add" class="btn btn-primary">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>
          <span>Add Book</span>
        </a>
      </header>

      <!-- Live Filter & Sort Toolbar -->
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-md">
        <div class="flex flex-1 flex-wrap items-center gap-sm">
          <!-- Search Input -->
          <div class="relative flex-1 min-w-[200px] max-w-sm">
            <span class="material-symbols-outlined text-[18px] text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              search
            </span>
            <input
              id="library-search-input"
              type="search"
              value="${escapeHtml(currentSearch)}"
              placeholder="Search by title or author..."
              class="form-input"
              style="padding-left: 36px;"
              dir="auto"
            />
          </div>

          <!-- Status Dropdown -->
          <select id="library-status-select" class="form-select w-auto" data-prefix="Status: ">
            <option value="All" ${currentStatus === 'All' ? 'selected' : ''}>All</option>
            <option value="Reading" ${currentStatus === 'Reading' ? 'selected' : ''}>Reading</option>
            <option value="Completed" ${currentStatus === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="To Read" ${currentStatus === 'To Read' ? 'selected' : ''}>To Read</option>
          </select>

          <!-- Category Dropdown -->
          <select id="library-category-select" class="form-select w-auto" data-prefix="Category: ">
            <option value="All" ${currentCategory === 'All' ? 'selected' : ''}>All</option>
            ${categories.map(c => `
              <option value="${escapeHtml(c.name)}" ${currentCategory === c.name ? 'selected' : ''}>
                ${escapeHtml(c.name)}
              </option>
            `).join('')}
          </select>

          <!-- Sort Dropdown -->
          <select id="library-sort-select" class="form-select w-auto" data-prefix="Sort: ">
            <option value="recently-added" ${currentSort === 'recently-added' ? 'selected' : ''}>Recently Added</option>
            <option value="title" ${currentSort === 'title' ? 'selected' : ''}>Title (A–Z)</option>
            <option value="progress" ${currentSort === 'progress' ? 'selected' : ''}>Progress</option>
            <option value="rating" ${currentSort === 'rating' ? 'selected' : ''}>Highest Rated</option>
          </select>
        </div>

        <!-- Segmented Grid/List Toggle -->
        <div role="group" aria-label="View mode" class="inline-flex items-center p-xs rounded-control bg-surface border border-border shrink-0 self-start md:self-auto">
          <button
            type="button"
            id="toggle-grid-view"
            aria-pressed="${currentViewMode === 'grid' ? 'true' : 'false'}"
            class="inline-flex items-center gap-xs px-sm py-xs rounded-cover ${currentViewMode === 'grid' ? 'bg-surface-elevated text-text-primary' : 'text-text-secondary hover:text-text-primary'} font-label text-label-md transition-colors"
          >
            <span class="material-symbols-outlined text-[16px]">grid_view</span>
            <span>Grid</span>
          </button>
          <button
            type="button"
            id="toggle-list-view"
            aria-pressed="${currentViewMode === 'list' ? 'true' : 'false'}"
            class="inline-flex items-center gap-xs px-sm py-xs rounded-cover ${currentViewMode === 'list' ? 'bg-surface-elevated text-text-primary' : 'text-text-secondary hover:text-text-primary'} font-label text-label-md transition-colors"
          >
            <span class="material-symbols-outlined text-[16px]">view_list</span>
            <span>List</span>
          </button>
        </div>
      </div>

      <!-- Book Content or Empty State -->
      ${filtered.length === 0 ? `
        <!-- Empty State Card -->
        <div class="flex justify-center pt-xl">
          <article class="card card-padded max-w-md w-full flex flex-col items-center text-center gap-md">
            <div class="w-10 h-10 rounded-control bg-background border border-border flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px] text-text-muted">search_off</span>
            </div>
            <header class="flex flex-col items-center gap-xs">
              <h3 class="font-title text-title-lg text-text-primary">No books match your filters</h3>
              <p class="font-body text-body-md text-text-secondary">Try adjusting your search query or selected filters.</p>
            </header>
            <footer class="pt-xs">
              <button id="clear-filters-btn" type="button" class="btn btn-elevated">
                <span>Clear Filters</span>
              </button>
            </footer>
          </article>
        </div>
      ` : currentViewMode === 'grid' ? `
        <!-- 4-Column Book Grid -->
        <section aria-label="Books" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg items-stretch">
          ${filtered.map(book => {
            const arabic = isArabic(book.title);
            const dir = arabic ? 'rtl' : 'ltr';
            const percent = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
            const statusClass = book.status === 'Reading'
              ? 'badge-status-reading text-text-primary'
              : 'badge-status-completed text-text-secondary';

            return `
              <a href="#book/${escapeHtml(book.id)}" class="card card-interactive p-md flex flex-col justify-between gap-md h-full">
                <div class="flex flex-col gap-md">
                  ${renderBookCover(book)}
                  <div class="flex flex-col gap-xs" dir="${dir}">
                    <h2 class="font-title text-title-md text-text-primary leading-snug line-clamp-2" dir="${dir}">
                      ${escapeHtml(book.title)}
                    </h2>
                    <p class="font-body text-body-md text-text-secondary line-clamp-1" dir="${dir}">
                      ${escapeHtml(book.author)}
                    </p>
                  </div>
                </div>

                <div class="flex flex-col gap-sm">
                  ${book.status === 'Reading' ? `
                    <div class="progress-track">
                      <div class="progress-fill" style="width: ${percent}%"></div>
                    </div>
                  ` : ''}
                  <div class="flex items-center justify-between gap-xs">
                    <span class="badge badge-category truncate max-w-[120px]">
                      ${escapeHtml(book.category)}
                    </span>
                    <span class="badge ${statusClass}">
                      ${escapeHtml(book.status)}
                    </span>
                  </div>
                </div>
              </a>
            `;
          }).join('')}
        </section>
      ` : `
        <!-- List View Table -->
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th scope="col" style="width: 40%;">Book</th>
                <th scope="col">Category</th>
                <th scope="col">Status</th>
                <th scope="col" style="width: 180px;">Progress</th>
                <th scope="col">Rating</th>
                <th scope="col" class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(book => {
                const arabic = isArabic(book.title);
                const percent = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
                const statusClass = book.status === 'Reading'
                  ? 'badge-status-reading text-text-primary'
                  : 'badge-status-completed text-text-secondary';

                return `
                  <tr>
                    <td>
                      <div class="flex items-center gap-md">
                        ${renderListThumbnail(book)}
                        <div class="min-w-0" dir="${arabic ? 'rtl' : 'ltr'}">
                          <a href="#book/${escapeHtml(book.id)}" class="font-title text-title-md text-text-primary hover:underline block truncate">
                            ${escapeHtml(book.title)}
                          </a>
                          <p class="font-body text-body-md text-text-secondary truncate">
                            ${escapeHtml(book.author)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-category">${escapeHtml(book.category)}</span>
                    </td>
                    <td>
                      <span class="badge ${statusClass}">${escapeHtml(book.status)}</span>
                    </td>
                    <td>
                      <div class="flex flex-col gap-xs">
                        <div class="progress-track" style="width: 120px;">
                          <div class="progress-fill" style="width: ${percent}%"></div>
                        </div>
                        <span class="font-body text-body-md text-text-secondary tabular-nums">
                          ${book.currentPage} / ${book.totalPages}
                        </span>
                      </div>
                    </td>
                    <td class="tabular-nums font-body text-body-md text-text-secondary">
                      ${book.rating ? `★ ${book.rating}` : '—'}
                    </td>
                    <td class="text-right">
                      <div class="inline-flex items-center gap-xs">
                        <a href="#edit/${escapeHtml(book.id)}" aria-label="Edit ${escapeHtml(book.title)}" class="btn-icon">
                          <span class="material-symbols-outlined text-[18px]">edit</span>
                        </a>
                        <button type="button" data-delete-book-id="${escapeHtml(book.id)}" data-delete-book-title="${escapeHtml(book.title)}" aria-label="Delete ${escapeHtml(book.title)}" class="btn-icon text-text-secondary hover:text-danger">
                          <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}
