/**
 * Kutubi - Settings View
 */

import { store } from '../store.js';
import { escapeHtml } from '../covers.js';

export function renderSettings() {
  const categories = store.getCategories();
  const settings = store.getSettings();

  return `
    <div class="main-container narrow">
      <!-- Header -->
      <header class="flex flex-col gap-xs">
        <h1 class="font-headline text-[22px] font-semibold leading-snug text-text-primary">Settings</h1>
        <p class="font-body text-body-md text-text-secondary">Manage application preferences and library categories.</p>
      </header>

      <!-- Section 1: Categories Management -->
      <section class="card card-padded flex flex-col gap-lg">
        <div class="flex flex-col gap-xs">
          <h2 class="font-title text-title-lg text-text-primary">Categories</h2>
        </div>

        <!-- Inline Add Category Bar -->
        <form id="add-category-form" class="flex items-center gap-sm">
          <label for="new-category-input" class="sr-only">New category name</label>
          <input
            id="new-category-input"
            type="text"
            placeholder="New category name..."
            class="form-input flex-1"
            autocomplete="off"
          />
          <button type="submit" class="btn btn-primary shrink-0">
            <span class="material-symbols-outlined text-[16px]" aria-hidden="true">add</span>
            <span>Add</span>
          </button>
        </form>

        <!-- Category Rows -->
        <div class="border border-border rounded-control divide-y divide-border overflow-hidden bg-background">
          ${categories.map(cat => {
            const count = store.getCategoryBookCount(cat.name);
            return `
              <div class="flex items-center justify-between gap-md px-lg py-md hover:bg-surface-elevated transition-colors" data-category-id="${escapeHtml(cat.id)}">
                <div class="flex items-center gap-sm">
                  <span class="font-title text-title-md ${cat.isSystem ? 'text-text-secondary' : 'text-text-primary'}">
                    ${escapeHtml(cat.name)}
                  </span>
                  <span class="font-body text-body-md text-text-secondary tabular-nums">
                    (${count}${cat.isSystem ? ' · System default' : ''})
                  </span>
                </div>

                ${cat.isSystem ? '' : `
                  <div class="flex items-center gap-xs">
                    <button
                      type="button"
                      data-action="rename-category"
                      data-category-id="${escapeHtml(cat.id)}"
                      data-category-name="${escapeHtml(cat.name)}"
                      aria-label="Rename ${escapeHtml(cat.name)}"
                      class="btn-icon"
                    >
                      <span class="material-symbols-outlined text-[16px]" aria-hidden="true">edit</span>
                    </button>
                    <button
                      type="button"
                      data-action="delete-category"
                      data-category-id="${escapeHtml(cat.id)}"
                      data-category-name="${escapeHtml(cat.name)}"
                      aria-label="Delete ${escapeHtml(cat.name)}"
                      class="btn-icon text-text-secondary hover:text-danger"
                    >
                      <span class="material-symbols-outlined text-[16px]" aria-hidden="true">delete</span>
                    </button>
                  </div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Section 2: Reading & Display Preferences -->
      <section class="card card-padded flex flex-col gap-lg">
        <h2 class="font-title text-title-lg text-text-primary">Reading &amp; Display Preferences</h2>

        <div class="flex flex-col divide-y divide-border">
          <!-- Default Library View -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-md py-md first:pt-0">
            <div class="flex flex-col gap-xs">
              <span class="font-title text-title-md text-text-primary">Default Library View</span>
              <span class="font-body text-body-md text-text-secondary">Choose how books are laid out when opening My Library.</span>
            </div>
            <div role="group" aria-label="Default Library View" class="inline-flex items-center p-xs rounded-control bg-background border border-border shrink-0 self-start sm:self-auto">
              <button
                type="button"
                id="pref-view-grid"
                aria-pressed="${settings.defaultLibraryView === 'grid' ? 'true' : 'false'}"
                class="px-md py-xs rounded-cover ${settings.defaultLibraryView === 'grid' ? 'bg-surface-elevated text-text-primary' : 'text-text-secondary hover:text-text-primary'} font-label text-label-md transition-colors"
              >
                <span>Grid View</span>
              </button>
              <button
                type="button"
                id="pref-view-list"
                aria-pressed="${settings.defaultLibraryView === 'list' ? 'true' : 'false'}"
                class="px-md py-xs rounded-cover ${settings.defaultLibraryView === 'list' ? 'bg-surface-elevated text-text-primary' : 'text-text-secondary hover:text-text-primary'} font-label text-label-md transition-colors"
              >
                <span>List View</span>
              </button>
            </div>
          </div>

          <!-- Default Sort Order -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-md py-md">
            <div class="flex flex-col gap-xs">
              <label for="settings-default-sort" class="font-title text-title-md text-text-primary">Default Sort Order</label>
              <span class="font-body text-body-md text-text-secondary">Initial ordering applied to your book collection.</span>
            </div>
            <select id="settings-default-sort" class="form-select w-auto shrink-0 self-start sm:self-auto">
              <option value="recently-added" ${settings.defaultSortOrder === 'recently-added' ? 'selected' : ''}>Recently Added</option>
              <option value="title" ${settings.defaultSortOrder === 'title' ? 'selected' : ''}>Title A–Z</option>
              <option value="progress" ${settings.defaultSortOrder === 'progress' ? 'selected' : ''}>Progress %</option>
              <option value="rating" ${settings.defaultSortOrder === 'rating' ? 'selected' : ''}>Highest Rated</option>
            </select>
          </div>

          <!-- Data Management -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-md pt-md">
            <div class="flex flex-col gap-xs">
              <span class="font-title text-title-md text-text-primary">Data Management</span>
              <span class="font-body text-body-md text-text-secondary">Back up your catalog or restore sample titles.</span>
            </div>
            <div class="flex flex-wrap items-center gap-sm shrink-0">
              <button type="button" id="export-library-btn" class="btn btn-secondary">
                <span>Export Library (JSON)</span>
              </button>
              <button type="button" id="reset-sample-btn" class="btn btn-secondary">
                <span>Reset Sample Data</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}
