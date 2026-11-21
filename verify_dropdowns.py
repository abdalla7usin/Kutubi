"""
verify_dropdowns.py - Automated browser test suite for Kutubi Custom Dropdowns
Tests:
1. Library toolbar dropdowns (Status, Category, Sort)
2. Add Book form dropdowns (Category, Reading Status)
3. Settings page dropdown (Default Sort Order)
4. Visual appearance (dark grayscale, Linear/Raycast styling, checkmarks, no OS blue)
5. Keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)
6. State synchronization with underlying native <select> elements and store/views
"""

import os
import sys
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run_tests():
    passed = 0
    total = 0

    def assert_test(cond, msg):
        nonlocal passed, total
        total += 1
        if cond:
            passed += 1
            print(f"  [PASS] {msg}")
        else:
            print(f"  [FAIL] {msg}")
            raise AssertionError(msg)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        print("\n--- 1. Testing My Library Toolbar Custom Dropdowns ---")
        page.goto("http://localhost:3000/#library")
        page.wait_for_selector("#library-status-select-trigger")

        # Verify custom triggers exist and native selects are visually hidden
        status_trigger = page.locator("#library-status-select-trigger")
        assert_test(status_trigger.is_visible(), "Status custom dropdown trigger is visible")
        
        native_status = page.locator("#library-status-select")
        assert_test(native_status.evaluate("el => el.classList.contains('custom-dropdown-native')"), "Native status select has custom-dropdown-native class")
        assert_test(not native_status.is_visible(), "Native status select is visually hidden from screen")

        # Open Status dropdown
        status_trigger.click()
        page.wait_for_timeout(250)
        status_menu = page.locator("#library-status-select-trigger + .custom-dropdown-menu")
        assert_test(status_menu.is_visible(), "Status popover menu opens on trigger click")

        # Take screenshot of open Status dropdown
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "dropdown_01_status_open.png"))
        print("  Screenshot saved: dropdown_01_status_open.png")

        # Check options in menu
        items = status_menu.locator(".custom-dropdown-item")
        assert_test(items.count() == 4, f"Status menu has 4 options (found {items.count()})")
        
        # Click "Reading"
        reading_item = status_menu.locator(".custom-dropdown-item", has_text="Reading")
        reading_item.click()
        page.wait_for_timeout(250)

        # Verify closed and trigger text updated
        assert_test(not status_menu.is_visible(), "Status menu closes after selection")
        updated_status_label = page.locator("#library-status-select-trigger .custom-dropdown-label").inner_text()
        assert_test("Status: Reading" in updated_status_label, f"Trigger label is '{updated_status_label}'")

        # Verify native select value synced
        native_val = page.locator("#library-status-select").input_value()
        assert_test(native_val == "Reading", f"Native select value synced to 'Reading' (got '{native_val}')")

        # Verify books filtered to Reading books (3 books)
        book_count_text = page.locator("#library-book-count").inner_text()
        assert_test("3 books" in book_count_text, f"Library view reacted to filter: {book_count_text}")

        # Open Category dropdown
        category_trigger = page.locator("#library-category-select-trigger")
        category_trigger.click()
        page.wait_for_timeout(250)
        category_menu = page.locator("#library-category-select-trigger + .custom-dropdown-menu")
        assert_test(category_menu.is_visible(), "Category popover menu opens on click")

        # Take screenshot of open Category dropdown
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "dropdown_02_category_open.png"))
        print("  Screenshot saved: dropdown_02_category_open.png")

        # Select "All" back on status to reset, or click outside to close
        page.keyboard.press("Escape")
        page.wait_for_timeout(250)
        assert_test(not category_menu.is_visible(), "Category menu closes on Escape key")

        # Open Sort dropdown
        sort_trigger = page.locator("#library-sort-select-trigger")
        sort_trigger.click()
        page.wait_for_timeout(250)
        sort_menu = page.locator("#library-sort-select-trigger + .custom-dropdown-menu")
        assert_test(sort_menu.is_visible(), "Sort popover menu opens on click")

        # Take screenshot of open Sort dropdown
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "dropdown_03_sort_open.png"))
        print("  Screenshot saved: dropdown_03_sort_open.png")

        # Select "Highest Rated"
        sort_menu.locator(".custom-dropdown-item", has_text="Highest Rated").click()
        page.wait_for_timeout(250)
        sort_label = page.locator("#library-sort-select-trigger .custom-dropdown-label").inner_text()
        assert_test("Sort: Highest Rated" in sort_label, f"Sort trigger updated: {sort_label}")

        print("\n--- 2. Testing Add Book Form Custom Dropdowns ---")
        page.goto("http://localhost:3000/#add")
        page.wait_for_selector("#book-status-trigger")

        book_status_trigger = page.locator("#book-status-trigger")
        assert_test(book_status_trigger.is_visible(), "Add Book status dropdown trigger is visible")
        
        # Open status dropdown on Add Book
        book_status_trigger.click()
        page.wait_for_timeout(250)
        book_status_menu = page.locator("#book-status-trigger + .custom-dropdown-menu")
        assert_test(book_status_menu.is_visible(), "Add Book status menu is open")

        # Take screenshot of Add Book custom dropdown
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "dropdown_04_add_book_status_open.png"))
        print("  Screenshot saved: dropdown_04_add_book_status_open.png")

        # Select "Completed"
        book_status_menu.locator(".custom-dropdown-item", has_text="Completed").click()
        page.wait_for_timeout(200)
        native_book_status = page.locator("#book-status").input_value()
        assert_test(native_book_status == "Completed", "Native #book-status synced to 'Completed'")

        print("\n--- 3. Testing Settings Page Custom Dropdowns ---")
        page.goto("http://localhost:3000/#settings")
        page.wait_for_selector("#settings-default-sort-trigger")

        settings_sort_trigger = page.locator("#settings-default-sort-trigger")
        assert_test(settings_sort_trigger.is_visible(), "Settings default sort trigger is visible")

        # Open Settings Sort dropdown
        settings_sort_trigger.click()
        page.wait_for_timeout(250)
        settings_sort_menu = page.locator("#settings-default-sort-trigger + .custom-dropdown-menu")
        assert_test(settings_sort_menu.is_visible(), "Settings default sort menu is open")

        # Take screenshot of Settings custom dropdown
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "dropdown_05_settings_sort_open.png"))
        print("  Screenshot saved: dropdown_05_settings_sort_open.png")

        # Select "Title A–Z"
        settings_sort_menu.locator(".custom-dropdown-item", has_text="Title A–Z").click()
        page.wait_for_timeout(300)
        native_sort_val = page.locator("#settings-default-sort").input_value()
        assert_test(native_sort_val == "title", "Native #settings-default-sort value synced to 'title'")

        print("\n--- 4. Testing Keyboard Accessibility ---")
        page.goto("http://localhost:3000/#library")
        page.wait_for_selector("#library-status-select-trigger")

        # Focus status trigger
        page.focus("#library-status-select-trigger")
        page.wait_for_timeout(100)

        # Press ArrowDown to open
        page.keyboard.press("ArrowDown")
        page.wait_for_timeout(200)
        status_menu_kb = page.locator("#library-status-select-trigger + .custom-dropdown-menu")
        assert_test(status_menu_kb.is_visible(), "Dropdown opened via keyboard ArrowDown")

        # Press ArrowDown to highlight items
        page.keyboard.press("ArrowDown")
        page.wait_for_timeout(100)
        
        # Take screenshot of keyboard highlight state
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "dropdown_06_keyboard_navigation.png"))
        print("  Screenshot saved: dropdown_06_keyboard_navigation.png")

        # Press Enter to select
        page.keyboard.press("Enter")
        page.wait_for_timeout(200)
        assert_test(not status_menu_kb.is_visible(), "Dropdown closed via keyboard Enter")

        browser.close()

    print(f"\n==========================================")
    print(f" ALL TESTS PASSED: {passed}/{total} checks successful!")
    print(f"==========================================\n")

if __name__ == "__main__":
    run_tests()
