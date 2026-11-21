/**
 * Kutubi - Formatting & String Utilities
 */

/**
 * Format a Date object or date string into 'MMM DD, YYYY' (e.g. 'Oct 14, 2026')
 * @param {Date|string} date
 * @returns {string}
 */
function formatDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

/**
 * Extract 1-2 uppercase initials from a display name
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  if (!name || typeof name !== 'string') return 'K';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'K';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Check if text contains Arabic characters
 * @param {string} text
 * @returns {boolean}
 */
function isArabic(text) {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Basic HTML escaping for safe injection when needed
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Calculate completion percentage safely (handling 0 total)
 * @param {number} current
 * @param {number} total
 * @returns {number}
 */
function calculatePercentage(current, total) {
  const t = Number(total) || 0;
  const c = Number(current) || 0;
  if (t <= 0) return 0;
  const pct = Math.round((c / t) * 100);
  return Math.min(100, Math.max(0, pct));
}

module.exports = {
  formatDate,
  getInitials,
  isArabic,
  escapeHtml,
  calculatePercentage
};
