# Kutubi (كتبي) — Personal Book Library Manager & In-App PDF Reader

> A dark, ultra-minimalist personal book library web application inspired by the craft, density, and precision of Linear and Raycast. Built with **Node.js, Express, SQLite (`better-sqlite3`), and EJS**.

---

## 1. Project Overview

**Kutubi (كتبي)** is a fullstack personal library, reading tracker, and in-app document reader built as a university summer training graduation project. It allows readers to organize their personal physical and digital book collection, read attached PDF books directly inside the browser, track reading progress in real time, categorize titles, record personal notes and ratings, and visualize reading milestones in an ultra-clean, monochromatic environment.

### Core Highlights
- **Strict Grayscale Aesthetic:** Minimalist dark canvas (`#0B0B0C`, `#121214`, `#1A1A1E`), hairline borders (`1px solid #242429`), zero bright colors, zero glow, and zero drop shadows.
- **Linear/Raycast Craft & Zero-Jitter Navigation:** Custom popover dropdowns, keyboard-navigable menus, stable 220px desktop sidebar with 64px collapsible icon rail, and fixed 18×18px bounding box icons that never jitter or shift during navigation or page refresh.
- **In-App PDF Reader:** Pure JavaScript PDF reader powered by Mozilla PDF.js v4. Multipart uploads with 50 MB limit, strict `%PDF-` magic byte validation, automatic first-page cover generation, dual progress tracking (Last Read Position vs. Confirmed Progress), and full keyboard/toolbar controls.
- **First-Class Bilingual Typography:** Google Fonts `Inter` (Latin) and `IBM Plex Sans Arabic` (Arabic), `dir="auto"` on all user content, and `tabular-nums` on all counters, page badges, and dates.
- **Zero Broken Images:** Multi-tier cover resolution: Manual cover URL $\to$ Extracted PDF cover thumbnail $\to$ Deterministic SVG typographic cover.
- **Persistent SQLite Database:** Powered by `better-sqlite3` with foreign key enforcement and Write-Ahead Logging (`WAL`) mode. Zero simulated prototype state.

---

## 2. Key Features

- **Dashboard:**
  - Dynamic library metric cards calculated live from SQLite: Total Books, Categories Count, Currently Reading, Completed with rounded percentage, and To Read.
  - Active "Currently Reading" progress cards with percentage meters and quick access.
  - "Recently Added" titles with format badges (`PDF`).
- **My Library (Grid & List Views):**
  - **4-Column Grid View:** Visual card layout with progress bars, status pills, category badges, and PDF indicators.
  - **Structured List View:** Compact data table with 36×54px thumbnails, progress meters, star ratings, and document badges.
  - **Live Search & Filters:** Search by title or author in both English and Arabic; filter by Reading Status, Category, and sort by Recently Added, Title (A–Z), Progress, or Rating.
- **In-App PDF Reader (`/books/:id/read`):**
  - **Streamlined Toolbar:** Previous/Next page navigation, direct page jump input, current page indicator (`Page X of Y`), Zoom In/Out, Fit Width, Fit Page, Fullscreen toggle, and direct download of original PDF.
  - **Mark as Read Integration:** One-click CTA in toolbar to synchronize current document page to confirmed reading progress (`current_page`), auto-transitioning book status to `Completed` when reaching the final page.
  - **Reading Position vs. Confirmed Progress:** Automatically persists the reader's view location (`last_read_page`) on page navigation without prematurely updating confirmed reading stats. When reopening the reader, it automatically resumes where the reader left off.
  - **Pure JavaScript Rendering:** High-resolution HTML5 canvas rendering via Mozilla PDF.js v4 with zero native C++ compiler requirements.
- **Book Details & Reading Progress:**
  - **Read Book CTA:** Prominent action button to launch the In-App PDF Reader (or `Attach PDF` link when no digital copy is uploaded).
  - **Document Metadata Box:** Displays original PDF filename, formatted file size, detected page count, and current reading position.
  - **Quick Page Update Form:** Updates confirmed reading progress with automated status transitions:
    - Setting current page equal to total pages auto-completes the book (`100%`).
    - Updating partial progress on a queued book auto-transitions status to `Reading`.
    - Resetting current page to 0 returns status to `To Read`.
    - Strict server-side validation rejecting negative, decimal, or out-of-bounds page numbers.
  - Responsive metadata grid (Category, Author, Total Pages, Rating, Date Added) and personal reading notes.
- **Add & Edit Book Management:**
  - Unified form with live cover image preview container, interactive 5-star rating selector, and multipart PDF document uploader.
  - Automatic page count population when uploading a PDF.
  - PDF document replacement and removal controls with automatic filesystem cleanup.
- **Delete Confirmation Dialog:**
  - Accessible dark confirmation modal with focus trapping, cancel dismiss, and safe cascading file cleanup (deletes associated PDF and cover files from disk).
- **Category Management & Protection (Inside Settings):**
  - *Location:* Category management is centrally housed within **Settings** (`/settings`), keeping navigation focused.
  - Add custom categories with case-insensitive duplicate prevention.
  - Rename custom categories via modal dialog.
  - Safe category deletion: all associated books are automatically and safely reassigned to `Uncategorized`.
  - System protection: `Uncategorized` is protected from being renamed or deleted.
- **Reader Profile:**
  - Dynamic avatar initials generator supporting English and Arabic names (e.g. `Ahmed Khaled` → `AK`, `ابن خلدون` → `اخ`, `Ahmed` → `AH`).
  - Milestone summary: Books Completed count, Total Pages Read (`SUM(current_page)`), and Favorite Category.
- **Data Portability & Preferences:**
  - Full catalog backup exported as timestamped JSON file.
  - Persistent default library view (`grid` / `list`) and default sorting order.
- **Responsive Layout & Sidebar Rail:**
  - Desktop: 220px sidebar with 64px collapsible icon rail (pre-painted to prevent layout shift).
  - Mobile (< 768px): Sticky mobile header with slide-over navigation drawer.

---

## 3. Technology Stack

- **Backend Runtime:** Node.js (v18.0+, tested on v24.18.0)
- **Server Framework:** Express 4.x
- **Template Engine:** EJS (`express-ejs-layouts`)
- **Database Engine:** SQLite 3 via `better-sqlite3` v13.x
- **Database Mode:** Write-Ahead Logging (`PRAGMA journal_mode = WAL`), Foreign Keys enabled (`PRAGMA foreign_keys = ON`)
- **PDF Processing & Rendering:** `multer` (multipart upload), `pdf-to-img` / `pdfjs-dist` (pure JS cover extraction and page counting), Mozilla PDF.js v4 (client canvas reader)
- **Frontend / Styling:** Vanilla ES6+ JavaScript, CSS Custom Properties (Design Tokens), Google Fonts (`Inter`, `IBM Plex Sans Arabic`), Material Symbols
- **Testing:** Node.js built-in test runner (`node:test`, `node:assert`), Playwright Chromium for end-to-end browser verification

---

## 4. Project Architecture

```
Kutubi/
├── controllers/          # Route controller layer (handles HTTP requests/responses)
│   ├── books.controller.js       # CRUD, progress update, PDF streaming & reader
│   ├── categories.controller.js  # Category creation, renaming & safe deletion
│   ├── dashboard.controller.js   # Live metrics & recent books
│   ├── library.controller.js     # Library grid/list view & filter query parsing
│   ├── profile.controller.js     # Profile details & milestone statistics
│   └── settings.controller.js    # Preferences & backup export
├── db/                   # Database connection, DDL schema, migrations & seeder
│   ├── database.js       # SQLite connection manager, WAL mode & migrations
│   ├── schema.sql        # Database schema definitions & indexes
│   └── seed.js           # 8 starter books, 5 default categories seeder & test fixtures
├── middleware/           # Centralized Express middleware
│   ├── error-handler.js  # Global error handling
│   ├── not-found.js      # 404 handler
│   └── upload.js         # Multer multipart upload with 50 MB limit
├── public/               # Public static assets
│   ├── css/
│   │   ├── tokens.css    # Strict grayscale design tokens
│   │   └── styles.css    # Minimalist components & layout styling
│   └── js/
│       ├── covers.js     # Client typographic SVG cover generator
│       ├── dropdown.js   # Custom popover dropdown component
│       ├── modal.js      # Accessible confirmation modal dialogs
│       └── toast.js      # Floating feedback toast utility
├── routes/               # Express modular router definitions
│   ├── books.routes.js      # /books routes (details, form, edit, read, pdf)
│   ├── categories.routes.js # /categories routes (inside settings)
│   ├── dashboard.routes.js  # / route
│   ├── library.routes.js    # /library route
│   ├── profile.routes.js    # /profile route
│   └── settings.routes.js   # /settings routes
├── services/             # Business logic & SQL query execution layer
│   ├── books.service.js      # Book CRUD, reading progress & PDF relations
│   ├── categories.service.js # Category queries, renames & safety checks
│   ├── dashboard.service.js  # Live SQLite aggregations
│   ├── pdf.service.js        # Magic byte validation, cover extraction & cleanup
│   ├── profile.service.js    # Dynamic profile stats & initials logic
│   └── settings.service.js   # Settings persistence & export
├── storage/              # Persistent document storage outside public root
│   ├── covers/           # Generated PDF first-page cover thumbnails (.png)
│   ├── pdfs/             # Uploaded PDF document files (.pdf)
│   └── temp/             # Temporary processing files
├── tests/                # Automated unit & integration test suite (42 tests across 8 suites)
│   ├── books.test.js
│   ├── categories.test.js
│   ├── dashboard.test.js
│   ├── database.test.js
│   ├── pdf.test.js
│   ├── progress.test.js
│   ├── settings-profile.test.js
│   └── starter-and-idempotency.test.js
├── utils/                # Formatting, input validation & cover helpers
│   ├── covers.js
│   ├── formatting.js
│   └── validation.js
├── views/                # Server-rendered EJS templates
│   ├── layout.ejs        # Master layout shell
│   ├── pages/            # Page templates
│   │   ├── book-details.ejs
│   │   ├── book-form.ejs
│   │   ├── dashboard.ejs
│   │   ├── delete-confirmation.ejs
│   │   ├── error.ejs
│   │   ├── library.ejs
│   │   ├── pdf-reader.ejs
│   │   ├── profile.ejs
│   │   └── settings.ejs
│   └── partials/         # Modular partials
│       ├── head.ejs
│       ├── header.ejs
│       ├── mobile-nav.ejs
│       ├── modals.ejs
│       ├── scripts.ejs
│       ├── sidebar.ejs
│       └── toasts.ejs
├── data/                 # SQLite storage directory (.gitkeep tracked; .db files ignored)
├── package.json          # Dependencies, scripts & project metadata
├── package-lock.json     # Deterministic lockfile (with gypfile: false)
└── server.js             # Main Express server entrypoint
```

---

## 5. Database Schema & Relationships

The database is defined in `db/schema.sql` and initialized automatically on first startup. Automatic versioned migrations ensure schema evolution with zero data loss:

```
┌─────────────────────────────────┐
│           categories            │
│  (Managed in /settings)         │
├─────────────────────────────────┤
│ id (PK, INTEGER AUTOINCREMENT)  │
│ name (TEXT UNIQUE, NOCASE)      │
│ is_system (INTEGER DEFAULT 0)   │
│ created_at / updated_at (TEXT)  │
└────────────────┬────────────────┘
                 │ 1
                 │
                 │ N (ON DELETE RESTRICT; safe reassignment to Uncategorized)
┌────────────────▼────────────────┐
│             books               │
├─────────────────────────────────┤
│ id (PK, INTEGER AUTOINCREMENT)  │
│ title (TEXT NOT NULL)           │
│ author (TEXT NOT NULL)          │
│ category_id (FK -> categories)  │
│ status (TEXT: To Read/Reading/  │
│        Completed)               │
│ total_pages (INTEGER >= 1)      │
│ current_page (INTEGER >= 0)     │
│ last_read_page (INTEGER >= 1)   │ <── PDF Reader current view position
│ cover_url (TEXT DEFAULT '')     │ <── Manual URL override
│ cover_image (TEXT DEFAULT '')   │ <── Auto-extracted PDF cover path
│ pdf_path (TEXT DEFAULT '')      │ <── Internal filesystem storage path
│ pdf_filename (TEXT DEFAULT '')  │ <── Original client filename
│ pdf_size (INTEGER DEFAULT 0)    │ <── File size in bytes
│ pdf_page_count (INTEGER DEFAULT)│ <── Detected document page count
│ rating (INTEGER: 1 to 5 / NULL) │
│ description (TEXT DEFAULT '')   │
│ date_added (TEXT NOT NULL)      │
│ created_at / updated_at (TEXT)  │
└─────────────────────────────────┘

┌─────────────────────────────────┐        ┌─────────────────────────────────┐
│            settings             │        │             profile             │
├─────────────────────────────────┤        ├─────────────────────────────────┤
│ id (PK, INTEGER CHECK(id = 1))  │        │ id (PK, INTEGER CHECK(id = 1))  │
│ default_library_view (TEXT)     │        │ display_name (TEXT NOT NULL)    │
│ default_sort_order (TEXT)       │        │ bio (TEXT DEFAULT '')           │
│ updated_at (TEXT)               │        │ updated_at (TEXT)               │
└─────────────────────────────────┘        └─────────────────────────────────┘
```

---

## 6. Sample Data Baseline

Kutubi initializes automatically with **exactly 24 realistic sample books** across **5 categories**:

- **Engineering (8 books):** Designing Data-Intensive Applications, The Pragmatic Programmer, Clean Architecture, Refactoring, SICP, SRE, Systems Performance, Database Internals.
- **Arabic Literature (6 books):** ثلاثية غرناطة (رضوى عاشور), يوتوبيا (أحمد خالد توفيق), موسم الهجرة إلى الشمال (الطيب صالح), رامة والتنين (إدوار الخراط), اللص والكلاب (نجيب محفوظ), مدن الملح (عبد الرحمن منيف).
- **Fiction & Sci-Fi (5 books):** Dune, Project Hail Mary, Neuromancer, 1984, Foundation.
- **Self-Development (3 books):** Atomic Habits, Deep Work, Show Your Work!.
- **Uncategorized (2 books):** Thinking in Systems, Sapiens.

### Initial Baseline Status Distribution:
- **Currently Reading:** 3 books
- **Completed:** 14 books (58%)
- **To Read:** 7 books

*(Note: Live metrics on the dashboard, profile, and library reflect actual database counts dynamically at all times).*

---

## 7. Installation & Running Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0 or newer (tested on Node.js v24.18.0)
- npm v9.0 or newer

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Kutubi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or for reproducible clean install:
   npm ci
   ```
   > **Note on `npm ci`:** `better-sqlite3` includes official prebuilt binaries. The lockfile is configured with `"gypfile": false` to ensure clean, instant installation on any machine without requiring Python or Visual Studio C++ build tools.

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Access the application:**
   Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```
   *(A genuinely fresh installation automatically initializes the database at `data/kutubi.db` with exactly **8 realistic starter books** (covering English & Arabic titles, all 5 default categories, diverse reading statuses, and an attached demonstration PDF document with an extracted cover) alongside the 5 default categories. A persistent `starter_books_seeded` marker in `app_metadata` ensures starter books are seeded only once—subsequent server restarts preserve all modifications and never repopulate books if deleted).*

5. **Health Check Endpoint:**
   ```text
   GET http://localhost:3000/health
   Response: {"status":"ok","uptime":...,"timestamp":"..."}
   ```

---

## 8. Running Automated Tests

Kutubi includes a complete automated test suite using the Node.js native test runner:

```bash
npm test
```

### Test Coverage Summary (42 Automated Tests across 8 Suites):
- **Starter Books First-Run Seeding & Idempotency Protection:** Fresh 8-book initialization, restart persistence, deletion without repopulation, personal book addition persistence, duplicate submission protection via idempotency tokens, and support for distinct intentional submissions with identical titles (7 tests).
- **Database Initialization & Schema Integrity:** Foreign keys, WAL pragma, table constraints, singleton enforcement, fresh starter initialization (4 tests).
- **Books Service & CRUD:** Full search (English and Arabic), status/category filtering, multi-field sorting, book creation, updates, and deletion (8 tests).
- **Reading Progress Logic:** Auto-transitions to `Completed` on max pages, transitions to `Reading` on partial progress, reset to `To Read` on 0 pages, and strict out-of-bounds page rejection (5 tests).
- **Categories Service & Safety:** Category listing, book counts, case-insensitive duplicate prevention, rename, `Uncategorized` system protection, and safe reassignment upon custom category deletion (5 tests).
- **Dashboard Service:** Live SQLite aggregations, currently reading retrieval, recently added queries, and zero-books division-by-zero protection (5 tests).
- **In-App PDF Service & Document Operations:** Magic byte signature validation, rejection of corrupt/spoofed files, 3-page rendering & first-page thumbnail generation, and database attachment persistence (4 tests).
- **Settings & Profile:** Preferences persistence, JSON backup export, profile updates, and Unicode avatar initials generation rules (4 tests).

---

## 9. Evaluation & Demonstration Script

For a comprehensive university summer training project evaluation:

1. **Dashboard Overview:** Open `http://localhost:3000/`.
   - Highlight the 4 dynamic metric cards calculated live from SQLite (Total Books, Currently Reading, Completed with rounded percentage, and To Read).
   - Point out the active "Currently Reading" cards with progress bars and "Recently Added" books with `PDF` badges.
2. **Bilingual Search & Filtering:** Click **My Library**.
   - Filter by **Status: Reading** or **Status: Completed**.
   - Filter by **Category: Arabic Literature**.
   - Search for an Arabic title like **"غرناطة"** (returns *ثلاثية غرناطة*).
   - Search for an English title like **"Pragmatic"** (returns *The Pragmatic Programmer*).
   - Switch between **Grid View** and **List View** to showcase layout versatility.
3. **In-App PDF Reader & Document Reading Experience:**
   - Click on any book with an attached PDF (e.g. *The Pragmatic Programmer*).
   - Click the prominent **Read Book** button to launch the reader at `/books/:id/read`.
   - **Navigate:** Use Next/Previous buttons or arrow keys to flip pages; enter a number in the page input and press Enter to jump directly to a page.
   - **Zoom & View:** Use Zoom In (+), Zoom Out (-), Fit Width, and Fit Page controls. Toggle Fullscreen.
   - **Mark as Read:** Click **Mark Current Page as Read** in the top toolbar to sync your active page position to your confirmed reading progress. Notice the status bar updating and the completion toast appearing.
   - **Persistence:** Close or refresh the reader. Reopen it to show that it automatically resumes at the exact last read page (`last_read_page`).
4. **PDF Upload & Automatic Cover Extraction:**
   - Click **Add Book**.
   - Fill in Title and Author, select Category.
   - Attach a PDF file from your computer. Notice how the page count can automatically be determined and an automatic first-page cover thumbnail is generated.
   - Submit the book and observe it appear in My Library with its generated cover.
5. **Reading Progress Auto-Transition:**
   - Open a book in `To Read` status (0 pages read).
   - Enter a partial page number $\to$ click Update $\to$ book immediately transitions to `Reading`.
   - Enter the maximum page count $\to$ click Update $\to$ book auto-completes to `Completed` (`100%`).
6. **Category Management & Protection (in Settings):**
   - Navigate to **Settings** $\to$ scroll to Categories section.
   - Add a custom category (e.g. `Philosophy`).
   - Click Delete on `Philosophy` $\to$ confirm in modal $\to$ explain that any books assigned to it are safely reassigned to `Uncategorized`.
   - Note that `Uncategorized` is protected from rename and delete actions.
7. **Reader Profile & Dynamic Initials:**
   - Navigate to **Profile**.
   - Type an English name like `"Sarah Jenkins"` $\to$ initials avatar live-updates to `"SJ"`.
   - Type an Arabic name like `"ابن خلدون"` $\to$ initials avatar live-updates to `"اخ"`.
   - Point out the calculated milestone counters (Books Completed, Pages Read, Favorite Category).
8. **Data Portability:**
   - In Settings, click **Export Library (JSON)** to download a complete backup of the catalog.

---

## 10. License

Developed as a University Summer Training Graduation Project. Released under the MIT License.
