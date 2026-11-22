/**
 * Kutubi - Deterministic Book Cover Component & Error Handling
 * Generates beautiful, responsive vector artwork and typographic covers.
 * Ensures 100% ZERO broken images.
 */

export function isArabic(text) {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates a clean, minimalist monochrome SVG cover.
 * High-craft vector graphic inspired by vintage Penguin / Faber & Faber / O'Reilly.
 */
export function generateSvgCover(title, author, category = 'General') {
  const arabic = isArabic(title);
  const textAnchor = arabic ? 'end' : 'start';
  const textX = arabic ? '260' : '40';
  const dir = arabic ? 'rtl' : 'ltr';

  // Deterministic decorative pattern based on category
  let patternSvg = '';
  if (category === 'Engineering') {
    patternSvg = `
      <g stroke="#242429" stroke-width="1.5" fill="none">
        <circle cx="150" cy="225" r="70" />
        <circle cx="150" cy="225" r="40" stroke-dasharray="4,4" />
        <line x1="80" y1="225" x2="220" y2="225" />
        <line x1="150" y1="155" x2="150" y2="295" />
        <rect x="110" y="185" width="80" height="80" stroke="#3F3F46" />
        <circle cx="150" cy="225" r="6" fill="#EDEDEF" />
      </g>
    `;
  } else if (category === 'Arabic Literature') {
    patternSvg = `
      <g stroke="#242429" stroke-width="1.5" fill="none">
        <path d="M 150 150 C 120 180, 110 200, 110 230 C 110 260, 130 280, 150 280 C 170 280, 190 260, 190 230 C 190 200, 180 180, 150 150 Z" />
        <path d="M 150 170 C 130 195, 125 210, 125 230 C 125 250, 135 265, 150 265 C 165 265, 175 250, 175 230 C 175 210, 170 195, 150 170 Z" stroke="#3F3F46" />
        <line x1="100" y1="230" x2="200" y2="230" stroke="#242429" stroke-dasharray="3,3" />
        <circle cx="150" cy="230" r="4" fill="#EDEDEF" />
      </g>
    `;
  } else if (category === 'Fiction & Sci-Fi') {
    patternSvg = `
      <g stroke="#242429" stroke-width="1.5" fill="none">
        <ellipse cx="150" cy="225" rx="80" ry="25" transform="rotate(-25 150 225)" />
        <circle cx="150" cy="225" r="38" fill="#121214" stroke="#3F3F46" />
        <ellipse cx="150" cy="225" rx="80" ry="25" stroke-dasharray="4,4" transform="rotate(35 150 225)" />
        <circle cx="150" cy="225" r="5" fill="#EDEDEF" />
      </g>
    `;
  } else if (category === 'Self-Development') {
    patternSvg = `
      <g stroke="#242429" stroke-width="1.5" fill="none">
        <rect x="110" y="240" width="80" height="20" rx="2" />
        <rect x="120" y="210" width="60" height="20" rx="2" stroke="#3F3F46" />
        <rect x="130" y="180" width="40" height="20" rx="2" />
        <circle cx="150" cy="155" r="6" fill="#EDEDEF" />
      </g>
    `;
  } else {
    patternSvg = `
      <g stroke="#242429" stroke-width="1.5" fill="none">
        <rect x="110" y="180" width="80" height="90" rx="4" />
        <line x1="125" y1="180" x2="125" y2="270" stroke="#3F3F46" />
        <line x1="140" y1="205" x2="175" y2="205" />
        <line x1="140" y1="225" x2="175" y2="225" />
        <line x1="140" y1="245" x2="165" y2="245" />
      </g>
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" width="100%" height="100%">
      <rect width="300" height="450" fill="#0E0E10" />
      <!-- Book spine line -->
      <line x1="18" y1="0" x2="18" y2="450" stroke="#242429" stroke-width="2" />
      <rect x="0" y="0" width="18" height="450" fill="#151518" />

      <!-- Top brand mark -->
      <text x="40" y="44" fill="#6E6E77" font-family="'Inter', sans-serif" font-size="11" font-weight="600" letter-spacing="2">KUTUBI</text>
      
      <!-- Central decorative artwork -->
      ${patternSvg}

      <!-- Bottom meta: Title and Author -->
      <g dir="${dir}">
        <text x="${textX}" y="360" fill="#F4F4F5" font-family="${arabic ? "'IBM Plex Sans Arabic', sans-serif" : "'Inter', sans-serif"}" font-size="16" font-weight="600" text-anchor="${textAnchor}">
          ${escapeHtml(title.length > 24 ? title.slice(0, 22) + '...' : title)}
        </text>
        <text x="${textX}" y="388" fill="#A1A1AA" font-family="${arabic ? "'IBM Plex Sans Arabic', sans-serif" : "'Inter', sans-serif"}" font-size="13" font-weight="400" text-anchor="${textAnchor}">
          ${escapeHtml(author.length > 28 ? author.slice(0, 26) + '...' : author)}
        </text>
      </g>

      <!-- Hairline outer border -->
      <rect x="0" y="0" width="300" height="450" fill="none" stroke="#242429" stroke-width="2" />
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Renders the 2:3 Typographic Fallback Cover matching the Stitch design system.
 */
export function renderTypographicCover(title, author, isCompact = false) {
  const arabic = isArabic(title);
  const dir = arabic ? 'rtl' : 'ltr';
  const fontClass = arabic ? 'font-arabic text-arabic-md' : 'font-title text-title-md';
  const authorFontClass = arabic ? 'font-arabic text-arabic-sm' : 'font-body text-body-md';

  if (isCompact) {
    return `
      <div class="typographic-cover" dir="${dir}">
        <div class="typographic-spine" style="width: 6px;"></div>
        <div class="typographic-content" style="padding: 6px;">
          <span class="typographic-mark" dir="ltr" style="font-size: 8px;">K</span>
          <div class="typographic-meta" style="gap: 2px;">
            <span class="${fontClass} font-semibold text-text-primary line-clamp-2" style="font-size: 10px; line-height: 12px;">
              ${escapeHtml(title)}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="typographic-cover" dir="${dir}">
      <div class="typographic-spine"></div>
      <div class="typographic-content">
        <span class="typographic-mark" dir="ltr">KUTUBI</span>
        <div class="typographic-meta">
          <span class="${fontClass} font-semibold text-text-primary typographic-title">${escapeHtml(title)}</span>
          <span class="${authorFontClass} text-text-secondary typographic-author">${escapeHtml(author)}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Resolves the effective cover URL based on priority:
 * 1. User manual override (coverUrl)
 * 2. Generated PDF cover (coverImage)
 * 3. Null (triggers typographic fallback)
 * @param {object} book
 * @returns {string|null}
 */
export function getEffectiveCoverUrl(book) {
  if (!book) return null;
  if (book.coverUrl && book.coverUrl.trim()) {
    return book.coverUrl.trim();
  }
  if (book.coverImage && book.coverImage.trim()) {
    return `/storage/covers/${book.coverImage.trim()}`;
  }
  return null;
}

/**
 * Renders a full 2:3 cover container (either image or typographic fallback)
 */
export function renderBookCover(book, customClass = '') {
  const { title, author } = book;
  const effectiveCover = getEffectiveCoverUrl(book);

  if (!effectiveCover) {
    return `
      <div class="book-cover-container ${customClass}" data-cover-for="${escapeHtml(book.id)}">
        ${renderTypographicCover(title, author)}
      </div>
    `;
  }

  return `
    <div class="book-cover-container ${customClass}" data-cover-for="${escapeHtml(book.id)}">
      <img
        src="${escapeHtml(effectiveCover)}"
        alt="${escapeHtml(title)} cover"
        class="book-cover-img"
        loading="lazy"
        onerror="window.handleCoverError(this, '${escapeHtml(title).replace(/'/g, "\\'")}', '${escapeHtml(author).replace(/'/g, "\\'")}')"
      />
    </div>
  `;
}

/**
 * Renders list view small thumbnail (36x54px)
 * For books without cover: centered minimal book icon inside bordered dark rectangle.
 */
export function renderListThumbnail(book) {
  const { title } = book;
  const effectiveCover = getEffectiveCoverUrl(book);

  if (!effectiveCover) {
    return `
      <div class="list-thumb" aria-hidden="true">
        <span class="material-symbols-outlined text-[18px] text-text-muted">menu_book</span>
      </div>
    `;
  }

  return `
    <div class="list-thumb">
      <img
        src="${escapeHtml(effectiveCover)}"
        alt="${escapeHtml(title)}"
        class="list-thumb-img"
        loading="lazy"
        onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'material-symbols-outlined text-[18px] text-text-muted\\'>menu_book</span>';"
      />
    </div>
  `;
}

/**
 * Global error handler for broken cover images
 */
window.handleCoverError = function(imgElement, title, author) {
  const container = imgElement.closest('.book-cover-container') || imgElement.parentElement;
  if (container) {
    const isSmall = container.clientWidth < 100;
    container.innerHTML = renderTypographicCover(title, author, isSmall);
  }
};
