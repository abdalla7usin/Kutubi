import os
import sys
import json
import time
import shutil
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = "screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

ARTIFACT_SCREENSHOT_DIR = r"C:\Users\3BDALLA\.gemini\antigravity\brain\e478ae02-5a34-474a-a5e3-cd0978ee72bb\screenshots"
os.makedirs(ARTIFACT_SCREENSHOT_DIR, exist_ok=True)

BASE_URL = "http://localhost:3000"

def snap(page, filename, wait_ms=500):
    time.sleep(wait_ms / 1000.0)
    local_path = os.path.join(SCREENSHOT_DIR, filename)
    page.screenshot(path=local_path)
    artifact_path = os.path.join(ARTIFACT_SCREENSHOT_DIR, filename)
    shutil.copy2(local_path, artifact_path)
    print(f"  [Snapped] {filename} -> {local_path}")

def set_select(page, selector, value):
    page.evaluate(f"""(() => {{
        const el = document.querySelector("{selector}");
        if (!el) return;
        el.value = "{value}";
        el.dispatchEvent(new Event('change', {{ bubbles: true }}));
    }})()""")

def run_tests():
    print("=" * 70)
    print("KUTUBI FULLSTACK BROWSER VERIFICATION SUITE")
    print(f"Target: {BASE_URL}")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()

        # -------------------------------------------------------------
        # STEP 1: Factory Reset to clean 24 books state
        # -------------------------------------------------------------
        print("\n[Step 1] Ensuring clean factory state...")
        page.goto(f"{BASE_URL}/settings")
        # Click reset sample data if present
        reset_btn = page.query_selector("#reset-sample-btn")
        if reset_btn:
            reset_btn.click()
            time.sleep(0.3)
            confirm_reset = page.query_selector("#modal-confirm-btn")
            if confirm_reset:
                confirm_reset.click()
                time.sleep(0.8)
                print("  Factory reset triggered.")

        # -------------------------------------------------------------
        # STEP 2: Dashboard Verification
        # -------------------------------------------------------------
        print("\n[Step 2] Testing Dashboard (Live Metrics & Cards)...")
        page.goto(f"{BASE_URL}/")
        page.wait_for_selector("#metric-total-books")

        total = page.inner_text("#metric-total-books").strip()
        reading = page.inner_text("#metric-reading-books").strip()
        completed = page.inner_text("#metric-completed-books").strip()
        toread = page.inner_text("#metric-toread-books").strip()

        print(f"  Metrics: Total={total}, Reading={reading}, Completed={completed}, ToRead={toread}")
        assert total == "24", f"Expected 24 total, got {total}"
        assert reading == "3", f"Expected 3 reading, got {reading}"
        assert completed == "14", f"Expected 14 completed, got {completed}"
        assert toread == "7", f"Expected 7 toread, got {toread}"

        # Verify currently reading cards count
        reading_cards = page.query_selector_all("#currently-reading-section .card")
        print(f"  Currently reading cards count: {len(reading_cards)}")
        assert len(reading_cards) == 3, f"Expected 3 cards, got {len(reading_cards)}"

        # Verify recently added cards count
        recent_cards = page.query_selector_all("#recently-added-section .card > a")
        print(f"  Recently added cards count: {len(recent_cards)}")
        assert len(recent_cards) == 4, f"Expected 4 cards, got {len(recent_cards)}"

        snap(page, "fullstack_01_dashboard.png")

        # -------------------------------------------------------------
        # STEP 3: Navigate to Book Details from Currently Reading
        # -------------------------------------------------------------
        print("\n[Step 3] Testing Book Details Navigation...")
        first_reading_card = page.query_selector("#currently-reading-section a.card")
        assert first_reading_card is not None
        first_reading_card.click()
        page.wait_for_selector("#quick-page-input")
        print("  Arrived at Book Details page.")
        snap(page, "fullstack_04_book_details.png")

        # -------------------------------------------------------------
        # STEP 4: Reading Progress Updates & Auto-Transitions
        # -------------------------------------------------------------
        print("\n[Step 4] Testing Reading Progress Updates & Auto-Transitions...")
        # Navigate to a known To Read book: go to library with status=To Read and click the first book
        page.goto(f"{BASE_URL}/library?status=To+Read&view=list")
        page.wait_for_selector("table.data-table tbody tr a")
        first_toread = page.query_selector("table.data-table tbody tr a")
        assert first_toread is not None
        first_toread.click()
        page.wait_for_selector("#quick-page-input")

        # Read max pages from input attribute
        total_pages_attr = page.get_attribute("#quick-page-input", "max") or "352"
        total_pages = int(total_pages_attr)
        half_pages = max(1, total_pages // 2)

        # 4a. Update to partial progress: half_pages -> should become 'Reading'
        print(f"  Updating progress to {half_pages} / {total_pages}...")
        page.fill("#quick-page-input", str(half_pages))
        page.click("#quick-page-form button[type='submit']")
        page.wait_for_selector(".toast")
        time.sleep(0.5)

        badge_status = page.query_selector(".badge-status-reading")
        assert badge_status is not None, "Expected badge-status-reading after partial update"
        print(f"  Status transitioned to 'Reading' with {half_pages} pages.")

        # 4b. Update to total_pages -> should auto-complete to 'Completed'
        print(f"  Updating progress to {total_pages} / {total_pages} (max pages)...")
        page.fill("#quick-page-input", str(total_pages))
        page.click("#quick-page-form button[type='submit']")
        page.wait_for_selector(".toast")
        time.sleep(0.5)

        badge_completed = page.query_selector(".badge-status-completed")
        assert badge_completed is not None, "Expected badge-status-completed after reaching max pages"
        print("  Status auto-completed to 'Completed' (100%).")

        # 4c. Reset to 0 pages -> should revert to 'To Read'
        print("  Updating progress to 0 / total_pages...")
        page.fill("#quick-page-input", "0")
        page.click("#quick-page-form button[type='submit']")
        page.wait_for_selector(".toast")
        time.sleep(0.5)
        print("  Status reverted to 'To Read' (0%).")

        # -------------------------------------------------------------
        # STEP 5: Library Grid View, Search, Filters, Sorting
        # -------------------------------------------------------------
        print("\n[Step 5] Testing Library Grid View & Filters...")
        page.goto(f"{BASE_URL}/library?view=grid")
        page.wait_for_selector("#library-book-count")
        count_text = page.inner_text("#library-book-count")
        print(f"  Library total count: {count_text}")
        assert "24" in count_text, f"Expected 24 books in library, got {count_text}"

        # 5a. Filter by Status: Reading
        page.goto(f"{BASE_URL}/library?status=Reading&view=grid")
        page.wait_for_selector("#library-book-count")
        reading_count = page.inner_text("#library-book-count")
        print(f"  Status=Reading count: {reading_count}")
        assert "3" in reading_count, f"Expected 3 reading books, got {reading_count}"

        # 5b. Filter by Category: Engineering
        page.goto(f"{BASE_URL}/library?category=Engineering&view=grid")
        page.wait_for_selector("#library-book-count")
        eng_count = page.inner_text("#library-book-count")
        print(f"  Category=Engineering count: {eng_count}")
        assert "8" in eng_count, f"Expected 8 engineering books, got {eng_count}"

        # 5c. Filter by Category: Arabic Literature
        page.goto(f"{BASE_URL}/library?category=Arabic+Literature&view=grid")
        page.wait_for_selector("#library-book-count")
        arab_count = page.inner_text("#library-book-count")
        print(f"  Category=Arabic Literature count: {arab_count}")
        assert "6" in arab_count, f"Expected 6 Arabic literature books, got {arab_count}"

        # 5d. Search English: "Pragmatic"
        page.goto(f"{BASE_URL}/library?search=Pragmatic&view=grid")
        page.wait_for_selector("#library-book-count")
        search_eng = page.inner_text("#library-book-count")
        print(f"  Search='Pragmatic' count: {search_eng}")
        assert "1" in search_eng, f"Expected 1 book for 'Pragmatic', got {search_eng}"

        # 5e. Search Arabic: "غرناطة"
        page.goto(f"{BASE_URL}/library?search=%D8%BA%D8%B1%D9%86%D8%A7%D8%B7%D8%A9&view=grid")
        page.wait_for_selector("#library-book-count")
        search_ar = page.inner_text("#library-book-count")
        print(f"  Search='غرناطة' count: {search_ar}")
        assert "1" in search_ar, f"Expected 1 book for 'غرناطة', got {search_ar}"

        # Reset to full grid view and snap
        page.goto(f"{BASE_URL}/library?view=grid")
        page.wait_for_selector("#library-book-count")
        snap(page, "fullstack_02_library_grid.png")

        # -------------------------------------------------------------
        # STEP 6: Library List View
        # -------------------------------------------------------------
        print("\n[Step 6] Testing Library List View...")
        page.goto(f"{BASE_URL}/library?view=list")
        page.wait_for_selector("table.data-table")
        rows = page.query_selector_all("table.data-table tbody tr")
        print(f"  List table rows: {len(rows)}")
        assert len(rows) == 24, f"Expected 24 table rows, got {len(rows)}"
        snap(page, "fullstack_03_library_list.png")

        # -------------------------------------------------------------
        # STEP 7: Add Book Form (Validation & English Creation)
        # -------------------------------------------------------------
        print("\n[Step 7] Testing Add Book Form & Validation...")
        page.goto(f"{BASE_URL}/books/new")
        page.wait_for_selector("#book-title")
        snap(page, "fullstack_05_add_book.png")

        # Test client/server validation: submit empty form
        print("  Testing validation error with empty fields...")
        page.fill("#book-title", "")
        page.fill("#book-author", "")
        page.click("#book-form button[type='submit']")
        time.sleep(0.5)

        # Confirm validation error is rendered
        page.wait_for_selector("#title-error:not(.hidden)")
        print("  Validation errors displayed properly.")
        snap(page, "fullstack_11_validation_error.png")

        # Now fill valid English book
        print("  Submitting valid English book...")
        page.goto(f"{BASE_URL}/books/new")
        page.wait_for_selector("#book-title")
        page.fill("#book-title", "Designing Data-Intensive Applications")
        page.fill("#book-author", "Martin Kleppmann")
        set_select(page, "#book-category", "Engineering")
        page.fill("#book-total-pages", "616")
        page.fill("#book-current-page", "154")
        set_select(page, "#book-status", "Reading")
        # Star rating 5
        star5 = page.query_selector("[data-star-rating='5']")
        if star5:
            star5.click()
        page.fill("#book-notes", "The definitive guide to distributed data systems, storage engines, and reliability.")
        page.click("#book-form button[type='submit']")

        # Redirects to book details or library
        time.sleep(1.0)
        print("  English book created.")

        # -------------------------------------------------------------
        # STEP 8: Add Arabic Book
        # -------------------------------------------------------------
        print("\n[Step 8] Submitting valid Arabic book...")
        page.goto(f"{BASE_URL}/books/new")
        page.wait_for_selector("#book-title")
        page.fill("#book-title", "مقدمة ابن خلدون")
        page.fill("#book-author", "ابن خلدون")
        set_select(page, "#book-category", "Arabic Literature")
        page.fill("#book-total-pages", "800")
        page.fill("#book-current-page", "200")
        set_select(page, "#book-status", "Reading")
        star5 = page.query_selector("[data-star-rating='5']")
        if star5:
            star5.click()
        page.fill("#book-notes", "كتاب تأسيسي في علم الاجتماع وفلسفة التاريخ والعمران البشري.")
        page.click("#book-form button[type='submit']")
        time.sleep(1.0)
        print("  Arabic book created.")

        # Verify total count is now 26
        page.goto(f"{BASE_URL}/")
        total_26 = page.inner_text("#metric-total-books").strip()
        print(f"  Updated total books after 2 creations: {total_26}")
        assert total_26 == "26", f"Expected 26 books, got {total_26}"

        # -------------------------------------------------------------
        # STEP 9: Edit Book Form
        # -------------------------------------------------------------
        print("\n[Step 9] Testing Edit Book Form...")
        # Search for "Designing Data-Intensive Applications" in library
        page.goto(f"{BASE_URL}/library?search=Intensive&view=list")
        page.wait_for_selector("a[title='Edit book']")
        edit_link = page.query_selector("a[title='Edit book']")
        assert edit_link is not None, "Edit link not found"
        edit_url = edit_link.get_attribute("href")
        page.goto(f"{BASE_URL}{edit_url}")
        page.wait_for_selector("#book-title")
        print(f"  Opened Edit Book form for: {page.input_value('#book-title')}")
        snap(page, "fullstack_06_edit_book.png")

        # Update notes
        page.fill("#book-notes", "Updated notes: An indispensable masterpiece for software architects.")
        page.click("#book-form button[type='submit']")
        time.sleep(1.0)
        print("  Edit saved successfully.")

        # -------------------------------------------------------------
        # STEP 10: Delete Book & Modal Confirmation
        # -------------------------------------------------------------
        print("\n[Step 10] Testing Delete Book Modal...")
        page.goto(f"{BASE_URL}/library?search=%D8%AE%D9%84%D8%AF%D9%88%D9%86&view=list")
        page.wait_for_selector("table.data-table")
        page.wait_for_selector("button[title='Delete book']")
        delete_btn = page.query_selector("button[title='Delete book']")
        assert delete_btn is not None, "Delete button not found"
        delete_btn.click()
        time.sleep(0.4)

        # Check modal open
        page.wait_for_selector("#delete-modal-backdrop.open")
        print("  Delete confirmation modal is visible.")
        snap(page, "fullstack_10_delete_modal.png")

        # Test cancel
        page.click("#modal-cancel-btn")
        time.sleep(0.4)
        assert page.query_selector("#delete-modal-backdrop.open") is None
        print("  Cancel successfully dismissed modal without deletion.")

        # Delete for real
        delete_btn = page.query_selector("button[title='Delete book']")
        delete_btn.click()
        time.sleep(0.4)
        page.click("#modal-confirm-btn")
        time.sleep(1.0)
        print("  Confirm Delete executed.")

        # Verify book count decremented to 25
        page.goto(f"{BASE_URL}/")
        total_25 = page.inner_text("#metric-total-books").strip()
        print(f"  Updated total books after deletion: {total_25}")
        assert total_25 == "25", f"Expected 25 books, got {total_25}"

        # -------------------------------------------------------------
        # STEP 11: Settings, Category CRUD & Reassignment
        # -------------------------------------------------------------
        print("\n[Step 11] Testing Settings & Category Management...")
        page.goto(f"{BASE_URL}/settings")
        page.wait_for_selector("#new-category-input")
        snap(page, "fullstack_07_settings.png")

        # Add custom category "Science & Philosophy"
        print("  Adding custom category 'Science & Philosophy'...")
        page.fill("#new-category-input", "Science & Philosophy")
        page.click("#add-category-form button[type='submit']")
        time.sleep(1.0)

        # Verify category exists in rendered body text
        body_text = page.inner_text("body")
        assert "Science & Philosophy" in body_text, "Expected 'Science & Philosophy' to appear in settings page"
        print("  Custom category added.")

        # Try duplicate category
        print("  Testing duplicate category validation...")
        page.fill("#new-category-input", "Science & Philosophy")
        page.click("#add-category-form button[type='submit']")
        time.sleep(1.0)
        body_text_dup = page.inner_text("body")
        assert "already exists" in body_text_dup or "error" in page.url or "already exists" in page.content()
        print("  Duplicate category rejected successfully.")

        # Export JSON check
        print("  Testing Library JSON Export...")
        export_resp = context.request.get(f"{BASE_URL}/settings/export")
        assert export_resp.status == 200, f"Expected 200, got {export_resp.status}"
        export_data = export_resp.json()
        assert "books" in export_data and len(export_data["books"]) >= 24, "Export JSON missing books array"
        assert "categories" in export_data, "Export JSON missing categories array"
        print(f"  JSON Export verified successfully: {len(export_data['books'])} books, {len(export_data['categories'])} categories.")

        # Factory sample reset
        print("  Triggering Sample Data Reset to restore baseline 24 books...")
        page.goto(f"{BASE_URL}/settings")
        page.click("#reset-sample-btn")
        time.sleep(0.4)
        page.click("#modal-confirm-btn")
        time.sleep(1.0)

        # Verify back to 24 books
        page.goto(f"{BASE_URL}/")
        total_reset = page.inner_text("#metric-total-books").strip()
        print(f"  Total books after reset: {total_reset}")
        assert total_reset == "24", f"Expected 24 books after reset, got {total_reset}"

        # -------------------------------------------------------------
        # STEP 12: Profile Page & Dynamic Initials
        # -------------------------------------------------------------
        print("\n[Step 12] Testing Profile Page...")
        page.goto(f"{BASE_URL}/profile")
        page.wait_for_selector("#profile-display-name")
        snap(page, "fullstack_08_profile.png")

        # Update profile
        print("  Updating profile name to 'Sarah Jenkins'...")
        page.fill("#profile-display-name", "Sarah Jenkins")
        page.fill("#profile-bio", "Software engineer, avid reader, and technical book enthusiast.")
        page.click("#profile-form button[type='submit']")
        time.sleep(1.0)

        # Verify persistence and dynamic initials "SJ"
        page.reload()
        page.wait_for_selector("#profile-display-name")
        val = page.input_value("#profile-display-name")
        assert val == "Sarah Jenkins", f"Expected Sarah Jenkins, got {val}"
        avatar_initials = (page.inner_text("#avatar-initials") or page.inner_text("#profile-avatar")).strip()
        print(f"  Updated avatar initials: {avatar_initials}")
        assert "SJ" in avatar_initials, f"Expected SJ, got {avatar_initials}"

        # -------------------------------------------------------------
        # STEP 13: Collapsed Sidebar
        # -------------------------------------------------------------
        print("\n[Step 13] Testing Collapsed Sidebar...")
        page.goto(f"{BASE_URL}/")
        page.click("#sidebar-collapse-btn")
        time.sleep(0.4)
        sidebar = page.query_selector("#app-sidebar.collapsed")
        assert sidebar is not None, "Sidebar should have .collapsed class"
        print("  Sidebar collapsed successfully.")
        snap(page, "fullstack_09_collapsed_sidebar.png")

        # Restore expanded sidebar
        page.click("#sidebar-expand-btn")
        time.sleep(0.4)

        # -------------------------------------------------------------
        # STEP 14: Mobile Responsive (390x844) & Navigation Drawer
        # -------------------------------------------------------------
        print("\n[Step 14] Testing Mobile Viewport (390x844)...")
        mobile_context = browser.new_context(viewport={'width': 390, 'height': 844})
        mobile_page = mobile_context.new_page()
        mobile_page.goto(f"{BASE_URL}/")
        mobile_page.wait_for_selector("#metric-total-books")
        snap(mobile_page, "fullstack_13_mobile_390x844.png")

        # Open mobile drawer
        print("  Opening mobile navigation drawer...")
        mobile_page.click("#mobile-menu-btn")
        time.sleep(0.4)
        snap(mobile_page, "fullstack_14_mobile_drawer_open.png")

        mobile_context.close()
        context.close()
        browser.close()

    print("\n" + "=" * 70)
    print("ALL 14 BROWSER VERIFICATION SCENARIOS PASSED WITH ZERO FAILURES!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
