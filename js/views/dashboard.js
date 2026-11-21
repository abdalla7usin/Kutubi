/**
 * Kutubi - Dashboard View
 */

import { store } from '../store.js';
import { renderListThumbnail, renderTypographicCover, escapeHtml, isArabic } from '../covers.js';

export function renderDashboard() {
  const metrics = store.getMetrics();
  const books = store.getBooks();

  // Filter currently reading (up to 3)
  const readingBooks = books.filter(b => b.status === 'Reading').slice(0, 3);

  // Recently added books (4 most recent)
  const recentBooks = [...books].slice(0, 4);

  return `
    <div class="main-container">
      <!-- Header -->
      <header class="flex items-center justify-between gap-lg">
        <h1 class="font-headline text-headline-lg text-text-primary">Dashboard</h1>
        <a href="#add" class="btn btn-primary" id="dashboard-add-book-btn">
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>
          <span>Add Book</span>
        </a>
      </header>

      <!-- 4 Top Metrics -->
      <section aria-label="Library Summary" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg items-stretch">
        <article class="card card-padded flex flex-col justify-between gap-sm h-full">
          <span class="font-label text-label-md text-text-secondary">Total Books</span>
          <div class="flex flex-col gap-xs">
            <span class="font-headline text-headline-lg text-text-primary tabular-nums" id="metric-total-books">${metrics.total}</span>
            <span class="font-body text-body-md text-text-secondary">Across ${metrics.categoriesCount} categories</span>
          </div>
        </article>

        <article class="card card-padded flex flex-col justify-between gap-sm h-full">
          <span class="font-label text-label-md text-text-secondary">Currently Reading</span>
          <div class="flex flex-col gap-xs">
            <span class="font-headline text-headline-lg text-text-primary tabular-nums" id="metric-reading-books">${metrics.reading}</span>
            <span class="font-body text-body-md text-text-secondary">Active books in progress</span>
          </div>
        </article>

        <article class="card card-padded flex flex-col justify-between gap-sm h-full">
          <span class="font-label text-label-md text-text-secondary">Completed</span>
          <div class="flex flex-col gap-xs">
            <span class="font-headline text-headline-lg text-text-primary tabular-nums" id="metric-completed-books">${metrics.completed}</span>
            <span class="font-body text-body-md text-text-secondary tabular-nums">${metrics.completedPercent}% of library</span>
          </div>
        </article>

        <article class="card card-padded flex flex-col justify-between gap-sm h-full">
          <span class="font-label text-label-md text-text-secondary">To Read</span>
          <div class="flex flex-col gap-xs">
            <span class="font-headline text-headline-lg text-text-primary tabular-nums" id="metric-toread-books">${metrics.toRead}</span>
            <span class="font-body text-body-md text-text-secondary">Queued next</span>
          </div>
        </article>
      </section>

      <!-- Currently Reading Section -->
      <section class="flex flex-col gap-lg">
        <div class="flex items-center justify-between">
          <h2 class="font-title text-title-lg text-text-primary">Currently Reading</h2>
          <a href="#library?status=Reading" class="font-label text-label-md text-text-secondary hover:text-text-primary transition-colors">View all</a>
        </div>

        ${readingBooks.length === 0 ? `
          <div class="card card-padded text-center">
            <p class="font-body text-body-md text-text-secondary">No books currently in progress.</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-lg items-stretch">
            ${readingBooks.map(book => {
              const percent = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;
              const arabic = isArabic(book.title);
              const dir = arabic ? 'rtl' : 'ltr';

              return `
                <a href="#book/${escapeHtml(book.id)}" class="card card-interactive p-lg flex gap-lg h-full">
                  <div class="w-[68px] aspect-[2/3] rounded-cover overflow-hidden border border-border bg-background shrink-0 book-cover-container">
                    ${book.coverUrl ? `
                      <img
                        src="${escapeHtml(book.coverUrl)}"
                        alt="${escapeHtml(book.title)} cover"
                        class="w-full h-full object-cover"
                        loading="lazy"
                        onerror="window.handleCoverError(this, '${escapeHtml(book.title).replace(/'/g, "\\'")}', '${escapeHtml(book.author).replace(/'/g, "\\'")}')"
                      />
                    ` : renderTypographicCover(book.title, book.author, true)}
                  </div>
                  <div class="flex-1 min-w-0 flex flex-col justify-between gap-md" dir="${dir}">
                    <div class="flex flex-col gap-xs">
                      <span class="self-start inline-flex items-center px-sm py-xs rounded-control bg-surface-elevated border border-border font-label text-label-sm text-text-secondary">
                        ${escapeHtml(book.category)}
                      </span>
                      <h3 class="font-title text-title-md text-text-primary leading-snug line-clamp-2" dir="${dir}">
                        ${escapeHtml(book.title)}
                      </h3>
                      <p class="font-body text-body-md text-text-secondary line-clamp-1" dir="${dir}">
                        ${escapeHtml(book.author)}
                      </p>
                    </div>
                    <div class="flex flex-col gap-xs" dir="ltr">
                      <div class="progress-track">
                        <div class="progress-fill" style="width: ${percent}%"></div>
                      </div>
                      <p class="font-label text-label-md text-text-secondary tabular-nums">
                        ${book.currentPage} / ${book.totalPages} pages · ${percent}%
                      </p>
                    </div>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        `}
      </section>

      <!-- Recently Added Section -->
      <section class="flex flex-col gap-lg">
        <div class="flex items-center justify-between">
          <h2 class="font-title text-title-lg text-text-primary">Recently Added</h2>
        </div>

        <div class="card divide-y divide-border overflow-hidden">
          ${recentBooks.map(book => {
            const arabic = isArabic(book.title);
            const statusClass = book.status === 'Reading'
              ? 'badge-status-reading text-text-primary'
              : 'badge-status-completed text-text-secondary';

            return `
              <a href="#book/${escapeHtml(book.id)}" class="flex items-center justify-between gap-lg px-lg py-md hover:bg-surface-elevated transition-colors text-inherit">
                <div class="flex items-center gap-md min-w-0">
                  ${renderListThumbnail(book)}
                  <div class="min-w-0">
                    <p class="font-title text-title-md text-text-primary truncate" dir="${arabic ? 'rtl' : 'ltr'}">
                      ${escapeHtml(book.title)}
                    </p>
                    <p class="font-body text-body-md text-text-secondary truncate" dir="${arabic ? 'rtl' : 'ltr'}">
                      ${escapeHtml(book.author)}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-md sm:gap-lg shrink-0">
                  <span class="badge badge-category hidden sm:inline-flex">${escapeHtml(book.category)}</span>
                  <span class="badge ${statusClass}">${escapeHtml(book.status)}</span>
                  <span class="font-body text-body-md text-text-secondary tabular-nums w-[88px] text-right">${escapeHtml(book.dateAdded)}</span>
                </div>
              </a>
            `;
          }).join('')}
        </div>
      </section>
    </div>
  `;
}
