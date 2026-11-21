/**
 * Kutubi - Minimalist Toast Notification System
 */

export function showToast(message, isError = false, duration = 3200) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast-error' : ''}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[16px]">${isError ? 'error' : 'check_circle'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 160ms cubic-bezier(0.2, 0, 0, 1) forwards';
    setTimeout(() => {
      toast.remove();
    }, 180);
  }, duration);
}
