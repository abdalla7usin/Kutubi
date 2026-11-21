/**
 * Kutubi - Book Details View
 */

import { store } from '../store.js';
import { renderBookCover, escapeHtml, isArabic } from '../covers.js';

export function renderBookDetails(bookId) {
  const book = store.getBook(bookId);

  if (!book) {
    return `
      <div class="main-container details-container text-center pt-2xl">
        <h1 class="font-headline text-headline-lg text-text-primary mb-md">Book Not Found</h1>
        <p class="font-body text-body-md text-text-secondary mb-xl">The requested book does not exist or has been removed.</p>
        <div>
          <a href="#library" class="btn btn-secondary">Back to My Library</a>
        </div>
      </div>
    `;
  }

  const percent = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
  const arabic = isArabic(book.title);
  const dir = arabic ? 'rtl' : 'ltr';

  const statusClass = book.status === 'Reading'
    ? 'badge-status-reading text-text-primary'
    : 'badge-status-completed text-text-secondary';

  return `
    <div class="main-container details-container">
      <!-- Breadcrumb Header -->
      <header class="flex items-center justify-between gap-lg pb-lg border-b border-border">
        <nav aria-label="Breadcrumb" class="flex items-center gap-sm min-w-0">
          <a href="#library" class="font-label text-label-lg text-text-secondary hover:text-text-primary transition-colors shrink-0">
            My Library
          </a>
          <span class="font-label text-label-lg text-text-secondary shrink-0">/</span>
          <span class="font-label text-label-lg text-text-primary truncate" dir="${dir}">
            ${escapeHtml(book.title)}
          </span>
        </nav>

        <div class="flex items-center gap-sm shrink-0">
          <a href="#edit/${escapeHtml(book.id)}" class="btn btn-secondary">
            <span>Edit Book</span>
          </a>
          <button
            type="button"
            id="details-delete-btn"
            data-delete-book-id="${escapeHtml(book.id)}"
            data-delete-book-title="${escapeHtml(book.title)}"
            class="btn btn-destructive"
          >
            <span>Delete</span>
          </button>
        </div>
      </header>

      <!-- Asymmetric Two-Column Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-2xl items-start">
        <!-- Left Column: Cover + Interactive Reading Progress Card -->
        <div class="flex flex-col gap-lg">
          <div class="w-full">
            ${renderBookCover(book, 'shadow-sm')}
          </div>

          <!-- Reading Progress Card -->
          <section class="card card-padded flex flex-col gap-md">
            <div class="flex items-center justify-between">
              <h2 class="font-title text-title-md text-text-primary">Reading Progress</h2>
              <span id="progress-percent" class="font-label text-label-md text-text-secondary tabular-nums">
                ${percent}% Completed
              </span>
            </div>

            <div class="progress-track">
              <div id="progress-bar-fill" class="progress-fill" style="width: ${percent}%;"></div>
            </div>

            <form id="quick-page-form" class="flex flex-col gap-xs pt-xs">
              <div class="flex items-center justify-between gap-sm">
                <div class="flex items-center gap-xs">
                  <label for="quick-page-input" class="sr-only">Current page</label>
                  <input
                    id="quick-page-input"
                    type="number"
                    min="0"
                    max="${book.totalPages}"
                    value="${book.currentPage}"
                    class="form-input text-center tabular-nums"
                    style="width: 68px; padding: 6px 8px;"
                  />
                  <span class="font-body text-body-md text-text-secondary tabular-nums whitespace-nowrap">
                    / ${book.totalPages} pages
                  </span>
                </div>
                <button type="submit" class="btn btn-secondary" style="padding: 6px 14px;">
                  <span>Update</span>
                </button>
              </div>
              <div id="quick-page-error" class="form-error-msg hidden"></div>
            </form>
          </section>
        </div>

        <!-- Right Column: Status & Category, Title, Metadata Grid, Notes -->
        <div class="flex flex-col gap-xl min-w-0">
          <div class="flex flex-col gap-sm" dir="${dir}">
            <div class="flex items-center gap-sm" dir="ltr">
              <span class="badge ${statusClass}">${escapeHtml(book.status)}</span>
              <span class="badge badge-category">${escapeHtml(book.category)}</span>
            </div>
            <h1 class="font-headline text-headline-lg text-text-primary text-balance" dir="${dir}">
              ${escapeHtml(book.title)}
            </h1>
            <p class="font-body text-body-lg text-text-secondary" dir="${dir}">
              ${escapeHtml(book.author)}
            </p>
          </div>

          <!-- Metadata Grid -->
          <dl class="grid grid-cols-2 sm:grid-cols-4 gap-md bg-surface border border-border rounded-card p-lg">
            <div class="flex flex-col gap-xs">
              <dt class="font-label text-label-sm text-text-secondary">Total Pages</dt>
              <dd class="font-title text-title-md text-text-primary tabular-nums">${book.totalPages}</dd>
            </div>
            <div class="flex flex-col gap-xs">
              <dt class="font-label text-label-sm text-text-secondary">Current Page</dt>
              <dd id="meta-current-page" class="font-title text-title-md text-text-primary tabular-nums">${book.currentPage}</dd>
            </div>
            <div class="flex flex-col gap-xs">
              <dt class="font-label text-label-sm text-text-secondary">Rating</dt>
              <dd class="font-title text-title-md text-text-primary tabular-nums">${book.rating ? `${book.rating}/5` : '—'}</dd>
            </div>
            <div class="flex flex-col gap-xs">
              <dt class="font-label text-label-sm text-text-secondary">Added</dt>
              <dd class="font-title text-title-md text-text-primary tabular-nums">${escapeHtml(book.dateAdded || 'Oct 14, 2026')}</dd>
            </div>
          </dl>

          <!-- Description & Personal Notes -->
          <section class="card card-padded flex flex-col gap-md">
            <h2 class="font-title text-title-lg text-text-primary">Description &amp; Personal Notes</h2>
            <div class="font-body text-body-lg text-text-secondary" style="white-space: pre-line; line-height: 1.6;" dir="auto">
              ${book.notes ? escapeHtml(book.notes) : '<em class="text-text-muted">No personal notes added for this book yet.</em>'}
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}
