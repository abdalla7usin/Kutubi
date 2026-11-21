import os
import time
from playwright.sync_api import sync_playwright

os.makedirs('screenshots', exist_ok=True)

def run_verification():
    print("Starting Playwright verification...")
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()

        # Helper to wait for render
        def wait_and_snap(name, wait_ms=600):
            time.sleep(wait_ms / 1000.0)
            path = f"screenshots/{name}.png"
            page.screenshot(path=path)
            print(f"Captured: {path}")

        # 1. Reset LocalStorage to ensure fresh seed
        page.goto('http://localhost:3000/#settings')
        time.sleep(0.5)
        reset_btn = page.query_selector('#reset-sample-btn')
        if reset_btn:
            reset_btn.click()
            time.sleep(0.4)

        # 2. View 1: Dashboard
        print("\n--- Testing 1. Dashboard ---")
        page.goto('http://localhost:3000/#dashboard')
        page.wait_for_selector('#metric-total-books')
        total_books = page.inner_text('#metric-total-books')
        reading_books = page.inner_text('#metric-reading-books')
        completed_books = page.inner_text('#metric-completed-books')
        toread_books = page.inner_text('#metric-toread-books')
        print(f"Dashboard Metrics: Total={total_books}, Reading={reading_books}, Completed={completed_books}, ToRead={toread_books}")
        assert total_books == '24', f"Expected 24 books, got {total_books}"
        assert reading_books == '3', f"Expected 3 reading, got {reading_books}"
        assert completed_books == '14', f"Expected 14 completed, got {completed_books}"
        assert toread_books == '7', f"Expected 7 to read, got {toread_books}"
        wait_and_snap('01_dashboard')

        # 3. View 2: Library Grid View
        print("\n--- Testing 2. Library Grid View ---")
        page.goto('http://localhost:3000/#library')
        page.wait_for_selector('#library-book-count')
        print("Library count:", page.inner_text('#library-book-count'))
        wait_and_snap('02_library_grid')

        # 4. View 3: Library List View
        print("\n--- Testing 3. Library List View ---")
        page.click('#toggle-list-view')
        time.sleep(0.3)
        wait_and_snap('03_library_list')
        # Switch back to grid
        page.click('#toggle-grid-view')
        time.sleep(0.2)

        # 5. Search & Empty State
        print("\n--- Testing Search & Empty State ---")
        page.fill('#library-search-input', 'xyznonexistentbook123')
        time.sleep(0.3)
        wait_and_snap('12_empty_filters')
        # Click Clear Filters
        page.click('#clear-filters-btn')
        time.sleep(0.3)
        assert page.inner_text('#library-book-count').startswith('24')

        # Test Arabic Search
        page.fill('#library-search-input', 'غرناطة')
        time.sleep(0.3)
        count_arabic = page.inner_text('#library-book-count')
        print(f"Arabic search 'غرناطة': {count_arabic}")
        assert '1 book' in count_arabic
        page.fill('#library-search-input', '')
        time.sleep(0.3)

        # 6. View 4: Book Details
        print("\n--- Testing 4. Book Details ---")
        page.goto('http://localhost:3000/#book/book-1')
        page.wait_for_selector('#progress-percent')
        initial_pct = page.inner_text('#progress-percent')
        print(f"Initial progress: {initial_pct}")
        wait_and_snap('04_book_details')

        # Test inline progress update from 312 to 400
        page.fill('#quick-page-input', '400')
        page.click('#quick-page-form button[type="submit"]')
        time.sleep(0.4)
        updated_pct = page.inner_text('#progress-percent')
        meta_page = page.inner_text('#meta-current-page')
        print(f"Updated progress: {updated_pct}, meta page: {meta_page}")
        assert '65%' in updated_pct
        assert meta_page == '400'

        # 7. View 5: Add Book & Validation Error
        print("\n--- Testing 5. Add Book & Validation ---")
        page.goto('http://localhost:3000/#add')
        page.wait_for_selector('#book-title')
        wait_and_snap('05_add_book')

        # Trigger validation error: current page > total pages
        page.fill('#book-title', 'Site Reliability Engineering')
        page.fill('#book-author', 'Betsy Beyer')
        page.fill('#book-total-pages', '500')
        page.fill('#book-current-page', '700')
        page.click('#save-book-btn')
        time.sleep(0.3)
        err_text = page.inner_text('#current-page-error')
        print(f"Validation error message: '{err_text}'")
        assert 'Current page cannot exceed total pages' in err_text
        wait_and_snap('11_validation_error')

        # Fix validation and save new book (increments total books to 25)
        page.fill('#book-current-page', '150')
        page.click('#save-book-btn')
        time.sleep(0.5)
        print("Redirected after valid save to:", page.url)

        # Check dashboard total books is now 25
        page.goto('http://localhost:3000/#dashboard')
        page.wait_for_selector('#metric-total-books')
        new_total = page.inner_text('#metric-total-books')
        print(f"Dashboard total books after add: {new_total}")
        assert new_total == '25'

        # 8. View 6: Edit Book
        print("\n--- Testing 6. Edit Book ---")
        page.goto('http://localhost:3000/#edit/book-1')
        page.wait_for_selector('#book-title')
        wait_and_snap('06_edit_book')

        # 9. Delete Confirmation Modal
        print("\n--- Testing Delete Modal ---")
        page.click('#form-delete-book-btn')
        time.sleep(0.3)
        modal_title = page.inner_text('#modal-alert-title')
        print(f"Delete modal title: '{modal_title}'")
        assert 'Designing Data-Intensive Applications' in modal_title
        wait_and_snap('10_delete_modal')
        # Close modal
        page.click('#modal-cancel-btn')
        time.sleep(0.3)

        # 10. View 7: Settings
        print("\n--- Testing 7. Settings ---")
        page.goto('http://localhost:3000/#settings')
        page.wait_for_selector('#new-category-input')
        wait_and_snap('07_settings')

        # Test Add Category
        page.fill('#new-category-input', 'Distributed Systems')
        page.click('#add-category-form button[type="submit"]')
        time.sleep(0.4)
        has_new_cat = page.locator('text="Distributed Systems"').count() > 0
        print(f"Added 'Distributed Systems' category: {has_new_cat}")
        assert has_new_cat

        # 11. View 8: Profile
        print("\n--- Testing 8. Profile ---")
        page.goto('http://localhost:3000/#profile')
        page.wait_for_selector('#profile-display-name')
        wait_and_snap('08_profile')

        # Test Dynamic Initials Update
        page.fill('#profile-display-name', 'Sarah Connor')
        time.sleep(0.2)
        initials = page.inner_text('#avatar-initials')
        print(f"Initials for 'Sarah Connor': '{initials}'")
        assert initials == 'SC'
        page.click('#save-profile-btn')
        time.sleep(0.3)

        # 12. Collapsed Sidebar Shell & Persistence
        print("\n--- Testing Collapsed Sidebar & Persistence ---")
        page.goto('http://localhost:3000/#library')
        time.sleep(0.3)
        # Click collapse button
        page.click('#sidebar-collapse-btn')
        time.sleep(0.4)
        sidebar_classes = page.get_attribute('#app-sidebar', 'class')
        print("Sidebar classes after collapse:", sidebar_classes)
        assert 'collapsed' in sidebar_classes
        wait_and_snap('09_collapsed_sidebar')

        # Click monogram "K" to expand
        page.click('#sidebar-expand-btn')
        time.sleep(0.4)
        sidebar_classes = page.get_attribute('#app-sidebar', 'class')
        assert 'collapsed' not in sidebar_classes
        print("Sidebar expanded successfully via 'K' monogram button!")

        # Collapse and test reload persistence
        page.click('#sidebar-collapse-btn')
        time.sleep(0.3)
        page.reload()
        time.sleep(0.4)
        sidebar_classes = page.get_attribute('#app-sidebar', 'class')
        print("Sidebar classes after page reload:", sidebar_classes)
        assert 'collapsed' in sidebar_classes
        # Expand back
        page.click('#sidebar-expand-btn')
        time.sleep(0.3)

        # 13. Mobile Viewport (390x844)
        print("\n--- Testing Mobile Viewport (390x844) ---")
        context_mobile = browser.new_context(viewport={'width': 390, 'height': 844})
        page_mobile = context_mobile.new_page()
        page_mobile.goto('http://localhost:3000/#dashboard')
        time.sleep(0.5)

        # Check horizontal overflow
        scroll_width = page_mobile.evaluate("() => document.documentElement.scrollWidth")
        client_width = page_mobile.evaluate("() => document.documentElement.clientWidth")
        print(f"Mobile widths: scrollWidth={scroll_width}, clientWidth={client_width}")
        assert scroll_width <= client_width, f"Mobile page has horizontal overflow! ({scroll_width} > {client_width})"

        page_mobile.screenshot(path='screenshots/13_mobile_390x844.png')
        print("Captured: screenshots/13_mobile_390x844.png")

        # Test mobile drawer
        page_mobile.click('#mobile-menu-btn')
        time.sleep(0.4)
        page_mobile.screenshot(path='screenshots/14_mobile_drawer_open.png')
        print("Captured: screenshots/14_mobile_drawer_open.png")

        browser.close()
        print("\nAll verification flows passed 100% successfully!")

if __name__ == '__main__':
    run_verification()
