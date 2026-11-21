/**
 * Kutubi - Add Book & Edit Book Views
 */

import { store } from '../store.js';
import { escapeHtml } from '../covers.js';

export function renderBookForm(bookId = null) {
  const isEdit = Boolean(bookId);
  const book = isEdit ? store.getBook(bookId) : null;
  const categories = store.getCategories();

  if (isEdit && !book) {
    return `
      <div class="main-container form-container text-center pt-2xl">
        <h1 class="font-headline text-headline-lg text-text-primary mb-md">Book Not Found</h1>
        <a href="#library" class="btn btn-secondary">Back to My Library</a>
      </div>
    `;
  }

  const initialTitle = book ? book.title : '';
  const initialAuthor = book ? book.author : '';
  const initialCategory = book ? book.category : (categories[0]?.name || 'Uncategorized');
  const initialStatus = book ? book.status : 'To Read';
  const initialTotalPages = book ? book.totalPages : '';
  const initialCurrentPage = book ? book.currentPage : 0;
  const initialCoverUrl = book ? book.coverUrl : '';
  const initialRating = book ? book.rating : null;
  const initialNotes = book ? book.notes : '';

  return `
    <div class="main-container form-container">
      <!-- Breadcrumb & Header -->
      <header class="flex flex-col gap-sm">
        <nav aria-label="Breadcrumb" class="flex items-center gap-sm">
          <a href="#library" class="font-label text-label-md text-text-secondary hover:text-text-primary transition-colors">
            My Library
          </a>
          <span class="font-label text-label-md text-text-secondary">/</span>
          <span class="font-label text-label-md text-text-primary">
            ${isEdit ? 'Edit Book' : 'Add Book'}
          </span>
        </nav>
        <h1 class="font-headline text-headline-lg text-text-primary">
          ${isEdit ? 'Edit Book' : 'Add a New Book'}
        </h1>
      </header>

      <!-- Form Card -->
      <form id="book-form" data-mode="${isEdit ? 'edit' : 'add'}" data-book-id="${isEdit ? escapeHtml(book.id) : ''}" class="card card-padded flex flex-col gap-lg" novalidate>
        <!-- Title Input -->
        <label class="form-group">
          <span class="form-label">Title *</span>
          <input
            id="book-title"
            name="title"
            type="text"
            required
            value="${escapeHtml(initialTitle)}"
            placeholder="e.g. Designing Data-Intensive Applications"
            class="form-input"
            dir="auto"
          />
          <span id="title-error" class="form-error-msg hidden"></span>
        </label>

        <!-- Author Input -->
        <label class="form-group">
          <span class="form-label">Author *</span>
          <input
            id="book-author"
            name="author"
            type="text"
            required
            value="${escapeHtml(initialAuthor)}"
            placeholder="e.g. Martin Kleppmann"
            class="form-input"
            dir="auto"
          />
          <span id="author-error" class="form-error-msg hidden"></span>
        </label>

        <!-- Category & Reading Status -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-lg">
          <label class="form-group">
            <span class="form-label">Category *</span>
            <select id="book-category" name="category" class="form-select">
              ${categories.map(c => `
                <option value="${escapeHtml(c.name)}" ${initialCategory === c.name ? 'selected' : ''}>
                  ${escapeHtml(c.name)}
                </option>
              `).join('')}
            </select>
          </label>

          <label class="form-group">
            <span class="form-label">Reading Status *</span>
            <select id="book-status" name="status" class="form-select">
              <option value="To Read" ${initialStatus === 'To Read' ? 'selected' : ''}>To Read</option>
              <option value="Reading" ${initialStatus === 'Reading' ? 'selected' : ''}>Reading</option>
              <option value="Completed" ${initialStatus === 'Completed' ? 'selected' : ''}>Completed</option>
            </select>
          </label>
        </div>

        <!-- Total Pages & Current Page -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-lg">
          <label class="form-group">
            <span class="form-label">Total Pages *</span>
            <input
              id="book-total-pages"
              name="totalPages"
              type="number"
              required
              min="1"
              value="${initialTotalPages}"
              placeholder="e.g. 420"
              class="form-input tabular-nums"
            />
            <span id="total-pages-error" class="form-error-msg hidden"></span>
          </label>

          <label class="form-group">
            <span class="form-label">Current Page</span>
            <input
              id="book-current-page"
              name="currentPage"
              type="number"
              min="0"
              value="${initialCurrentPage}"
              placeholder="0"
              class="form-input tabular-nums"
            />
            <span id="current-page-error" class="form-error-msg hidden"></span>
          </label>
        </div>

        <!-- Cover Image URL + 48x72 Live Preview Box -->
        <div class="flex items-end gap-lg">
          <label class="form-group flex-1">
            <span class="form-label">
              Cover Image URL <span class="optional">(Optional)</span>
            </span>
            <input
              id="book-cover-url"
              name="coverUrl"
              type="url"
              value="${escapeHtml(initialCoverUrl)}"
              placeholder="https://..."
              class="form-input"
            />
          </label>
          <div
            id="cover-preview-box"
            class="w-[48px] h-[72px] rounded-cover border border-border bg-background flex items-center justify-center shrink-0 overflow-hidden"
            aria-label="Cover preview"
          >
            ${initialCoverUrl ? `
              <img
                src="${escapeHtml(initialCoverUrl)}"
                alt="Preview"
                class="w-full h-full object-cover"
                onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'material-symbols-outlined text-[18px] text-text-muted\\'>menu_book</span>';"
              />
            ` : `
              <span class="material-symbols-outlined text-[18px] text-text-muted" aria-hidden="true">menu_book</span>
            `}
          </div>
        </div>

        <!-- Interactive 1-5 Star Rating -->
        <div class="form-group">
          <span class="form-label">
            Rating <span class="optional">(Optional)</span>
          </span>
          <div id="star-selector" class="flex items-center gap-xs" role="radiogroup" aria-label="Book rating" data-rating="${initialRating || ''}">
            ${[1, 2, 3, 4, 5].map(num => `
              <button
                type="button"
                data-star="${num}"
                aria-label="${num} star${num > 1 ? 's' : ''}"
                class="p-xs rounded-control star-btn ${initialRating && num <= initialRating ? 'text-text-primary' : 'text-text-secondary'} hover:text-text-primary transition-colors"
              >
                <span class="material-symbols-outlined text-[20px]">star</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Description & Personal Notes -->
        <label class="form-group">
          <span class="form-label">
            Description / Personal Notes <span class="optional">(Optional)</span>
          </span>
          <textarea
            id="book-notes"
            name="notes"
            rows="4"
            placeholder="Write a short summary or your reading notes..."
            class="form-textarea"
            dir="auto"
          >${escapeHtml(initialNotes)}</textarea>
        </label>

        <!-- Footer Actions -->
        <footer class="flex items-center ${isEdit ? 'justify-between' : 'justify-end'} gap-md pt-md border-t border-border">
          ${isEdit ? `
            <button
              type="button"
              id="form-delete-book-btn"
              data-delete-book-id="${escapeHtml(book.id)}"
              data-delete-book-title="${escapeHtml(book.title)}"
              class="btn btn-destructive"
            >
              <span>Delete Book</span>
            </button>
          ` : ''}

          <div class="flex items-center gap-sm">
            <a href="${isEdit ? `#book/${escapeHtml(book.id)}` : '#library'}" class="btn btn-secondary">
              <span>Cancel</span>
            </a>
            <button type="submit" class="btn btn-primary" id="save-book-btn">
              <span>${isEdit ? 'Save Changes' : 'Save Book'}</span>
            </button>
          </div>
        </footer>
      </form>
    </div>
  `;
}
