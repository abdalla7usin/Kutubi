# Kutubi (كتبي) — Frontend Architecture & Backend Handoff Specification

> **Target Audience:** Backend Engineers & AI Coding Agents (ChatGPT / Claude / Copilot).  
> **Objective:** Build and wire a **Node.js + Express + SQLite + EJS** server-rendered backend to this existing frontend without breaking or rewriting any design system tokens, components, or client-side UX behaviors.

---

## 1. Executive Summary & Design System Guardrails

**Kutubi** is a dark, ultra-minimalist personal book library manager inspired by the craft and precision of **Linear** and **Raycast**.

### Critical Non-Negotiable Frontend Rules
1. **Strict Grayscale Aesthetic:** Zero bright colors, zero gradients, zero glow, and zero drop shadows. All surfaces are monochromatic (`#0B0B0C`, `#121214`, `#1A1A1E`), hairline borders are `1px solid #242429` (focus `#3F3F46`), and text hierarchy follows `#F4F4F5`, `#A1A1AA`, and `#6E6E77`. Destructive actions use muted `#E5484D`.
2. **Typography & Internationalization:**
   - Font families: `Inter` (Latin) and `IBM Plex Sans Arabic` (Arabic).
   - Numerical display: All counters, page numbers, percentages, dates, and ratings **must** include the CSS class `tabular-nums` (`font-variant-numeric: tabular-nums`).
   - Directionality: All book titles, authors, descriptions, and user notes **must** include `dir="auto"` so Arabic and English render naturally.
3. **No Broken Images:** Every book cover must render valid artwork or gracefully fall back to the deterministic typographic cover component (`js/covers.js`).
4. **Custom Minimalist Dropdowns (`js/dropdown.js`):** All `<select>` elements are automatically enhanced into Raycast-inspired dark grayscale dropdowns. The backend must retain standard `<select name="...">` elements so standard form submissions work out of the box.

---

## 2. Directory Structure & File Responsibilities

```
d:\THE DECAGON\OTHER\Kutubi\
├── index.html                  # Main SPA shell (Sidebar, drawer, modal & toast outlets)
├── css/
│   ├── tokens.css              # Design tokens (colors, radii, spacing, typography, motion)
│   └── styles.css              # Component CSS (buttons, custom dropdowns, covers, modals, tables)
├── js/
│   ├── seedData.js             # 24 initial books, 5 categories, default profile & settings
│   ├── store.js                # Reactive localStorage store, state transitions & business logic
│   ├── covers.js               # SVG cover generator, typographic spine covers, list thumbnails
│   ├── dropdown.js             # Custom minimalist dropdown component (replaces native OS popups)
│   ├── modal.js                # Alert confirmation modals (Delete book, Rename category)
│   ├── toast.js                # Minimalist floating toast notification system
│   ├── views/
│   │   ├── dashboard.js        # Dashboard view (4 metrics, Currently Reading, Recently Added)
│   │   ├── library.js          # Library view (Grid/List toggle, live search, filters, empty state)
│   │   ├── bookDetails.js      # Book Details (inline reading progress updater, metadata grid)
│   │   ├── bookForm.js         # Add & Edit Book forms (cover preview, 1-5 stars, validation)
│   │   ├── settings.js         # Settings (Categories CRUD, default view/sort, JSON export, reset)
│   │   └── profile.js          # Profile (dynamic initials avatar, bio, milestone metrics)
│   └── app.js                  # Client router, sidebar collapse controller, event delegation
├── verify_app.py               # 14-step automated Playwright end-to-end test suite
├── verify_dropdowns.py         # 21-step automated Playwright dropdown verification suite
└── screenshots/                # Reference UI screenshots of all 8 screens and interactive states
```

### Detailed File Responsibilities
- **`css/tokens.css`:** Declares CSS Custom Properties for backgrounds (`--bg-primary`, `--surface-primary`, `--surface-elevated`), borders (`--border-subtle`, `--border-focus`), text (`--text-primary`, `--text-secondary`, `--text-muted`), accent/danger (`--accent-primary`, `--danger`), corner radii (`--radius-control: 6px`, `--radius-card: 8px`, `--radius-cover: 4px`), and transition timings (`150ms–200ms cubic-bezier(0.2, 0, 0, 1)`).
- **`css/styles.css`:** Contains styling for buttons (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-elevated`, `.btn-icon`), custom dropdowns (`.custom-dropdown`, `.custom-dropdown-trigger`, `.custom-dropdown-menu`, `.custom-dropdown-item`), typographic covers (`.typographic-cover`, `.book-cover-spine`), thumbnails (`.list-thumbnail`), progress bars, data tables, modals, and toasts.
- **`js/covers.js`:** Exports `renderBookCover(book)`, `renderListThumbnail(book)`, `escapeHtml(str)`, and `isArabic(str)`. Handles SVG artwork generation and fallback to the dark typographic cover with a vertical spine line and `KUTUBI` mark.
- **`js/dropdown.js`:** Scans for `<select>` elements and builds accessible, keyboard-navigable popovers. Keeps underlying native `<select>` synchronized with `.value` and dispatches native `change` events.
- **`js/modal.js`:** Manages accessible dialogs (`openDeleteModal`, `openRenameModal`) with focus trap, `Escape` key listeners, and backdrop click dismissal.
- **`js/toast.js`:** Exposes `showToast(message, isError)` displaying transient notification pills in the bottom-right corner.

---

## 3. Data Schemas & SQLite Database Specification

### 3.1 Field-by-Field Schema Specifications

#### 1. `Book` Object
| Field Name | Type | SQLite Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `id` | String | `TEXT PRIMARY KEY` | No | Auto (e.g. `book-1795...` or UUID) | Unique book identifier |
| `title` | String | `TEXT` | No | None | Book title (bilingual English/Arabic) |
| `author` | String | `TEXT` | No | None | Author name |
| `category` | String | `TEXT` | No | `'Uncategorized'` | Category name |
| `status` | String | `TEXT` | No | `'To Read'` | Enum: `'To Read'`, `'Reading'`, `'Completed'` |
| `totalPages` | Number | `INTEGER` | No | `1` | Total page count (`>= 1`) |
| `currentPage`| Number | `INTEGER` | No | `0` | Current page read (`0 <= currentPage <= totalPages`) |
| `rating` | Number | `INTEGER` | Yes | `NULL` | Rating from `1` to `5` (or `NULL` if unrated) |
| `coverUrl` | String | `TEXT` | No | `''` | HTTP URL or embedded SVG data URI |
| `dateAdded` | String | `TEXT` | No | Current Date (`MMM DD, YYYY`) | Formatted date string (e.g. `Nov 15, 2024`) |
| `notes` | String | `TEXT` | No | `''` | Multi-line personal notes and description |

#### 2. `Category` Object
| Field Name | Type | SQLite Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `id` | String | `TEXT PRIMARY KEY` | No | Auto (e.g. `cat-1`, `cat-1795...`) | Unique category identifier |
| `name` | String | `TEXT UNIQUE` | No | None | Category name |
| `isSystem` | Boolean | `INTEGER` | No | `0` | `1` for `'Uncategorized'` (cannot be deleted/renamed), `0` for custom |

#### 3. `Settings` Object
| Field Name | Type | SQLite Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `id` | Integer | `INTEGER PRIMARY KEY` | No | `1` | Singleton row (`id = 1`) |
| `defaultLibraryView` | String | `TEXT` | No | `'grid'` | Default view mode: `'grid'` or `'list'` |
| `defaultSortOrder` | String | `TEXT` | No | `'recently-added'` | Enum: `'recently-added'`, `'title'`, `'progress'`, `'rating'` |

#### 4. `Profile` Object
| Field Name | Type | SQLite Type | Nullable | Default | Description |
|---|---|---|---|---|---|
| `id` | Integer | `INTEGER PRIMARY KEY` | No | `1` | Singleton row (`id = 1`) |
| `displayName` | String | `TEXT` | No | `'Ahmed Khaled'` | User display name (generates avatar initials) |
| `bio` | String | `TEXT` | No | `''` | User bio / reading mission statement |

---

### 3.2 Recommended SQLite DDL (`schema.sql`)

```sql
PRAGMA foreign_keys = ON;

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Books Table
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  status TEXT CHECK(status IN ('To Read', 'Reading', 'Completed')) NOT NULL DEFAULT 'To Read',
  total_pages INTEGER NOT NULL CHECK(total_pages >= 1),
  current_page INTEGER NOT NULL DEFAULT 0 CHECK(current_page >= 0 AND current_page <= total_pages),
  rating INTEGER CHECK(rating IS NULL OR (rating >= 1 AND rating <= 5)),
  cover_url TEXT DEFAULT '',
  date_added TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings Table (Singleton: id = 1)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_library_view TEXT CHECK(default_library_view IN ('grid', 'list')) NOT NULL DEFAULT 'grid',
  default_sort_order TEXT CHECK(default_sort_order IN ('recently-added', 'title', 'progress', 'rating')) NOT NULL DEFAULT 'recently-added'
);

-- Profile Table (Singleton: id = 1)
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL DEFAULT 'Ahmed Khaled',
  bio TEXT DEFAULT ''
);

-- Indexes for high-performance sorting and filtering
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_created ON books(created_at DESC);
```

---

## 4. Complete Business Logic & State Transition Rules

The backend service layer (or Express controllers) must strictly mirror the business logic defined in `js/store.js`:

### 4.1 Reading Status Auto-Transitions
1. **When marking a book as `Completed`:**
   - Automatically force `currentPage = totalPages`.
2. **When updating `currentPage`:**
   - If `currentPage >= totalPages` (and `totalPages > 0`), automatically set `status = 'Completed'` and cap `currentPage = totalPages`.
   - If `currentPage > 0` and `status === 'To Read'`, automatically set `status = 'Reading'`.
   - If `currentPage === 0` and user explicitly sets status to `To Read`, keep `currentPage = 0`.

### 4.2 Validation Constraints
- **Title:** Required (`trim().length > 0`).
- **Author:** Required (`trim().length > 0`).
- **Total Pages:** Required, integer $\ge 1$.
- **Current Page:** Integer, must satisfy $0 \le \text{currentPage} \le \text{totalPages}$. Return HTTP 400 with message `"Current page cannot exceed total pages"` if invalid.
- **Rating:** Nullable, or integer $1 \le \text{rating} \le 5$.

### 4.3 Safe Category Deletion & Rename Rules
1. **System Default Protection:** The category `"Uncategorized"` has `isSystem = 1` (or `true`). It **cannot** be deleted or renamed. Any deletion/rename request for `"Uncategorized"` must be rejected with HTTP 400 (`"System default category cannot be modified."`).
2. **Cascading Category Rename:**
   - When category `X` is renamed to `Y`, execute:
     ```sql
     UPDATE books SET category = :newName WHERE category = :oldName;
     ```
3. **Safe Category Deletion (Reassignment):**
   - When a custom category `X` is deleted, its books must **not** be deleted. Reassign them immediately to `"Uncategorized"`:
     ```sql
     UPDATE books SET category = 'Uncategorized' WHERE category = :deletedCategoryName;
     DELETE FROM categories WHERE id = :id;
     ```

### 4.4 Dashboard & Profile Milestone Calculations
- **Total Books:** Total count of rows in `books`.
- **Currently Reading:** Count where `status = 'Reading'`.
- **Completed:** Count where `status = 'Completed'`.
- **To Read:** Count where `status = 'To Read'`.
- **Completed Percentage:** `Math.round((completed / total) * 100)` (or `0%` if `total === 0`).
- **Total Pages Read:** Sum of `current_page` across all books in the database:
  ```sql
  SELECT COALESCE(SUM(current_page), 0) AS total_pages_read FROM books;
  ```
- **Favorite Category:** Category name with the maximum count of books (excluding none, or returning `"None"` if library is empty):
  ```sql
  SELECT category, COUNT(*) as cnt FROM books GROUP BY category ORDER BY cnt DESC LIMIT 1;
  ```
- **Avatar Initials:** Computed from `displayName` (first letter of first and last word capitalized; e.g. `"Ahmed Khaled"` $\to$ `"AK"`, `"Sarah"` $\to$ `"S"`).

---

## 5. UI Routes, REST Endpoints & Form Payloads

The Express backend should expose clean routes serving EJS views for page requests and handling standard form POST submissions (or JSON API requests).

### 5.1 Route Mapping Table

| HTTP Method | Route URL | View / Action | Query / Form Parameters |
|---|---|---|---|
| `GET` | `/` | Redirects to `/dashboard` | — |
| `GET` | `/dashboard` | `pages/dashboard.ejs` | — |
| `GET` | `/library` | `pages/library.ejs` | `?search=&status=&category=&sort=&view=` |
| `GET` | `/books/new` | `pages/book-form.ejs` (Add) | — |
| `POST` | `/books` | Create new book | `title`, `author`, `category`, `status`, `totalPages`, `currentPage`, `rating`, `coverUrl`, `notes` |
| `GET` | `/books/:id` | `pages/book-details.ejs` | — |
| `POST` | `/books/:id/progress` | Inline page progress update | `currentPage` |
| `GET` | `/books/:id/edit` | `pages/book-form.ejs` (Edit) | — |
| `POST` | `/books/:id/edit` | Update existing book | Same as create |
| `POST` | `/books/:id/delete` | Delete book | — |
| `GET` | `/settings` | `pages/settings.ejs` | — |
| `POST` | `/categories` | Add category | `name` |
| `POST` | `/categories/:id/rename`| Rename category | `name` |
| `POST` | `/categories/:id/delete`| Delete category | — |
| `POST` | `/settings/preferences`| Update default view/sort | `defaultLibraryView`, `defaultSortOrder` |
| `GET` | `/settings/export` | Download library JSON | Attachment: `kutubi-library-YYYY-MM-DD.json` |
| `POST` | `/settings/reset` | Restore 24 sample books | — |
| `GET` | `/profile` | `pages/profile.ejs` | — |
| `POST` | `/profile` | Update profile | `displayName`, `bio` |

### 5.2 Form Field Names (`<form>` inputs)

```html
<!-- Book Form (Add / Edit) -->
<input name="title" required />
<input name="author" required />
<select name="category" required><!-- options --></select>
<select name="status" required>
  <option value="To Read">To Read</option>
  <option value="Reading">Reading</option>
  <option value="Completed">Completed</option>
</select>
<input name="totalPages" type="number" min="1" required />
<input name="currentPage" type="number" min="0" />
<input name="rating" type="hidden" id="selected-rating" /> <!-- 1 to 5, or empty -->
<input name="coverUrl" type="url" />
<textarea name="notes"></textarea>

<!-- Inline Progress Form on Book Details -->
<form action="/books/<%= book.id %>/progress" method="POST">
  <input name="currentPage" type="number" min="0" max="<%= book.totalPages %>" required />
  <button type="submit">Update</button>
</form>

<!-- Category Add Form -->
<form action="/categories" method="POST">
  <input name="name" placeholder="New category name..." required />
  <button type="submit">+ Add</button>
</form>

<!-- Profile Form -->
<form action="/profile" method="POST">
  <input name="displayName" value="<%= profile.displayName %>" required />
  <textarea name="bio"><%= profile.bio %></textarea>
  <button type="submit">Save Profile</button>
</form>
```

---

## 6. Step-by-Step Frontend to EJS Migration Guide

When ChatGPT or the backend developer sets up the Express app, follow these steps to preserve all CSS and interactive components 100% intact:

### Step 1: Initialize Express & SQLite
```bash
npm init -y
npm install express ejs better-sqlite3
```

### Step 2: Configure Express App Structure
```
server.js
db.js (Database initialization and queries)
public/
  ├── css/
  │   ├── tokens.css
  │   └── styles.css
  ├── js/
  │   ├── covers.js
  │   ├── dropdown.js
  │   ├── modal.js
  │   └── toast.js
views/
  ├── layout.ejs
  ├── partials/
  │   ├── sidebar.ejs
  │   ├── mobile-header.ejs
  │   └── toast.ejs
  └── pages/
      ├── dashboard.ejs
      ├── library.ejs
      ├── book-details.ejs
      ├── book-form.ejs
      ├── settings.ejs
      └── profile.ejs
```

### Step 3: Deconstruct `index.html` into EJS Layout & Partials
1. **`views/layout.ejs`:** Contains `<!DOCTYPE html>`, `<head>` (Google Fonts, Tailwind CDN, `css/tokens.css`, `css/styles.css`), the `#app-sidebar` container, and the `#app-main` wrapper where `<%- body %>` is rendered.
2. **`views/partials/sidebar.ejs`:** Move lines `30–120` from `index.html`. Inject `<%= totalBooksCount %>` into `#sidebar-total-badge` and `#sidebar-tooltip-library`.
3. **Retain Client-Side Enhancers:** In `layout.ejs`, import `dropdown.js`, `modal.js`, and `covers.js` as ES modules or standard scripts:
   ```html
   <script type="module">
     import { initCustomDropdowns } from '/js/dropdown.js';
     document.addEventListener('DOMContentLoaded', () => {
       initCustomDropdowns(document);
     });
   </script>
   ```
   Because `dropdown.js` wraps and visually hides native `<select>` tags while synchronizing their `.value`, all server-rendered forms will submit the chosen dropdown values effortlessly!

### Step 4: Converting Single Page Views into EJS Templates
- **Dashboard (`views/pages/dashboard.ejs`):**
  - Render the 4 live calculated metric cards with numbers pre-calculated on the server.
  - Loop over `currentlyReadingBooks` (up to 3) and `recentlyAddedBooks` (up to 4).
  - Use `covers.js` or server-side cover helpers to render typographic fallback covers for books without `coverUrl`.
- **My Library (`views/pages/library.ejs`):**
  - Accept query params `req.query`: `search`, `status`, `category`, `sort`, `view`.
  - Filter and sort books in SQLite before rendering.
  - Render `<select id="library-status-select" name="status" class="form-select w-auto" data-prefix="Status: ">`. `dropdown.js` will automatically turn it into the Raycast-styled dropdown.
- **Book Details (`views/pages/book-details.ejs`):**
  - Render breadcrumb, 2:3 cover, 4-column metadata grid, description/notes.
  - The Reading Progress form posts to `/books/<%= book.id %>/progress`.
- **Book Form (`views/pages/book-form.ejs`):**
  - Single reusable template for both Add and Edit (`action="/books"` vs `action="/books/<%= book.id %>/edit"`).
  - Star rating component: A hidden input `<input type="hidden" name="rating" id="book-rating" value="<%= book ? book.rating : '' %>">` wired to the 5 star buttons.

---

## 7. Verification & Acceptance Checklist for Backend Agent

Before handing back the backend solution, verify that:
- [ ] Server starts cleanly with `npm start` (e.g. on `http://localhost:3000`).
- [ ] SQLite database initializes automatically with the 24 seed books and 5 categories if empty.
- [ ] All 6 dropdowns across the app (Library Toolbar x3, Book Form x2, Settings x1) render with custom dark grayscale popovers and zero OS blue highlights.
- [ ] Submitting the Add Book form inserts a book into SQLite and redirects to `/books/:id`.
- [ ] Updating reading progress on Book Details updates `current_page`, auto-transitions status to `Completed` if finished, and recalculates the percentage.
- [ ] Deleting a custom category safely reassigns all its books to `"Uncategorized"`.
- [ ] Attempting to delete `"Uncategorized"` fails with a clear error message.
- [ ] Exporting library from Settings downloads valid JSON containing all books and categories.
- [ ] `tabular-nums` and `dir="auto"` attributes are present on all rendered titles, numbers, and dates.
