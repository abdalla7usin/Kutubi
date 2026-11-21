/**
 * Kutubi - Server-side Input Validation
 */

/**
 * Validate book input data for creation or update
 * @param {object} data
 * @returns {{ isValid: boolean, errors: Record<string, string>, normalized: object }}
 */
function validateBookInput(data) {
  const errors = {};
  const normalized = {};

  // Title (required, trimmed)
  const title = (data.title || '').trim();
  if (!title) {
    errors.title = 'Title is required.';
  } else if (title.length > 255) {
    errors.title = 'Title cannot exceed 255 characters.';
  } else {
    normalized.title = title;
  }

  // Author (required, trimmed)
  const author = (data.author || '').trim();
  if (!author) {
    errors.author = 'Author is required.';
  } else if (author.length > 255) {
    errors.author = 'Author cannot exceed 255 characters.';
  } else {
    normalized.author = author;
  }

  // Total Pages (required, integer >= 1)
  const totalPages = parseInt(data.totalPages, 10);
  if (isNaN(totalPages) || totalPages < 1) {
    errors.totalPages = 'Total pages must be a positive integer greater than or equal to 1.';
  } else {
    normalized.totalPages = totalPages;
  }

  // Current Page (optional, integer >= 0, <= totalPages)
  let currentPage = 0;
  if (data.currentPage !== undefined && data.currentPage !== '' && data.currentPage !== null) {
    currentPage = parseInt(data.currentPage, 10);
    if (isNaN(currentPage) || currentPage < 0) {
      errors.currentPage = 'Current page cannot be negative.';
    } else if (!isNaN(totalPages) && currentPage > totalPages) {
      errors.currentPage = 'Current page cannot exceed total pages.';
    } else {
      normalized.currentPage = currentPage;
    }
  } else {
    normalized.currentPage = 0;
  }

  // Status (enum: 'Reading', 'Completed', 'To Read')
  const allowedStatuses = ['Reading', 'Completed', 'To Read'];
  let status = data.status || 'To Read';
  if (!allowedStatuses.includes(status)) {
    status = 'To Read';
  }
  normalized.status = status;

  // Rating (optional, integer 1-5 or null)
  if (data.rating !== undefined && data.rating !== '' && data.rating !== null) {
    const rating = parseInt(data.rating, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      errors.rating = 'Rating must be an integer between 1 and 5.';
    } else {
      normalized.rating = rating;
    }
  } else {
    normalized.rating = null;
  }

  // Category ID
  if (data.categoryId) {
    const catId = parseInt(data.categoryId, 10);
    if (isNaN(catId) || catId < 1) {
      errors.categoryId = 'Invalid category selected.';
    } else {
      normalized.categoryId = catId;
    }
  }

  // Cover URL (optional, trimmed, validate protocol if present)
  const coverUrl = (data.coverUrl || '').trim();
  if (coverUrl) {
    if (!coverUrl.startsWith('http://') && !coverUrl.startsWith('https://') && !coverUrl.startsWith('data:image/')) {
      errors.coverUrl = 'Cover URL must start with http://, https://, or be a valid data URI.';
    } else {
      normalized.coverUrl = coverUrl;
    }
  } else {
    normalized.coverUrl = '';
  }

  // Description / Notes (optional, trimmed)
  normalized.description = (data.description || data.notes || '').trim();

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized
  };
}

/**
 * Validate reading progress update
 * @param {number|string} currentPageInput
 * @param {number} totalPages
 * @returns {{ isValid: boolean, error?: string, currentPage?: number }}
 */
function validateProgressInput(currentPageInput, totalPages) {
  if (currentPageInput === undefined || currentPageInput === null || currentPageInput === '') {
    return { isValid: false, error: 'Current page is required.' };
  }

  const cp = Number(currentPageInput);
  if (!Number.isInteger(cp)) {
    return { isValid: false, error: 'Current page must be a whole number.' };
  }

  if (cp < 0) {
    return { isValid: false, error: 'Current page cannot be negative.' };
  }

  if (cp > totalPages) {
    return { isValid: false, error: 'Current page cannot exceed total pages.' };
  }

  return { isValid: true, currentPage: cp };
}

/**
 * Validate category name
 * @param {string} name
 * @returns {{ isValid: boolean, error?: string, name?: string }}
 */
function validateCategoryName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Category name is required.' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Category name cannot be empty.' };
  }

  if (trimmed.length > 60) {
    return { isValid: false, error: 'Category name cannot exceed 60 characters.' };
  }

  return { isValid: true, name: trimmed };
}

module.exports = {
  validateBookInput,
  validateProgressInput,
  validateCategoryName
};
