# Kutubi (كتبي) — Personal Book Library Manager

> A dark, ultra-minimalist personal book library web application inspired by the craft, density, and precision of Linear and Raycast. Built with **Node.js, Express, SQLite (`better-sqlite3`), and EJS**.

---

## 1. Project Overview

**Kutubi (كتبي)** is a fullstack personal library and reading tracker built as a university summer training graduation project. It allows readers to organize their personal physical and digital book collection, track reading progress in real time, categorize titles, record personal notes and ratings, and visualize reading milestones in an ultra-clean, monochromatic environment.

### Core Highlights
- **Strict Grayscale Aesthetic:** Minimalist dark canvas (`#0B0B0C`, `#121214`, `#1A1A1E`), hairline borders (`1px solid #242429`), zero bright colors, zero glow, and zero drop shadows.
- **Raycast/Linear Craft:** Custom popover dropdowns, keyboard-navigable menus, responsive 64px collapsible icon rail, and crisp micro-interactions (`150ms–200ms cubic-bezier(0.2, 0, 0, 1)`).
- **First-Class Bilingual Typography:** Google Fonts `Inter` (Latin) and `IBM Plex Sans Arabic` (Arabic), `dir="auto"` on all user content, and `tabular-nums` on all counters and dates.
- **Zero Broken Images:** Deterministic SVG typographic covers automatically generated when no cover image URL is provided.
- **Persistent SQLite Database:** Powered by `better-sqlite3` with foreign key enforcement and Write-Ahead Logging (`WAL`) mode. Zero simulated prototype state.

---

## 2. Key Features

- **Dashboard:** Real-time library metrics (Total Books, Categories Count, Currently Reading, Completed with rounded percentage, To Read), active "Currently Reading" progress cards, and "Recently Added" titles.
- **My Library (Grid & List Views):**
  - **4-Column Grid View:** Visual card layout with progress bars, status pills, and category badges.
  - **Structured List View:** Compact data table with 36×54px thumbnails, progress meters, and star ratings.
  - **Live Search & Filters:** Search by title or author in both English and Arabic; filter by Reading Status, Category, and sort by Recently Added, Title (A–Z), Progress, or Rating.
- **Book Details & Reading Progress:**
  - Quick Page Update form that auto-transitions reading statuses:
    - Setting current page equal to total pages auto-completes the book (`100%`).
    - Updating partial progress on a queued book auto-transitions status to `Reading`.
    - Resetting current page to 0 returns status to `To Read`.
    - Strict validation rejecting invalid or out-of-bounds page numbers.
  - Responsive metadata grid (Category, Author, Total Pages, Rating, Date Added) and personal reading notes.
- **Add & Edit Book Management:**
  - Unified form with live cover image preview container and interactive 5-star rating selector.
- **Delete Confirmation Dialog:**
  - Accessible dark confirmation modal with focus trapping and cancel dismiss.
- **Category Management & Protection:**
  - Add custom categories with case-insensitive duplicate prevention.
  - Rename custom categories via modal dialog.
  - Safe category deletion: all associated books are automatically and safely reassigned to `Uncategorized`.
  - System protection: `Uncategorized` is protected from being renamed or deleted.
- **Reader Profile:**
  - Dynamic avatar initials generator supporting English and Arabic names (e.g. `Ahmed Khaled` → `AK`, `ابن خلدون` → `اخ`, `Ahmed` → `AH`).
  - Milestone summary: Books Completed count, Total Pages Read (`SUM(current_page)`), and Favorite Category.
- **Data Portability & Preferences:**
  - Full catalog backup exported as timestamped JSON file.
  - Sample Data Reset to restore pristine 24-book demonstration baseline.
  - Persistent default library view (`grid` / `list`) and default sorting order.
- **Responsive Layout:**
  - Desktop: 240px sidebar with 64px collapsible icon rail.
  - Mobile (< 768px): Sticky mobile header with slide-over navigation drawer.

---

## 3. Technology Stack

- **Backend Runtime:** Node.js (v18.0+)
- **Server Framework:** Express 4.x
- **Template Engine:** EJS (`express-ejs-layouts`)
- **Database Engine:** SQLite 3 via `better-sqlite3` v12.x
- **Database Mode:** Write-Ahead Logging (`PRAGMA journal_mode = WAL`), Foreign Keys enabled (`PRAGMA foreign_keys = ON`)
- **Frontend / Styling:** Vanilla ES6+ JavaScript, CSS Custom Properties (Design Tokens), Google Fonts (`Inter`, `IBM Plex Sans Arabic`), Material Symbols
- **Testing:** Node.js built-in test runner (`node:test`, `node:assert`), Playwright Chromium for end-to-end browser verification

---

## 4. Project Architecture

```
Kutubi/
├── controllers/          # Route controller layer (handles HTTP requests/responses)
│   ├── books.controller.js
│   ├── categories.controller.js
│   ├── dashboard.controller.js
│   ├── library.controller.js
│   ├── profile.controller.js
│   └── settings.controller.js
├── db/                   # Database connection, DDL schema & seeder
│   ├── database.js       # SQLite connection manager with WAL mode
│   ├── schema.sql        # Database schema definitions & indexes
│   └── seed.js           # 24 sample books & 5 categories seeder
├── middleware/           # Centralized Express error & 404 handlers
│   ├── error-handler.js
│   └── not-found.js
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
│   ├── books.routes.js
│   ├── categories.routes.js
│   ├── dashboard.routes.js
│   ├── library.routes.js
│   ├── profile.routes.js
│   └── settings.routes.js
├── services/             # Business logic & SQL query execution layer
│   ├── books.service.js
│   ├── categories.service.js
│   ├── dashboard.service.js
│   ├── profile.service.js
│   └── settings.service.js
├── tests/                # Automated unit & integration test suite (32 tests)
│   ├── books.test.js
│   ├── categories.test.js
│   ├── dashboard.test.js
│   ├── database.test.js
│   ├── progress.test.js
│   └── settings-profile.test.js
├── utils/                # Formatting, input validation & cover helpers
│   ├── covers.js
│   ├── formatting.js
│   └── validation.js
├── views/                # Server-rendered EJS templates
│   ├── layout.ejs        # Master layout shell
│   ├── pages/            # Page templates (Dashboard, Library, Book Details, Form, Settings, Profile)
│   └── partials/         # Modular partials (Sidebar, Header, Modals, Scripts, Toasts)
├── data/                 # SQLite storage directory (.gitkeep tracked; .db files ignored)
├── package.json          # Dependencies, scripts & project metadata
└── server.js             # Main Express server entrypoint
```

---

## 5. Database Schema & Relationships

The database is defined in `db/schema.sql` and initialized automatically on first startup:

```
┌─────────────────────────────────┐
│           categories            │
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
│ cover_url (TEXT DEFAULT '')     │
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

### Status Distribution:
- **Currently Reading:** 3 books
- **Completed:** 14 books (58%)
- **To Read:** 7 books

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

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Access the application:**
   Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```
   *(The database is automatically created and seeded at `data/kutubi.db` on first run).*

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

### Test Coverage Summary (32 Automated Tests):
- **Database Initialization & Schema Integrity:** Foreign keys, WAL pragma, table constraints, singleton enforcement, seed count accuracy (5 tests).
- **Books Service & CRUD:** Full search (English and Arabic), status/category filtering, multi-field sorting, book creation, updates, and deletion (8 tests).
- **Reading Progress Logic:** Auto-transitions to `Completed` on max pages, transitions to `Reading` on partial progress, reset to `To Read` on 0 pages, and strict out-of-bounds page rejection (5 tests).
- **Categories Service & Safety:** Category listing, book counts, case-insensitive duplicate prevention, rename, `Uncategorized` system protection, and safe reassignment upon custom category deletion (5 tests).
- **Dashboard Service:** Live SQLite aggregations, currently reading retrieval, recently added queries, and zero-books division-by-zero protection (4 tests).
- **Settings & Profile:** Preferences persistence, JSON backup export, factory sample data reset, profile updates, and Unicode avatar initials generation rules (5 tests).

---

## 9. Evaluation & Demonstration Script

For a quick 3-minute university summer training project evaluation:

1. **Dashboard Overview:** Open `http://localhost:3000/`. Highlight the 4 live metric cards (24 books, 3 reading, 14 completed [58%], 7 to read) and the 3 active reading cards with progress bars.
2. **Bilingual Search & Filtering:** Click **My Library**.
   - Filter by **Status: Reading** (shows 3 books).
   - Filter by **Category: Arabic Literature** (shows 6 books).
   - Search for **"غرناطة"** (shows *ثلاثية غرناطة*).
   - Search for **"Pragmatic"** (shows *The Pragmatic Programmer* with its fallback typographic cover).
3. **Reading Progress Auto-Transition:** Click on *Clean Architecture* (To Read, 0/352 pages).
   - Enter `150` $\to$ click Update $\to$ book immediately transitions to `Reading` with progress bar at 43%.
   - Enter `352` $\to$ click Update $\to$ book auto-completes to `Completed` (100%).
4. **Add Book with Validation:** Click **Add Book**.
   - Attempt to submit empty form $\to$ observe red validation feedback.
   - Enter a title and author $\to$ select category $\to$ observe live cover preview container $\to$ submit.
5. **Safe Category Deletion:** Navigate to **Settings**.
   - Add a custom category (e.g. `Philosophy`).
   - Click Delete on `Philosophy` $\to$ confirm in modal $\to$ explain that any books assigned to it are safely reassigned to `Uncategorized`.
   - Show that `Uncategorized` has no delete button (protected system category).
6. **Reader Profile & Dynamic Initials:** Navigate to **Profile**.
   - Type `"Sarah Jenkins"` $\to$ initials avatar live-updates to `"SJ"`.
   - Type an Arabic name like `"ابن خلدون"` $\to$ initials avatar live-updates to `"اخ"`.
7. **JSON Backup Export:** In Settings, click **Export Library (JSON)** to demonstrate complete data portability.

---

## 10. License

Developed as a Summer Training Graduation Project. Released under the MIT License.
