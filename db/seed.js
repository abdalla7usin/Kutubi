/**
 * Kutubi - Database Seeder
 * Recreates the exact 24 sample books and 5 categories from the approved prototype:
 * - Categories: Engineering (8), Arabic Literature (6), Fiction & Sci-Fi (5), Self-Development (3), Uncategorized (2) = 24
 * - Statuses: Reading (3), Completed (14), To Read (7) = 24
 */

const INITIAL_CATEGORIES = [
  { name: 'Engineering', isSystem: 0 },
  { name: 'Arabic Literature', isSystem: 0 },
  { name: 'Fiction & Sci-Fi', isSystem: 0 },
  { name: 'Self-Development', isSystem: 0 },
  { name: 'Uncategorized', isSystem: 1 }
];

const INITIAL_BOOKS = [
  // 1. Currently Reading (3 books)
  {
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    category: 'Engineering',
    status: 'Reading',
    totalPages: 616,
    currentPage: 312,
    rating: 4,
    coverUrl: '',
    dateAdded: 'Oct 14, 2026',
    notes: 'A thorough exploration of the principles behind reliable, scalable, and maintainable data systems. Chapters 5 through 7 on replication, partitioning, and transactions provide the clearest mental model I have encountered for reasoning about distributed state.\n\nKey takeaway from Chapter 7: write skew is easy to miss under snapshot isolation because it involves disjoint rows that share a logical invariant. Revisit the section on serializable snapshot isolation (SSI) before designing the next ledger service.'
  },
  {
    title: 'ثلاثية غرناطة',
    author: 'رضوى عاشور',
    category: 'Arabic Literature',
    status: 'Reading',
    totalPages: 504,
    currentPage: 240,
    rating: 5,
    coverUrl: '',
    dateAdded: 'Oct 11, 2026',
    notes: 'ملحمة أندلسية استثنائية تؤرخ لسقوط غرناطة ومحنة الموريسكيين عبر ثلاثة أجيال من عائلة أبي جعفر الورّاق. سردية رضوى عاشور الشعرية تجعل التاريخ يتنفس من خلال تفاصيل الحياة اليومية في حي البيازين ومقاومة النسيان وحرق المخطوطات والكتب العربية.\n\nمن أعمق الاقتباسات: "في البدء نسيت، أو توهمت أنها نسيت، لكن الذاكرة نهر يجري تحت الأرض ويعود في أي لحظة ليفجر ينابيعه".'
  },
  {
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt & David Thomas',
    category: 'Engineering',
    status: 'Reading',
    totalPages: 352,
    currentPage: 98,
    rating: 5,
    coverUrl: '',
    dateAdded: 'Oct 09, 2026',
    notes: '20th Anniversary Edition. Classic guidance on software craftsmanship, orthogonality, and DRY principles. The concept of "Stone Soup and Boiled Frogs" remains as relevant as ever for managing software entropy.'
  },

  // 2. Engineering (Remaining 6 books: 5 Completed, 1 To Read)
  {
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    category: 'Engineering',
    status: 'Completed',
    totalPages: 432,
    currentPage: 432,
    rating: 4,
    coverUrl: 'https://lh3.googleusercontent.com/aida/ALJJyrDENJkPhkHWepDBXMcw7XaBd5-U0PDgfgV9QsaEcykmjEVz5kcJTkLGIw2YeWur5tq2KxzCYe4iiS1Ku6QOahV-HLz4HGi1lOhOk8vOyqI7NSseg7BeKkL76wxB8A-dpIWUtywXHs_a5eEUw0S0yqXFH0zKsJdYVSQXCRfkaMRFyAQXcrI1PInETcynjXmTCcEJys7mepnflEEJeSAstxiUqLXPeyYxt-lLfsbkuEZPmdj5llLMCGS1NVnWbuJVnTA_Y7Cs',
    dateAdded: 'Oct 06, 2026',
    notes: 'A Craftsman’s Guide to Software Structure and Design. Essential lessons on the dependency rule and separating business logic from frameworks, UI, and databases.'
  },
  {
    title: 'Refactoring',
    author: 'Martin Fowler',
    category: 'Engineering',
    status: 'Completed',
    totalPages: 448,
    currentPage: 448,
    rating: 5,
    coverUrl: 'https://lh3.googleusercontent.com/aida/ALJJyrAvuS9TojC6PITuxXEQEkRTRI58QayUOeIAf_QASnkqK5V5DI3Pj8uxZ9FPkVVKA_RH8HI1Eg0XjBAWQ0puv6XMSPgVPWO7-rw-t_54OMyuJYQvPCkdDNQuGkGQtlfthW_DC7QiqpqRBfWzS-dRq73NyqQH_fR9ENeSj13om8TV25tc-J6cCeEHTlel86r4aNkkqXYXmIPgKuV_K4QHxohB5QWk4n7V4318GzEBJZ1OcCaIxYPYl9aQoHg-ezm90nAahY-jrA',
    dateAdded: 'Sep 22, 2026',
    notes: 'Improving the Design of Existing Code (2nd Edition). Great catalogue of code smells and step-by-step refactoring primitives.'
  },
  {
    title: 'Structure and Interpretation of Computer Programs',
    author: 'Harold Abelson & Gerald Jay Sussman',
    category: 'Engineering',
    status: 'Completed',
    totalPages: 657,
    currentPage: 657,
    rating: 5,
    coverUrl: '',
    dateAdded: 'Aug 15, 2026',
    notes: 'The legendary SICP book. Teaches computational processes, meta-linguistic abstraction, and register machines with Scheme.'
  },
  {
    title: 'Site Reliability Engineering',
    author: 'Betsy Beyer et al.',
    category: 'Engineering',
    status: 'Completed',
    totalPages: 550,
    currentPage: 550,
    rating: 4,
    coverUrl: '',
    dateAdded: 'Aug 29, 2026',
    notes: 'How Google Runs Production Systems. Covers SLOs, SLAs, error budgets, and blameless postmortems.'
  },
  {
    title: 'Systems Performance',
    author: 'Brendan Gregg',
    category: 'Engineering',
    status: 'Completed',
    totalPages: 890,
    currentPage: 890,
    rating: 5,
    coverUrl: '',
    dateAdded: 'Jul 10, 2026',
    notes: 'Enterprise and the Cloud (2nd Edition). Exhaustive guide to Linux performance analysis, USE method, and eBPF tracing.'
  },
  {
    title: 'Database Internals',
    author: 'Alex Petrov',
    category: 'Engineering',
    status: 'To Read',
    totalPages: 374,
    currentPage: 0,
    rating: 4,
    coverUrl: '',
    dateAdded: 'Oct 18, 2026',
    notes: 'Deep dive into storage engines, B-trees, LSM-trees, and distributed consensus.'
  },

  // 3. Arabic Literature (Remaining 5 books: 3 Completed, 2 To Read)
  {
    title: 'يوتوبيا',
    author: 'أحمد خالد توفيق',
    category: 'Arabic Literature',
    status: 'Completed',
    totalPages: 192,
    currentPage: 192,
    rating: 4,
    coverUrl: '',
    dateAdded: 'Oct 02, 2026',
    notes: 'رواية ديستوبية قاسية تتنبأ بمصر عام 2023 بعد انقسام المجتمع إلى طبقة فاحشة الثراء تعيش في مستعمرة معزولة بحراسة المارينز، وبقية الشعب يعيش في فقر مدقع ومجاعة.\n\nرؤية استشرافية سوداوية كتبها العراب بأسلوبه السلس والصادم.'
  },
  {
    title: 'مدن الملح',
    author: 'عبد الرحمن منيف',
    category: 'Arabic Literature',
    status: 'To Read',
    totalPages: 630,
    currentPage: 0,
    rating: 5,
    coverUrl: '',
    dateAdded: 'Sep 25, 2026',
    notes: 'خماسية روائية ملحمية تصور التحولات الاجتماعية والسياسية العميقة في الجزيرة العربية مع اكتشاف النفط وانهيار نمط الحياة البدوية والواحات.'
  },
  {
    title: 'أولاد حارتنا',
    author: 'نجيب محفوظ',
    category: 'Arabic Literature',
    status: 'Completed',
    totalPages: 588,
    currentPage: 588,
    rating: 5,
    coverUrl: '',
    dateAdded: 'Aug 19, 2026',
    notes: 'واحدة من أعظم الروايات الرمزية الفلسفية في الأدب العربي المعاصر، تناقش ثنائية العدل والقوة والبحث الدائم عن الخلاص والمعرفة.'
  },
  {
    title: 'ساق البامبو',
    author: 'سعود السنعوسي',
    category: 'Arabic Literature',
    status: 'Completed',
    totalPages: 396,
    currentPage: 396,
    rating: 4,
    coverUrl: '',
    dateAdded: 'Jul 15, 2026',
    notes: 'رواية فائزة بجائزة البوكر العربية، تطرح تساؤلات حادة عن الهوية والانتماء والعنصرية من خلال شخصية عيسى/خوزيه الكويتي الفلبيني.'
  },
  {
    title: 'موسم الهجرة إلى الشمال',
    author: 'الطيب صالح',
    category: 'Arabic Literature',
    status: 'To Read',
    totalPages: 170,
    currentPage: 0,
    rating: 5,
    coverUrl: '',
    dateAdded: 'Oct 16, 2026',
    notes: 'تحفة الأدب العربي الحديث عن صدام الشرق والغرب والاستعمار من خلال رحلة مصطفى سعيد المأساوية بين لندن وقرية على ضفاف النيل.'
  },

  // 4. Fiction & Sci-Fi (5 books: 3 Completed, 2 To Read)
  {
    title: 'Dune',
    author: 'Frank Herbert',
    category: 'Fiction & Sci-Fi',
    status: 'To Read',
    totalPages: 688,
    currentPage: 0,
    rating: 5,
    coverUrl: 'https://lh3.googleusercontent.com/aida/ALJJyrDX9SGN3JXK05qAGXmoJ58nUAhaRt69RSWJZ1JbqeyFBlX8lXnrZ1myzJa7nmZ_ROz72vNQYV0Qh1AGJZ6aP1fLfJDUwC7e0oAQ60cqlxx9VgdJ77M9pkwqS8o1kVu2twvIQuCNjVNoRputIlTGkz59ozmMTWXfJbJzllrLPrPUjiHyuZ7sa6GvAOjwi7NVbTrw5bIyCNcpqNOX8B0Kco-apOvFO8XmH36cQ_fhhRN9MZ9cP94rBmGSj4ZiHXCwdA',
    dateAdded: 'Sep 28, 2026',
    notes: 'Set on the desert planet Arrakis, Dune is the story of Paul Atreides and the complex interplay of politics, religion, and ecology around the spice melange.'
  },
  {
    title: 'Project Hail Mary',
    author: 'Andy Weir',
    category: 'Fiction & Sci-Fi',
    status: 'Completed',
    totalPages: 496,
    currentPage: 496,
    rating: 5,
    coverUrl: '',
    dateAdded: 'Sep 14, 2026',
    notes: 'Ryland Grace is the sole survivor on a desperate interstellar mission to save Earth from an extinction-level solar crisis. Fantastic hard sci-fi problem-solving.'
  },
  {
    title: 'Neuromancer',
    author: 'William Gibson',
    category: 'Fiction & Sci-Fi',
    status: 'Completed',
    totalPages: 271,
    currentPage: 271,
    rating: 4,
    coverUrl: '',
    dateAdded: 'Aug 04, 2026',
    notes: 'The foundational cyberpunk novel that coined the term cyberspace and predicted the matrix, artificial intelligence, and multinational megacorporations.'
  },
  {
    title: 'Foundation',
    author: 'Isaac Asimov',
    category: 'Fiction & Sci-Fi',
    status: 'Completed',
    totalPages: 255,
    currentPage: 255,
    rating: 4,
    coverUrl: '',
    dateAdded: 'Jul 21, 2026',
    notes: 'Hari Seldon uses psychohistory to foresee the fall of the Galactic Empire and creates the Foundation to shorten the impending dark age to a single millennium.'
  },
  {
    title: 'Snow Crash',
    author: 'Neal Stephenson',
    category: 'Fiction & Sci-Fi',
    status: 'To Read',
    totalPages: 440,
    currentPage: 0,
    rating: 4,
    coverUrl: '',
    dateAdded: 'Oct 20, 2026',
    notes: 'Hiro Protagonist delivers pizza for the Mafia and explores the Metaverse in a brilliantly satirical cyberpunk future.'
  },

  // 5. Self-Development (3 books: all 3 Completed)
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    category: 'Self-Development',
    status: 'Completed',
    totalPages: 320,
    currentPage: 320,
    rating: 5,
    coverUrl: 'https://lh3.googleusercontent.com/aida/ALJJyrCeOoh18LuiwOd7QM1X5hLzRgiCL5QXKkNXRTrEgnIKzVSAmH3dNNAbVIaSJ7BeQh4taIpw4DkdxMJdyO4IrTQC6KH2emVNNWDLCxUyMK3wcYLf4_xl2keac3ECsrBP0ZVlt1-qmxQH4Pb_jJvHF_xYyR7AMTtsV9vEeWh7581WGFfF-tfp9d_WiWDpOt6HSqzKGGtvWDykOATwSKHLpbkUG5faFdn__0FlR0Jfzky97LyWvginAipUSVItOFoQeUxJuWaFKz1oJQ',
    dateAdded: 'Sep 05, 2026',
    notes: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones. The four laws of behavior change: Make it obvious, attractive, easy, and satisfying.'
  },
  {
    title: 'Deep Work',
    author: 'Cal Newport',
    category: 'Self-Development',
    status: 'Completed',
    totalPages: 304,
    currentPage: 304,
    rating: 5,
    coverUrl: '',
    dateAdded: 'Aug 12, 2026',
    notes: 'Rules for Focused Success in a Distracted World. High-value work requires uninterrupted blocks of concentration without shallow distractions.'
  },
  {
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    category: 'Self-Development',
    status: 'Completed',
    totalPages: 499,
    currentPage: 499,
    rating: 4,
    coverUrl: '',
    dateAdded: 'Jul 01, 2026',
    notes: 'System 1 (fast, intuitive, emotional) vs System 2 (slower, deliberate, logical) and the cognitive biases that shape human judgment.'
  },

  // 6. Uncategorized (2 books: 2 To Read)
  {
    title: 'The Mythical Man-Month',
    author: 'Frederick P. Brooks Jr.',
    category: 'Uncategorized',
    status: 'To Read',
    totalPages: 322,
    currentPage: 0,
    rating: 4,
    coverUrl: '',
    dateAdded: 'Oct 19, 2026',
    notes: 'Essays on Software Engineering. "Adding manpower to a late software project makes it later."'
  },
  {
    title: 'Gödel, Escher, Bach',
    author: 'Douglas Hofstadter',
    category: 'Uncategorized',
    status: 'To Read',
    totalPages: 777,
    currentPage: 0,
    rating: 5,
    coverUrl: '',
    dateAdded: 'Oct 21, 2026',
    notes: 'An Eternal Golden Braid. A metaphorical exploration of recursion, intelligence, strange loops, and meaning across logic, art, and music.'
  }
];

/**
 * Seed database with initial categories and books if not yet seeded
 * @param {import('better-sqlite3').Database} db
 */
function seedInitialData(db) {
  const seedTransaction = db.transaction(() => {
    const now = new Date().toISOString();

    // 1. Insert Categories
    const insertCat = db.prepare(`
      INSERT OR IGNORE INTO categories (name, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const cat of INITIAL_CATEGORIES) {
      insertCat.run(cat.name, cat.isSystem, now, now);
    }

    // Map category names to IDs
    const categoryRows = db.prepare('SELECT id, name FROM categories').all();
    const categoryMap = new Map();
    for (const row of categoryRows) {
      categoryMap.set(row.name.toLowerCase(), row.id);
    }

    // 2. Insert Books
    const insertBook = db.prepare(`
      INSERT INTO books (
        title, author, category_id, status, total_pages, current_page,
        cover_url, rating, description, date_added, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Let dateAdded determine relative chronological order
    for (let i = 0; i < INITIAL_BOOKS.length; i++) {
      const b = INITIAL_BOOKS[i];
      const categoryId = categoryMap.get(b.category.toLowerCase()) || categoryMap.get('uncategorized');
      // Decrement created_at slightly so array order is preserved in created_at DESC
      const createdAt = new Date(Date.now() - (INITIAL_BOOKS.length - i) * 60000).toISOString();

      insertBook.run(
        b.title,
        b.author,
        categoryId,
        b.status,
        b.totalPages,
        b.currentPage,
        b.coverUrl || '',
        b.rating,
        b.notes,
        b.dateAdded,
        createdAt,
        now
      );
    }

    // 3. Mark as seeded in metadata
    db.prepare(`
      INSERT INTO app_metadata (key, value)
      VALUES ('seeded', '1')
      ON CONFLICT(key) DO UPDATE SET value = '1'
    `).run();
  });

  seedTransaction();
}

/**
 * Reset database to factory default sample data
 * Restores 5 default categories and 24 sample books while preserving user profile & preferences
 * @param {import('better-sqlite3').Database} db
 */
function resetDatabaseToDefaults(db) {
  const resetTransaction = db.transaction(() => {
    // 1. Delete all existing books and reset sequence
    db.prepare('DELETE FROM books').run();
    try {
      db.prepare("DELETE FROM sqlite_sequence WHERE name = 'books'").run();
    } catch {
      // sqlite_sequence might not exist if autoincrement isn't used
    }

    // 2. Delete custom categories (preserving Uncategorized)
    db.prepare('DELETE FROM categories WHERE is_system = 0').run();

    // 3. Ensure Uncategorized exists
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO categories (name, is_system, created_at, updated_at)
      VALUES ('Uncategorized', 1, ?, ?)
    `).run(now, now);

    // 4. Re-insert default custom categories
    const insertCat = db.prepare(`
      INSERT OR IGNORE INTO categories (name, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const cat of INITIAL_CATEGORIES) {
      if (!cat.isSystem) {
        insertCat.run(cat.name, 0, now, now);
      }
    }

    // 5. Re-map categories
    const categoryRows = db.prepare('SELECT id, name FROM categories').all();
    const categoryMap = new Map();
    for (const row of categoryRows) {
      categoryMap.set(row.name.toLowerCase(), row.id);
    }

    // 6. Re-insert 24 sample books
    const insertBook = db.prepare(`
      INSERT INTO books (
        title, author, category_id, status, total_pages, current_page,
        cover_url, rating, description, date_added, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < INITIAL_BOOKS.length; i++) {
      const b = INITIAL_BOOKS[i];
      const categoryId = categoryMap.get(b.category.toLowerCase()) || categoryMap.get('uncategorized');
      const createdAt = new Date(Date.now() - (INITIAL_BOOKS.length - i) * 60000).toISOString();

      insertBook.run(
        b.title,
        b.author,
        categoryId,
        b.status,
        b.totalPages,
        b.currentPage,
        b.coverUrl || '',
        b.rating,
        b.notes,
        b.dateAdded,
        createdAt,
        now
      );
    }

    // 7. Mark seeded
    db.prepare(`
      INSERT INTO app_metadata (key, value)
      VALUES ('seeded', '1')
      ON CONFLICT(key) DO UPDATE SET value = '1'
    `).run();
  });

  resetTransaction();
}

module.exports = {
  INITIAL_CATEGORIES,
  INITIAL_BOOKS,
  seedInitialData,
  resetDatabaseToDefaults
};
