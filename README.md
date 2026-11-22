# Kutubi (كتبي) — Personal Book Library Manager & In-App PDF Reader

> A dark, ultra-minimalist personal book library web application inspired by the craft, density, and precision of Linear and Raycast. Built with **Node.js, Express 5, SQLite / Turso libSQL, and EJS**.

---

## 1. Project Overview

**Kutubi (كتبي)** is a fullstack personal library, reading tracker, and in-app document reader built as a university summer training graduation project. It allows readers to organize their personal physical and digital book collection, read attached PDF books directly inside the browser, track reading progress in real time, categorize titles, record personal notes and ratings, and visualize reading milestones in an ultra-clean, monochromatic environment.

### Core Highlights
- **Strict Grayscale Aesthetic:** Minimalist dark canvas (`#0B0B0C`, `#121214`, `#1A1A1E`), hairline borders (`1px solid #242429`), zero bright colors, zero glow, and zero drop shadows.
- **Linear/Raycast Craft & Zero-Jitter Navigation:** Custom popover dropdowns, keyboard-navigable menus, stable 220px desktop sidebar with 64px collapsible icon rail, and fixed 18×18px bounding box icons that never jitter or shift during navigation or page refresh.
- **In-App PDF Reader:** Pure JavaScript PDF reader powered by Mozilla PDF.js v4. Multipart uploads with 50 MB limit, strict `%PDF-` magic byte validation, automatic first-page cover generation, dual progress tracking (Last Read Position vs. Confirmed Progress), and full keyboard/toolbar controls.
- **First-Class Bilingual Typography:** Google Fonts `Inter` (Latin) and `IBM Plex Sans Arabic` (Arabic), `dir="auto"` on all user content, and `tabular-nums` on all counters, page badges, and dates.
- **Zero Broken Images:** Multi-tier cover resolution: Manual cover URL $\to$ Extracted PDF cover thumbnail $\to$ Deterministic SVG typographic cover.
- **Dual-Mode Architecture:** Seamlessly operates in **Local Mode** (zero-configuration local SQLite via `better-sqlite3` and filesystem storage) and **Production Cloud Mode** (serverless deployment on Vercel with Turso libSQL database and Vercel Private Blob store).

---

## 2. Key Features

- **Dashboard:**
  - Dynamic library metric cards calculated live from SQLite/Turso: Total Books, Categories Count, Currently Reading, Completed with rounded percentage, and To Read.
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
  - Idempotent submission protection preventing accidental duplicates on network retries.
- **Delete Confirmation Dialog:**
  - Accessible dark confirmation modal with focus trapping, cancel dismiss, and safe cascading file cleanup (deletes associated PDF and cover files).
- **Category Management & Protection (Inside Settings):**
  - *Location:* Category management is centrally housed within **Settings** (`/settings`), keeping navigation focused.
  - Add custom categories with case-insensitive duplicate prevention.
  - Rename custom categories via modal dialog.
  - Safe category deletion: all associated books are automatically and safely reassigned to `Uncategorized`.
  - System protection: `Uncategorized` is protected from being renamed or deleted.
- **Reader Profile:**
  - Dynamic avatar initials generator supporting English and Arabic names (e.g. `Ahmed Khaled` → `AK`, `ابن خلدون` → `اخ`, `Abdalla Husin` → `AH`).
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
- **Server Framework:** Express 5.3.0
- **Template Engine:** EJS (`express-ejs-layouts`)
- **Database Engine (Dual-Mode):**
  - **Local:** SQLite 3 via `better-sqlite3` v13.x (WAL mode & foreign keys enabled)
  - **Production:** Turso libSQL via `@libsql/client` v0.18.x with referential integrity SQLite triggers
- **File & Media Storage (Dual-Mode):**
  - **Local:** Local filesystem storage in `storage/pdfs` and `storage/covers`
  - **Production:** Vercel Private Blob Store via `@vercel/blob` with time-limited presigned tokens
- **PDF Processing & Rendering:** `multer` (multipart upload), `pdf-to-img` / `pdfjs-dist` (pure JS cover extraction and page counting), Mozilla PDF.js v4 (client canvas reader)
- **Frontend / Styling:** Vanilla ES6+ JavaScript, CSS Custom Properties (Design Tokens), Google Fonts (`Inter`, `IBM Plex Sans Arabic`), Material Symbols
- **Hosting & Serverless:** Vercel Serverless Functions (`api/index.js`), Vercel Edge CDN for PDF.js assets, Vercel Authentication deployment protection
- **Testing:** Node.js native test runner (`node:test`, `node:assert`) across 46 unit and integration tests

---

## 4. Dual-Mode Project Architecture

Kutubi utilizes an adapter pattern to run identically across local workstations and cloud environments without code modification:

```
┌────────────────────────────────────────────────────────┐
│                   Kutubi Application                   │
│        Controllers  •  Services  •  Views (EJS)        │
└───────────────────────────┬────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│      LOCAL MODE       │       │    PRODUCTION MODE    │
│ (Zero Cloud Config)   │       │  (Vercel + Turso)     │
├───────────────────────┤       ├───────────────────────┤
│ • SQLite (better-3)   │       │ • Turso (@libsql)     │
│ • storage/ filesystem │       │ • Vercel Private Blob │
│ • Express server.js   │       │ • Vercel Serverless   │
│ • Local WAL mode      │       │ • Vercel Auth Shield  │
└───────────────────────┘       └───────────────────────┘
```

```
Kutubi/
├── api/                  # Vercel serverless function entrypoint
│   └── index.js
├── controllers/          # Route controller layer (handles HTTP requests/responses)
│   ├── books.controller.js       # CRUD, progress update, PDF streaming & reader
│   ├── categories.controller.js  # Category creation, renaming & safe deletion
│   ├── dashboard.controller.js   # Live metrics & recent books
│   ├── library.controller.js     # Library grid/list view & filter query parsing
│   ├── profile.controller.js     # Profile details & milestone statistics
│   └── settings.controller.js    # Preferences & backup export
├── db/                   # Database connection, DDL schema, migrations & seeder
│   ├── adapter.js        # Unified database adapter (SQLiteAdapter & TursoAdapter)
│   ├── database.js       # Connection manager with automatic Turso/SQLite detection
│   ├── schema.sql        # Database schema definitions, triggers & indexes
│   └── seed.js           # 8 starter books, 5 default categories seeder & test fixtures
├── middleware/           # Centralized Express middleware
│   ├── error-handler.js  # Global error handling
│   ├── not-found.js      # 404 handler
│   └── upload.js         # Multer multipart upload with 50 MB limit
├── public/               # Public static assets (served via Vercel Edge CDN in production)
│   ├── css/              # Strict grayscale design tokens and styling
│   └── js/               # Client-side helpers (modal, toast, dropdown, covers)
├── routes/               # Express modular router definitions
├── scripts/              # Build scripts (staging PDF.js vendor assets for Edge CDN)
├── services/             # Business logic & data execution layer
│   ├── books.service.js      # Book CRUD, reading progress & PDF relations
│   ├── categories.service.js # Category queries, renames & safety checks
│   ├── dashboard.service.js  # Live metric aggregations
│   ├── pdf.service.js        # Magic byte validation & thumbnail delegation
│   ├── profile.service.js    # Dynamic profile stats & initials logic
│   ├── settings.service.js   # Settings persistence & export
│   └── storage.service.js    # Unified LocalStorageAdapter & VercelBlobStorageAdapter
├── storage/              # Local persistent document storage (ignored from Git)
│   ├── covers/           # Generated PDF first-page cover thumbnails (.png)
│   ├── pdfs/             # Uploaded PDF document files (.pdf)
│   └── starter/          # Starter PDF guide template
├── tests/                # Automated unit & integration test suite (46 tests across 8 suites)
├── utils/                # Formatting, input validation & cover helpers
├── views/                # Server-rendered EJS templates & partials
├── .env.example          # Sanitized environment variable template
├── .gitignore            # Git exclusion rules (protects local DB and files)
├── .vercelignore         # Vercel deployment exclusion rules
├── package.json          # Dependencies, scripts & project metadata
├── server.js             # Express application root & HTTP server
└── vercel.json           # Vercel serverless routing & bundle configuration
```

---

## 5. Database Schema & Referential Integrity

The database is defined in `db/schema.sql` and initialized automatically:

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
                 │ N (Safe reassignment to Uncategorized upon deletion)
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
│ last_read_page (INTEGER >= 1)   │ <── In-App PDF Reader resume location
│ cover_url (TEXT DEFAULT '')     │ <── Manual URL override
│ cover_image (TEXT DEFAULT '')   │ <── Generated PDF cover path / Blob path
│ pdf_path (TEXT DEFAULT '')      │ <── Filesystem storage path / Blob path
│ pdf_filename (TEXT DEFAULT '')  │ <── Original document filename
│ pdf_size (INTEGER DEFAULT 0)    │ <── File size in bytes
│ pdf_page_count (INTEGER DEFAULT)│ <── Detected document page count
│ rating (INTEGER: 1 to 5 / NULL) │
│ description (TEXT DEFAULT '')   │
│ idempotency_key (TEXT)          │ <── Prevents duplicate submissions
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

### Referential Integrity via Engine Triggers
Because serverless HTTP database connections to Turso execute statelessly, referential integrity is guaranteed through 4 engine-level triggers compiled directly in SQLite:
- `fk_books_category_insert`: Rejects inserts with non-existent `category_id`.
- `fk_books_category_update`: Rejects updates targeting non-existent `category_id`.
- `fk_categories_delete`: Prevents deletion of categories currently referenced by books.
- `fk_categories_update_id`: Prevents changing a category ID while books are attached.

---

## 6. Starter Library on First Installation

A genuinely fresh local installation automatically starts with **8 realistic starter books** across all 5 default categories:
1. **Designing Data-Intensive Applications** (Martin Kleppmann) — *Engineering*
2. **The Pragmatic Programmer** (Andrew Hunt & David Thomas) — *Engineering*
3. **ثلاثية غرناطة** (رضوى عاشور) — *Arabic Literature*
4. **اللص والكلاب** (نجيب محفوظ) — *Arabic Literature*
5. **Dune** (Frank Herbert) — *Fiction & Sci-Fi*
6. **Project Hail Mary** (Andy Weir) — *Fiction & Sci-Fi*
7. **Atomic Habits** (James Clear) — *Self-Development*
8. **Thinking in Systems** (Donella Meadows) — *Uncategorized*

A persistent `starter_books_seeded` flag in the `app_metadata` table guarantees that books are seeded **only once**. Deleting books or restarting the server preserves user changes and will never re-insert deleted books.

---

## 7. Installation & Local Development Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0 or newer (tested on Node.js v24.18.0)
- npm v9.0 or newer

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/abdalla7usin/Kutubi.git
   cd Kutubi
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration (Optional for Local Mode):**
   ```bash
   cp .env.example .env
   ```
   *(By default, Kutubi runs in Local Mode using SQLite and filesystem storage without any cloud credentials).*

4. **Start the local server:**
   ```bash
   npm start
   ```
   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Access the application:**
   Open your browser at:
   ```text
   http://localhost:3000
   ```

6. **Health Check Endpoint:**
   ```text
   GET http://localhost:3000/health
   Response: {"status":"ok","uptime":...,"timestamp":"..."}
   ```

---

## 8. Running Automated Tests

Kutubi includes a comprehensive test suite using the Node.js native test runner:

```bash
npm test
```

To run tests with sequential concurrency:
```bash
npm test -- --test-concurrency=1
```

### Test Coverage (46 Tests across 8 Suites):
- **SQLiteAdapter & Referential Triggers:** Query execution, batch transactions, and trigger enforcement for foreign keys (2 tests).
- **TursoAdapter & libSQL:** Operations over remote/local libSQL client (1 test).
- **Starter Books & Idempotency Protection:** Fresh 8-book initialization, restart persistence, deletion without repopulation, personal book addition persistence, duplicate submission protection via idempotency tokens, and support for distinct intentional submissions with identical titles (7 tests).
- **Database Initialization & Schema Integrity:** Foreign keys, WAL pragma, table constraints, singleton enforcement, fresh starter initialization (4 tests).
- **Books Service & CRUD:** Full search (English and Arabic), status/category filtering, multi-field sorting, book creation, updates, and deletion (8 tests).
- **Reading Progress Logic:** Auto-transitions to `Completed` on max pages, transitions to `Reading` on partial progress, reset to `To Read` on 0 pages, and strict out-of-bounds page rejection (5 tests).
- **Categories Service & Safety:** Category listing, book counts, case-insensitive duplicate prevention, rename, `Uncategorized` system protection, and safe reassignment upon custom category deletion (5 tests).
- **Dashboard Service:** Live SQLite aggregations, currently reading retrieval, recently added queries, and zero-books division-by-zero protection (5 tests).
- **In-App PDF Service & Document Operations:** Magic byte signature validation, rejection of corrupt/spoofed files, 3-page rendering & first-page thumbnail generation, and database attachment persistence (4 tests).
- **Settings & Profile:** Preferences persistence, JSON backup export, profile updates, and Unicode avatar initials generation rules (4 tests).

---

## 9. Production Cloud Deployment (Vercel + Turso + Vercel Blob)

The production application is deployed on **Vercel** with **Turso (libSQL)** and **Vercel Private Blob**:

- **Production URL:** [https://kutubi-sooty.vercel.app](https://kutubi-sooty.vercel.app)
- **Deployment Protection:** Vercel Authentication enabled across all deployments to ensure personal reading data remains private.

### Required Environment Variables for Production

| Variable | Description |
| :--- | :--- |
| `TURSO_DATABASE_URL` | Turso database connection URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso authentication token |
| `BLOB_READ_WRITE_TOKEN` | Vercel Private Blob store access token |
| `NODE_ENV` | Set to `production` |
| `STORAGE_ADAPTER` | Set to `blob` |

### Deploying to Vercel

1. Link project with Vercel CLI:
   ```bash
   vercel link
   ```
2. Pull production environment variables:
   ```bash
   vercel env pull .env.production.local
   ```
3. Deploy to production:
   ```bash
   vercel deploy --prod
   ```

---

## 10. License

Developed as a University Summer Training Graduation Project. Released under the MIT License.
