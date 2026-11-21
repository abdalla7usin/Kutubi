/**
 * Kutubi - Modal Management (Delete Confirmation & Rename Category)
 */

import { escapeHtml } from './covers.js';

let activeModal = null;
let previousActiveElement = null;

export function openDeleteModal({ title, message, confirmText = 'Delete Book', onConfirm }) {
  previousActiveElement = document.activeElement;
  const container = document.getElementById('modal-container');
  if (!container) return;

  const desc = message || 'This will permanently remove the book and your reading notes from your library. This action cannot be undone.';
  const heading = title.startsWith('Delete') || title.startsWith('Reset') ? escapeHtml(title) : `Delete '${escapeHtml(title)}'?`;

  container.innerHTML = `
    <div class="modal-backdrop open" id="delete-modal-backdrop">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-alert-title"
        aria-describedby="modal-alert-desc"
        class="modal-card"
        tabindex="-1"
      >
        <header class="flex items-start justify-between gap-md">
          <h2 id="modal-alert-title" class="font-title text-title-lg text-text-primary">
            ${heading}
          </h2>
        </header>

        <div id="modal-alert-desc">
          <p class="font-body text-body-md text-text-secondary">
            ${escapeHtml(desc)}
          </p>
        </div>

        <footer class="flex items-center justify-end gap-sm pt-xs">
          <button type="button" id="modal-cancel-btn" class="btn btn-elevated">
            <span>Cancel</span>
          </button>
          <button type="button" id="modal-confirm-btn" class="btn btn-destructive-solid">
            <span>${escapeHtml(confirmText)}</span>
          </button>
        </footer>
      </div>
    </div>
  `;

  activeModal = {
    backdrop: document.getElementById('delete-modal-backdrop'),
    close() {
      if (activeModal && activeModal.backdrop) {
        activeModal.backdrop.classList.remove('open');
        setTimeout(() => {
          container.innerHTML = '';
          activeModal = null;
          if (previousActiveElement) previousActiveElement.focus();
        }, 160);
      }
    }
  };

  const cancelBtn = document.getElementById('modal-cancel-btn');
  const confirmBtn = document.getElementById('modal-confirm-btn');

  cancelBtn.addEventListener('click', () => activeModal.close());
  confirmBtn.addEventListener('click', () => {
    activeModal.close();
    onConfirm();
  });

  activeModal.backdrop.addEventListener('click', (e) => {
    if (e.target === activeModal.backdrop) {
      activeModal.close();
    }
  });

  cancelBtn.focus();
}

export function openRenameModal({ currentName, onConfirm }) {
  previousActiveElement = document.activeElement;
  const container = document.getElementById('modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal-backdrop open" id="rename-modal-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-rename-title"
        class="modal-card"
        tabindex="-1"
      >
        <header class="flex items-start justify-between gap-md">
          <h2 id="modal-rename-title" class="font-title text-title-lg text-text-primary">
            Rename Category
          </h2>
        </header>

        <form id="rename-category-form" class="flex flex-col gap-sm">
          <label class="form-group">
            <span class="form-label">Category Name</span>
            <input
              id="rename-category-input"
              type="text"
              required
              value="${escapeHtml(currentName)}"
              class="form-input"
              autocomplete="off"
            />
            <span id="rename-error" class="form-error-msg hidden"></span>
          </label>

          <footer class="flex items-center justify-end gap-sm pt-sm">
            <button type="button" id="modal-rename-cancel-btn" class="btn btn-secondary">
              <span>Cancel</span>
            </button>
            <button type="submit" class="btn btn-primary">
              <span>Save</span>
            </button>
          </footer>
        </form>
      </div>
    </div>
  `;

  activeModal = {
    backdrop: document.getElementById('rename-modal-backdrop'),
    close() {
      if (activeModal && activeModal.backdrop) {
        activeModal.backdrop.classList.remove('open');
        setTimeout(() => {
          container.innerHTML = '';
          activeModal = null;
          if (previousActiveElement) previousActiveElement.focus();
        }, 160);
      }
    }
  };

  const form = document.getElementById('rename-category-form');
  const input = document.getElementById('rename-category-input');
  const errorEl = document.getElementById('rename-error');
  const cancelBtn = document.getElementById('modal-rename-cancel-btn');

  cancelBtn.addEventListener('click', () => activeModal.close());

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = input.value.trim();
    if (!newName) {
      input.classList.add('is-invalid');
      errorEl.textContent = 'Category name cannot be empty.';
      errorEl.classList.remove('hidden');
      return;
    }
    const result = onConfirm(newName);
    if (result && result.error) {
      input.classList.add('is-invalid');
      errorEl.textContent = result.error;
      errorEl.classList.remove('hidden');
      return;
    }
    activeModal.close();
  });

  activeModal.backdrop.addEventListener('click', (e) => {
    if (e.target === activeModal.backdrop) {
      activeModal.close();
    }
  });

  input.focus();
  input.select();
}

// Global escape key listener
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeModal) {
    activeModal.close();
  }
});
