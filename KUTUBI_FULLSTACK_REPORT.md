# KUTUBI (كتبي) — FULLSTACK IMPLEMENTATION REPORT
## Stage 2: Backend Architecture, SQLite Persistence, EJS Migration & Browser Verification

> **Project:** Kutubi (كتبي) — Dark, ultra-minimalist personal book library manager inspired by Linear and Raycast  
> **Type:** Fullstack Node.js + Express + SQLite (`better-sqlite3`) + EJS Server-Rendered Web Application  
> **Status:** Production-Ready & 100% Functionally Verified  
> **Date:** November 21, 2026  

---

## 1. EXECUTIVE SUMMARY

The Stage 2 Fullstack Implementation of **Kutubi (كتبي)** has been successfully executed, converting the prototype into a persistent, high-performance, server-rendered application powered by **Node.js, Express, SQLite (`better-sqlite3`), and EJS (`express-ejs-layouts`)**.

### Key Achievements:
- **Zero Simulated State:** All application state—books, categories, reader profile, and display preferences—is fully persisted in a real SQLite database (`data/kutubi.db`) with foreign key constraints and WAL (`Write-Ahead Logging`) mode. `localStorage` is used solely for the client-side collapsed/expanded visual state of the sidebar.
- **Factory-Seeded Baseline:** Initialized with **exactly 24 realistic books** across **5 categories** (`Engineering`: 8, `Arabic Literature`: 6, `Fiction & Sci-Fi`: 5, `Self-Development`: 3, `Uncategorized`: 2) with status distribution matching requirements: **3 Reading**, **14 Completed (58%)**, and **7 To Read**.
- **Server-Side Business Logic:** All calculations (reading progress percentage, reading milestone metrics, automatic status transitions on page updates, case-insensitive duplicate prevention, and transaction-safe category deletion with book reassignment to `Uncategorized`) run entirely on the server.
- **Strict Grayscale Aesthetics Maintained:** 100% fidelity to the Linear/Raycast design language with `--bg-primary: #0B0B0C`, `--surface-primary: #121214`, hairline `1px solid #242429` borders, custom grayscale popover dropdowns (eliminating all native browser blue styling), `tabular-nums` for all numeric counters, and `dir="auto"` for bilingual Arabic and English typography.
- **Comprehensive Quality Assurance:**
  - **Automated Node.js Test Suite:** **31 out of 31 automated tests passing** across 6 test suites (`database.test.js`, `books.test.js`, `progress.test.js`, `categories.test.js`, `dashboard.test.js`, `settings-profile.test.js`).
  - **Real Browser Verification:** **14 out of 14 end-to-end browser scenarios verified** using Playwright Chromium with fresh screenshots captured and archived.

---

## 2. ARCHITECTURE OVERVIEW

### Directory Structure
```
d:\THE DECAGON\OTHER\Kutubi\
├── controllers/                  # Route controller layer
│   ├── books.controller.js
│   ├── categories.controller.js
│   ├── dashboard.controller.js
│   ├── library.controller.js
│   ├── profile.controller.js
│   └── settings.controller.js
├── db/                           # SQLite database connection & migrations
│   ├── database.js               # Connection manager, WAL mode, foreign keys
│   ├── schema.sql                # DDL schema definitions
│   └── seed.js                   # Seeder with 24 books & 5 categories
├── middleware/                   # Express custom middleware
│   ├── error-handler.js          # Centralized error handler & styled error page
│   └── not-found.js              # 404 handler with recovery navigation
├── public/                       # Static public assets
│   ├── css/
│   │   ├── tokens.css            # Grayscale design tokens
│   │   └── styles.css            # Layout, typography, tables, dropdowns
│   └── js/
│       ├── covers.js             # Client typographic cover generator
│       ├── dropdown.js           # Custom grayscale popover dropdown component
│       ├── modal.js              # Accessible modal dialogs (Delete & Rename)
│       └── toast.js              # Toast notification utility
├── routes/                       # Express router definitions
│   ├── books.routes.js
│   ├── categories.routes.js
│   ├── dashboard.routes.js
│   ├── library.routes.js
│   ├── profile.routes.js
│   └── settings.routes.js
├── services/                     # Business logic and database query layer
│   ├── books.service.js
│   ├── categories.service.js
│   ├── dashboard.service.js
│   ├── profile.service.js
│   └── settings.service.js
├── tests/                        # Automated unit and integration tests (31 tests)
│   ├── books.test.js
│   ├── categories.test.js
│   ├── dashboard.test.js
│   ├── database.test.js
│   ├── progress.test.js
│   └── settings-profile.test.js
├── utils/                        # Formatting, validation, and cover rendering helpers
│   ├── covers.js
│   ├── formatting.js
│   └── validation.js
├── views/                        # EJS server-rendered templates
│   ├── layout.ejs                # Master shell with sidebar, mobile header & modals
│   ├── pages/
│   │   ├── book-details.ejs      # Reading progress form, metadata grid, notes
│   │   ├── book-form.ejs         # Unified Add / Edit book form
│   │   ├── dashboard.ejs         # Top metrics, Currently Reading, Recently Added
│   │   ├── delete-confirmation.ejs # Standalone delete fallback
│   │   ├── error.ejs             # 404 and 500 error display
│   │   ├── library.ejs           # Grid & List views with live filter toolbar
│   │   ├── profile.ejs           # Reader identity & dynamic initials
│   │   └── settings.ejs          # Category CRUD, preferences & JSON export
│   └── partials/
│       ├── head.ejs
│       ├── mobile-header.ejs
│       ├── modal.ejs
│       ├── scripts.ejs
│       ├── sidebar.ejs
│       └── toast.ejs
├── data/
│   └── kutubi.db                 # Persistent SQLite database file
├── package.json                  # Dependencies & scripts
├── server.js                     # Express application entrypoint
├── verify_fullstack.py           # Playwright browser verification suite
└── verify_restart.js             # Process restart persistence verifier
```

---

## 3. DATABASE IMPLEMENTATION

### Database Technology
- **Engine:** `better-sqlite3` v12.6.2 (synchronous, in-process C-binding with zero network latency).
- **Pragmas:**
  - `journal_mode = WAL`: High-concurrency readers without blocking writers.
  - `foreign_keys = ON`: Strict relational integrity and cascading behavior.

### Relational Schema Summary (`db/schema.sql`)
1. **`categories` Table:**
   - `id INTEGER PRIMARY KEY AUTOINCREMENT`
   - `name TEXT NOT NULL UNIQUE COLLATE NOCASE`
   - `is_system INTEGER NOT NULL DEFAULT 0` (`Uncategorized` is protected)
   - `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`
2. **`books` Table:**
   - `id INTEGER PRIMARY KEY AUTOINCREMENT`
   - `title TEXT NOT NULL`, `author TEXT NOT NULL`
   - `category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT`
   - `status TEXT NOT NULL CHECK(status IN ('To Read', 'Reading', 'Completed'))`
   - `total_pages INTEGER NOT NULL CHECK(total_pages > 0)`
   - `current_page INTEGER NOT NULL DEFAULT 0 CHECK(current_page >= 0)`
   - `cover_url TEXT DEFAULT ''`
   - `rating INTEGER CHECK(rating IS NULL OR (rating >= 1 AND rating <= 5))`
   - `description TEXT DEFAULT ''`
   - `date_added TEXT NOT NULL`
   - `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`
   - *Indexes:* `idx_books_category`, `idx_books_status`, `idx_books_created_at`.
3. **`settings` Table:**
   - Singleton pattern (`id = 1 CHECK(id = 1)`)
   - `default_library_view TEXT NOT NULL DEFAULT 'grid'`
   - `default_sort_order TEXT NOT NULL DEFAULT 'recently-added'`
   - `updated_at TEXT NOT NULL`
4. **`profile` Table:**
   - Singleton pattern (`id = 1 CHECK(id = 1)`)
   - `display_name TEXT NOT NULL DEFAULT 'Ahmed Khaled'`
   - `bio TEXT DEFAULT ''`
   - `updated_at TEXT NOT NULL`
5. **`app_metadata` Table:**
   - Key-value store tracking schema migrations and seed status (`seeded = '1'`).

---

## 4. SERVER-SIDE BUSINESS LOGIC

1. **Reading Progress Transitions (`services/books.service.js`):**
   - Submitting `currentPage == totalPages` auto-transitions `status` to `'Completed'`.
   - Submitting `0 < currentPage < totalPages` for a `'To Read'` book auto-transitions `status` to `'Reading'`.
   - Submitting `currentPage == 0` for an in-progress book resets `status` to `'To Read'`.
   - Submitting `currentPage > totalPages` or negative/non-integer numbers is strictly rejected with validation errors.
2. **Category Safety & Book Reassignment (`services/categories.service.js`):**
   - The system category `'Uncategorized'` (`is_system = 1`) cannot be deleted or renamed.
   - Deleting any custom category runs a transaction that reassigns all existing books in that category to `'Uncategorized'` before dropping the category row.
   - Duplicate category creation is checked case-insensitively (`COLLATE NOCASE`).
3. **Live Dashboard Metrics (`services/dashboard.service.js`):**
   - Total books, distinct category counts, reading, completed (with exact rounded percentage), and to-read counts are queried dynamically with aggregate SQLite functions (`COUNT(*)`, `SUM(CASE ...)`). Zero books condition is guarded to prevent `NaN` or division by zero.
4. **Reader Profile & Dynamic Initials (`services/profile.service.js`):**
   - Dynamically calculates initials from multi-word names (e.g. `'Sarah Jenkins'` -> `'SJ'`, `'ابن خلدون'` -> `'اخ'`).
   - Calculates reader milestones: Total books read, total pages completed, and average rating across the collection.
5. **Library Export & Sample Data Reset (`services/settings.service.js`):**
   - Full catalog backup exported as UTF-8 JSON attachment with timestamped filename.
   - Sample Data Reset transaction clears books, resets the SQLite sequence (`DELETE FROM sqlite_sequence WHERE name = 'books'`), restores default categories, and re-seeds the pristine 24 sample titles.

---

## 5. EJS TEMPLATE MIGRATION & VIEW ARCHITECTURE

- **Layout Architecture:** Implemented via `express-ejs-layouts` using a master shell (`views/layout.ejs`) with reusable partials (`head`, `sidebar`, `mobile-header`, `modal`, `toast`, `scripts`).
- **Unified Book Form (`views/pages/book-form.ejs`):** Reusable for both creating (`/books/new`) and editing (`/books/:id/edit`) books, including dynamic cover preview, interactive 5-star rating selector, and inline validation alerts.
- **Book Details (`views/pages/book-details.ejs`):** Features the Quick Page Update form, responsive metadata grid (Category, Author, Pages, Rating, Date Added), reading notes viewer, and delete trigger.
- **Library (`views/pages/library.ejs`):** Supports instant toggle between 4-column Book Grid and structured tabular List view, with live search (English and Arabic), status filters, category filters, and sorting.
- **Custom Grayscale Dropdowns:** Native `<select>` elements are progressively enhanced by `public/js/dropdown.js` with dark `#121214` menus, hairline `#242429` borders, `#1A1A1E` hover states, and monochrome checkmarks, completely eliminating default operating system blue highlights.

---

## 6. VERIFICATION & TEST RESULTS

### 6.1 Automated Unit & Integration Tests (`npm test`)
Run with Node.js built-in test runner (`node --test tests/**/*.test.js`):
```
▶ Books Service & CRUD Operations
  ✔ should retrieve all books and support search by English and Arabic terms (12.1ms)
  ✔ should filter by status and category accurately (3.5ms)
  ✔ should sort books by Title, Progress, Rating, and Recently Added (9.7ms)
  ✔ should create a valid book with proper status normalization (1.9ms)
  ✔ should auto-transition status to Completed when currentPage equals totalPages on create (2.6ms)
  ✔ should reject creation when required fields are missing or invalid (1.9ms)
  ✔ should update an existing book (1.8ms)
  ✔ should delete a book successfully (2.7ms)
✔ Books Service & CRUD Operations (38.0ms)

▶ Categories Management & System Protection
  ✔ should list all categories with accurate book counts (9.0ms)
  ✔ should create a custom category and prevent duplicates case-insensitively (2.8ms)
  ✔ should rename a custom category and reject duplicate names (1.5ms)
  ✔ should protect system Uncategorized category from rename and delete (1.6ms)
  ✔ should safely delete custom category and reassign all its books to Uncategorized (2.2ms)
✔ Categories Management & System Protection (18.2ms)

▶ Dashboard Live Metrics & Section Queries
  ✔ should calculate live metrics accurately from SQLite (8.5ms)
  ✔ should retrieve up to 3 currently reading books with calculated percentage (2.6ms)
  ✔ should retrieve 4 most recently added books (1.5ms)
  ✔ should handle zero books gracefully without NaN or division by zero (1.7ms)
✔ Dashboard Live Metrics & Section Queries (15.3ms)

▶ Database Initialization & Schema Integrity
  ✔ should initialize tables with foreign keys and correct schemas (9.6ms)
  ✔ should seed exactly 24 books and 5 categories on initial run (1.9ms)
  ✔ should strictly match target status distribution (3 Reading, 14 Completed, 7 To Read) (2.9ms)
  ✔ should strictly match target category distribution (8, 6, 5, 3, 2) (1.7ms)
  ✔ should enforce singleton constraints on settings and profile tables (1.4ms)
✔ Database Initialization & Schema Integrity (18.9ms)

▶ Reading Progress Logic & State Transitions
  ✔ should transition to Reading when partial progress is submitted on a To Read book (9.2ms)
  ✔ should auto-transition to Completed when currentPage equals totalPages (2.5ms)
  ✔ should reset status to To Read when currentPage is updated to 0 (1.5ms)
  ✔ should reject invalid progress values exceeding total pages (2.2ms)
  ✔ should reject negative, decimal, and non-numeric page values (2.2ms)
✔ Reading Progress Logic & State Transitions (18.7ms)

▶ Settings & Profile Persistence and Features
  ✔ should persist settings preferences updates (8.1ms)
  ✔ should export valid JSON backup containing all books and categories (2.0ms)
  ✔ should restore factory defaults on sample reset (3.1ms)
  ✔ should update profile and calculate dynamic milestone statistics and initials (2.0ms)
✔ Settings & Profile Persistence and Features (17.0ms)

ℹ tests 31
ℹ suites 6
ℹ pass 31
ℹ fail 0
ℹ duration_ms 141.7ms
```

### 6.2 Browser Verification Loop (`verify_fullstack.py`)
Executed with Playwright Chromium across 14 comprehensive scenarios:
```
[Step 1] Ensuring clean factory state... -> Factory reset triggered.
[Step 2] Testing Dashboard (Live Metrics & Cards)... -> Total=24, Reading=3, Completed=14 (58%), ToRead=7
[Step 3] Testing Book Details Navigation... -> Navigated to Book Details.
[Step 4] Testing Reading Progress Updates & Auto-Transitions...
  - Updated to 388/777 -> transitioned to 'Reading'
  - Updated to 777/777 -> auto-completed to 'Completed' (100%)
  - Updated to 0/777 -> reverted to 'To Read' (0%)
[Step 5] Testing Library Grid View & Filters...
  - Total count: 24 books
  - Filter Status=Reading: 3 books
  - Filter Category=Engineering: 8 books
  - Filter Category=Arabic Literature: 6 books
  - Search 'Pragmatic': 1 book
  - Search 'غرناطة': 1 book
[Step 6] Testing Library List View... -> 24 tabular rows rendered.
[Step 7] Testing Add Book Form & Validation...
  - Empty submission -> inline title and author errors displayed.
  - Valid English book created -> database count 25.
[Step 8] Submitting valid Arabic book... -> Database count 26.
[Step 9] Testing Edit Book Form... -> Saved note updates in SQLite.
[Step 10] Testing Delete Book Modal...
  - Cancel click -> modal dismissed without deletion.
  - Confirm click -> deleted from SQLite, count decremented to 25.
[Step 11] Testing Settings & Category Management...
  - Added 'Science & Philosophy' -> category created.
  - Duplicate attempt -> rejected with error.
  - JSON Export -> valid JSON downloaded (25 books, 6 categories).
  - Sample Data Reset -> restored baseline 24 books.
[Step 12] Testing Profile Page... -> Updated display name to 'Sarah Jenkins', dynamic initials 'SJ' verified across page reloads.
[Step 13] Testing Collapsed Sidebar... -> Sidebar collapses to 64px icon rail, persists in localStorage.
[Step 14] Testing Mobile Viewport (390x844)... -> Responsive layout, hamburger button opens slide-over navigation drawer.

RESULT: ALL 14 BROWSER VERIFICATION SCENARIOS PASSED WITH ZERO FAILURES.
```

### 6.3 Process Restart Persistence Verification (`verify_restart.js`)
Executed via `node verify_restart.js`:
- Created test book in SQLite: `Persistence Test Book 1795277727479`.
- Terminated SQLite connection / closed database.
- Re-opened database connection: book persisted completely with identical fields.
- Verified retrieval via Books Service and cleaned up test record.
- **Persistence Across Restart Verified 100%.**

---

## 7. SCREENSHOT VERIFICATION GALLERY

All screenshots captured from the live fullstack server have been archived:

| Screen / Flow | Screenshot File | Description |
| :--- | :--- | :--- |
| **1. Dashboard** | `screenshots/fullstack_01_dashboard.png` | Live metrics (24 total, 3 reading, 14 completed, 7 to read), 3 in-progress cards with progress bars, and Recently Added list. |
| **2. Library Grid View** | `screenshots/fullstack_02_library_grid.png` | 4-column responsive card grid with typographic covers, badges, and filter toolbar. |
| **3. Library List View** | `screenshots/fullstack_03_library_list.png` | Structured table with 36x54px thumbnails, status pills, progress bars, and star ratings. |
| **4. Book Details** | `screenshots/fullstack_04_book_details.png` | Large typographic cover, Quick Page Update form, metadata grid, and reading notes. |
| **5. Add Book Form** | `screenshots/fullstack_05_add_book.png` | Add book form with custom dropdowns, star selector, and live cover preview container. |
| **6. Edit Book Form** | `screenshots/fullstack_06_edit_book.png` | Pre-populated form fields and destructive delete action. |
| **7. Settings & Categories** | `screenshots/fullstack_07_settings.png` | Inline category creation, category rows with book counts, preference toggles, and data export. |
| **8. Profile** | `screenshots/fullstack_08_profile.png` | Reader identity form with dynamic initials avatar (`SJ`) and milestone summary. |
| **9. Collapsed Sidebar** | `screenshots/fullstack_09_collapsed_sidebar.png` | 64px collapsed icon rail with 'K' monogram expand trigger and hover tooltips. |
| **10. Delete Modal** | `screenshots/fullstack_10_delete_modal.png` | Dark grayscale confirmation dialog with Cancel and Delete Book buttons. |
| **11. Validation Error** | `screenshots/fullstack_11_validation_error.png` | Red validation borders and helper text on missing required inputs. |
| **12. Mobile Viewport (390x844)** | `screenshots/fullstack_13_mobile_390x844.png` | Mobile header with hamburger menu and single-column card layout. |
| **13. Mobile Drawer Open** | `screenshots/fullstack_14_mobile_drawer_open.png` | Slide-over navigation drawer with backdrop blur and active navigation items. |

---

## 8. DISCREPANCIES, CONSTRAINTS & HONEST REPORTING

Per Part 2.3 and Part 21.8 of the directive:
1. **Design Skill Availability:**
   - **Found and Applied:** `apple-design`, `emil-design-eng`, and `frontend-design`.
   - **Unavailable:** The skill named `Impeccable` was searched for across the entire environment and workspace, but does not exist in the installation. The required engineering behaviors (strict grayscale hierarchy, `tabular-nums` on all numbers, `150ms-200ms` transitions, zero layout shift) were fully applied from `Frontend Design`, `Apple Design`, and `Emil Design Eng`.
2. **Auto-Increment Sequence on Reset:**
   - SQLite retains auto-increment IDs in `sqlite_sequence` after `DELETE FROM books`. To maintain consistent deterministic IDs after triggering "Reset Sample Data", `DELETE FROM sqlite_sequence WHERE name = 'books'` was implemented in `resetDatabaseToDefaults()`.
3. **CommonJS vs ESM Boundary:**
   - The backend runs under CommonJS (`type: "commonjs"`) for high compatibility with `better-sqlite3` and `express`, while frontend scripts in `public/js/` run natively as ES modules (`<script type="module">`).

---

## 9. RUN & DEPLOYMENT INSTRUCTIONS

### Prerequisites
- Node.js v18.0+ (Tested on Node.js v24.18.0)
- npm v9.0+

### Installation & Startup
```bash
# 1. Install dependencies
npm install

# 2. Run unit and integration tests
npm test

# 3. Start Kutubi application server
npm start
# Server runs at http://localhost:3000

# 4. Run end-to-end browser verification (requires python and playwright)
python verify_fullstack.py
```

### Health Check Endpoint
- `GET http://localhost:3000/health`
- Response: `{"status":"ok","uptime":...,"timestamp":"..."}`
