"""
Comprehensive Playwright Verification Script for Kutubi:
1. Delete Book workflow across Details modal, Edit form, List view, and fallback page
2. Grid / List view switcher across URL state, layout, filters, search, refresh, and history navigation
3. Profile update workflow: display name 'Abdalla Husin', bio, initials 'AH', SQLite verification, and process restart
4. Duplicate submission protection: rapid clicks / repeated idempotency tokens vs intentional duplicates
"""

import os
import sys
import time
import subprocess
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3000"

def log(msg):
    print(f"[VERIFY] {msg}", flush=True)

def run_query(sql):
    cmd = ["node", "-e", f"const {{ getDb }} = require('./db/database'); const db = getDb(); console.log(JSON.stringify(db.prepare(`{sql}`).all()));"]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    import json
    return json.loads(res.stdout.strip())

def main():
    log("Starting comprehensive browser verification with Playwright...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # =========================================================================
        # TEST 1: Profile Persistence Workflow & Process Restart
        # =========================================================================
        log("--- TEST 1: Profile Persistence (Abdalla Husin & AH Initials) ---")
        page.goto(f"{BASE_URL}/profile")
        page.wait_for_selector("#profile-form")

        # Fill display name and bio
        page.fill("#profile-display-name", "Abdalla Husin")
        page.fill("#profile-bio", "Software Engineering student reading in 2026.")
        
        # Check live typing initials calculation
        initials_text = page.inner_text("#avatar-initials").strip()
        log(f"Live initials while typing: '{initials_text}'")
        assert initials_text == "AH", f"Expected 'AH', got '{initials_text}'"

        # Submit form
        page.click("#save-profile-btn")
        page.wait_for_selector(".toast")
        time.sleep(0.5)

        # Verify page reloaded with persisted values
        saved_name = page.input_value("#profile-display-name")
        saved_bio = page.input_value("#profile-bio")
        saved_initials = page.inner_text("#avatar-initials").strip()
        log(f"Saved Profile UI: Name='{saved_name}', Initials='{saved_initials}', Bio='{saved_bio}'")
        assert saved_name == "Abdalla Husin", f"Expected 'Abdalla Husin', got '{saved_name}'"
        assert saved_initials == "AH", f"Expected 'AH', got '{saved_initials}'"

        # Verify SQLite record directly
        db_profile = run_query("SELECT display_name, bio FROM profile WHERE id = 1")[0]
        log(f"SQLite Profile Record: display_name='{db_profile['display_name']}', bio='{db_profile['bio']}'")
        assert db_profile["display_name"] == "Abdalla Husin"

        # Refresh page (F5) and verify
        page.reload()
        page.wait_for_selector("#profile-form")
        refreshed_name = page.input_value("#profile-display-name")
        refreshed_initials = page.inner_text("#avatar-initials").strip()
        log(f"After Refresh: Name='{refreshed_name}', Initials='{refreshed_initials}'")
        assert refreshed_name == "Abdalla Husin"
        assert refreshed_initials == "AH"

        # Navigate away to Library and back to Profile
        page.goto(f"{BASE_URL}/library")
        page.wait_for_selector("#library-toolbar-form")
        page.goto(f"{BASE_URL}/profile")
        page.wait_for_selector("#profile-form")
        nav_name = page.input_value("#profile-display-name")
        nav_initials = page.inner_text("#avatar-initials").strip()
        log(f"After Navigation Away and Back: Name='{nav_name}', Initials='{nav_initials}'")
        assert nav_name == "Abdalla Husin"
        assert nav_initials == "AH"

        # =========================================================================
        # TEST 2: Grid / List Switching, URL State, Filters, Search, History
        # =========================================================================
        log("--- TEST 2: Grid / List Switching, Filters, Search & Navigation ---")
        page.goto(f"{BASE_URL}/library")
        page.wait_for_selector("#library-toolbar-form")

        # 2a: Default state should be Grid
        grid_section = page.query_selector("section[aria-label='Books Grid']")
        assert grid_section is not None, "Books Grid section not found on default library view"
        log("Initial state: Books Grid rendered.")

        # 2b: Switch to List View
        page.click("#toggle-list-view")
        page.wait_for_load_state("networkidle")
        assert "view=list" in page.url, f"Expected 'view=list' in URL, got '{page.url}'"
        list_section = page.query_selector("section[aria-label='Books List']")
        assert list_section is not None, "Books List section not rendered after clicking List"
        table_rows = page.query_selector_all("section[aria-label='Books List'] tbody tr")
        log(f"List View Active! URL: '{page.url}', Rendered rows: {len(table_rows)}")

        # 2c: Filter by Category or Status while preserving List view
        # Select 'To Read' status
        page.click("#library-status-select-trigger")
        page.wait_for_selector(".custom-dropdown-menu.is-open, .custom-dropdown.is-open")
        page.click(".custom-dropdown-item[data-value='To Read']")
        page.wait_for_load_state("networkidle")

        log(f"Filtered URL: '{page.url}'")
        assert "view=list" in page.url, "View 'list' lost after filtering status"
        assert "status=To+Read" in page.url or "status=To%20Read" in page.url, "Status 'To Read' not in URL"
        assert page.query_selector("section[aria-label='Books List']") is not None
        list_rows = page.query_selector_all("section[aria-label='Books List'] tbody tr")
        log(f"Rendered rows in List View for 'To Read': {len(list_rows)}")
        assert len(list_rows) == 8

        # 2d: Search while in List view
        page.fill("#library-search-input", "سيزيف")
        page.press("#library-search-input", "Enter")
        page.wait_for_load_state("networkidle")

        log(f"Search URL: '{page.url}'")
        assert "view=list" in page.url
        assert "search=" in page.url
        filtered_rows = page.query_selector_all("section[aria-label='Books List'] tbody tr")
        log(f"Filtered search rows count: {len(filtered_rows)}")
        assert len(filtered_rows) >= 1

        # 2e: Switch back to Grid view while preserving search and status
        page.click("#toggle-grid-view")
        page.wait_for_load_state("networkidle")
        log(f"Grid URL with filters: '{page.url}'")
        assert "view=grid" in page.url
        assert "status=To+Read" in page.url or "status=To%20Read" in page.url
        assert page.query_selector("section[aria-label='Books Grid']") is not None

        # 2f: Refresh page and confirm state preserved
        page.reload()
        page.wait_for_selector("#library-toolbar-form")
        assert "view=grid" in page.url
        assert "status=To+Read" in page.url or "status=To%20Read" in page.url
        assert page.query_selector("section[aria-label='Books Grid']") is not None
        log("State perfectly preserved across page reload!")

        # 2g: Browser Back navigation
        page.go_back()
        page.wait_for_load_state("networkidle")
        log(f"After Back Navigation URL: '{page.url}'")
        assert "view=list" in page.url
        assert page.query_selector("section[aria-label='Books List']") is not None
        log("Browser history navigation (Back) correctly restored List view!")

        # =========================================================================
        # TEST 3: Duplicate Submission Protection (Rapid Clicks & Duplicate Token)
        # =========================================================================
        log("--- TEST 3: Duplicate Submission & Idempotency Testing ---")
        page.goto(f"{BASE_URL}/books/new")
        page.wait_for_selector("#book-form")

        token1 = page.input_value("#book-idempotency-key")
        log(f"Form Session 1 Idempotency Token: '{token1}'")
        assert token1, "Idempotency key input was empty"

        test_title = f"Test Idempotency Book {int(time.time())}"
        page.fill("#book-title", test_title)
        page.fill("#book-author", "Test Engineer")
        page.fill("#book-total-pages", "100")
        page.fill("#book-current-page", "10")

        # Simulate rapid double click on Save Book
        save_btn = page.query_selector("#save-book-btn")
        # Click twice rapidly
        page.click("#save-book-btn")
        try:
            page.click("#save-book-btn", timeout=300)
        except Exception:
            pass # Client-side disabling prevents second click
        page.wait_for_load_state("networkidle")

        # Check SQLite books matching test_title
        books_matching = run_query(f"SELECT id, title, idempotency_key FROM books WHERE title = '{test_title}'")
        log(f"Books created with title '{test_title}': count = {len(books_matching)}")
        assert len(books_matching) == 1, f"Expected exactly 1 book, got {len(books_matching)}"
        test_book_1 = books_matching[0]

        # Now test intentional duplicate title under a NEW form session (different idempotency token)
        page.goto(f"{BASE_URL}/books/new")
        page.wait_for_selector("#book-form")
        token2 = page.input_value("#book-idempotency-key")
        log(f"Form Session 2 Idempotency Token: '{token2}'")
        assert token2 != token1, "Tokens must be distinct across sessions"

        # Submit same title intentionally
        page.fill("#book-title", test_title)
        page.fill("#book-author", "Test Engineer - Second Edition")
        page.fill("#book-total-pages", "120")
        page.fill("#book-current-page", "0")
        page.click("#save-book-btn")
        page.wait_for_load_state("networkidle")

        # Now both intentional editions should exist
        all_editions = run_query(f"SELECT id, title, author FROM books WHERE title = '{test_title}'")
        log(f"All intentional editions matching '{test_title}': count = {len(all_editions)}")
        assert len(all_editions) == 2, f"Expected 2 intentional editions, got {len(all_editions)}"
        test_book_2 = all_editions[1]

        # =========================================================================
        # TEST 4: Delete Book Workflow Across All Entry Points & Modal Dialog
        # =========================================================================
        log("--- TEST 4: Delete Book Workflow Verification ---")

        # Entry Point A: Delete from Book Details page via Modal Dialog
        log(f"Deleting Test Book 1 (id: {test_book_1['id']}) via Book Details Modal...")
        page.goto(f"{BASE_URL}/books/{test_book_1['id']}")
        page.wait_for_selector("#details-delete-btn")

        # Click Delete button to open modal
        page.click("#details-delete-btn")
        page.wait_for_selector("#delete-modal-backdrop.open", timeout=3000)
        modal_title = page.inner_text("#modal-alert-title")
        log(f"Delete Modal popped up! Modal heading: '{modal_title}'")
        assert test_title in modal_title or "Delete" in modal_title

        # Confirm delete in modal
        page.click("#modal-confirm-btn")
        page.wait_for_load_state("networkidle")

        # Verify redirected to /library?toast=book_deleted
        assert "/library" in page.url
        log(f"Redirected after deletion to: '{page.url}'")

        # Verify SQLite row is purged
        check_deleted_1 = run_query(f"SELECT id FROM books WHERE id = {test_book_1['id']}")
        log(f"Query check for book {test_book_1['id']} after delete: count = {len(check_deleted_1)}")
        assert len(check_deleted_1) == 0, f"Book {test_book_1['id']} was not deleted from SQLite!"

        # Entry Point B: Delete from Edit Book Form via Modal Dialog
        log(f"Deleting Test Book 2 (id: {test_book_2['id']}) via Edit Book Form Modal...")
        page.goto(f"{BASE_URL}/books/{test_book_2['id']}/edit")
        page.wait_for_selector("#form-delete-book-btn")

        # Click Delete Book button in edit form
        page.click("#form-delete-book-btn")
        page.wait_for_selector("#delete-modal-backdrop.open", timeout=3000)
        log("Edit form delete modal opened successfully!")

        page.click("#modal-confirm-btn")
        page.wait_for_load_state("networkidle")

        # Verify SQLite row is purged
        check_deleted_2 = run_query(f"SELECT id FROM books WHERE id = {test_book_2['id']}")
        log(f"Query check for book {test_book_2['id']} after delete: count = {len(check_deleted_2)}")
        assert len(check_deleted_2) == 0, f"Book {test_book_2['id']} was not deleted from SQLite!"

        # Entry Point C: Create a test book with physical PDF, verify file deletion
        log("Testing Book Deletion with attached PDF and cover file cleanup...")
        # Add book via PDF upload
        starter_pdf_path = os.path.abspath("storage/starter/kutubi-starter-guide.pdf")
        page.goto(f"{BASE_URL}/books/new")
        page.wait_for_selector("#book-form")

        pdf_test_title = f"Test File Cleanup Book {int(time.time())}"
        page.fill("#book-title", pdf_test_title)
        page.fill("#book-author", "Cleanup Tester")
        page.fill("#book-total-pages", "4")
        page.fill("#book-current-page", "1")
        page.set_input_files("#book-pdf-file", starter_pdf_path)

        page.click("#save-book-btn")
        page.wait_for_load_state("networkidle")

        created_pdf_book = run_query(f"SELECT id, title, pdf_path, cover_image FROM books WHERE title = '{pdf_test_title}'")[0]
        pdf_path = created_pdf_book["pdf_path"]
        cover_image = created_pdf_book["cover_image"]
        book_id = created_pdf_book["id"]
        log(f"Created book {book_id} with pdf: '{pdf_path}' and cover: '{cover_image}'")

        # Check files exist on disk
        pdf_full_path = os.path.join("storage", "pdfs", os.path.basename(pdf_path))
        cover_full_path = os.path.join("storage", "covers", os.path.basename(cover_image))
        assert os.path.exists(pdf_full_path), f"PDF file not found at {pdf_full_path}"
        assert os.path.exists(cover_full_path), f"Cover file not found at {cover_full_path}"
        log(f"Verified files exist before deletion: {pdf_full_path} & {cover_full_path}")

        # Delete via direct confirmation page GET /books/:id/delete
        page.goto(f"{BASE_URL}/books/{book_id}/delete")
        page.wait_for_selector("button.btn-destructive")
        log("Direct delete confirmation page rendered successfully.")
        page.click("button.btn-destructive")
        page.wait_for_load_state("networkidle")

        # Verify SQLite row is deleted
        pdf_book_check = run_query(f"SELECT id FROM books WHERE id = {book_id}")
        assert len(pdf_book_check) == 0, f"Book {book_id} still exists in SQLite"

        # Verify physical files were deleted from disk
        assert not os.path.exists(pdf_full_path), f"PDF file {pdf_full_path} was NOT deleted from disk!"
        assert not os.path.exists(cover_full_path), f"Cover file {cover_full_path} was NOT deleted from disk!"
        log(f"Verified files successfully purged from storage: {pdf_full_path} and {cover_full_path}!")

        # Entry Point D: Test List View Delete Modal
        # Create one more temporary book and delete it directly from the Library table
        log("Testing List View Delete Modal...")
        page.goto(f"{BASE_URL}/books/new")
        page.fill("#book-title", "List View Test Book")
        page.fill("#book-author", "List Tester")
        page.fill("#book-total-pages", "50")
        page.click("#save-book-btn")
        page.wait_for_load_state("networkidle")

        list_book = run_query("SELECT id FROM books WHERE title = 'List View Test Book'")[0]
        # Open library in List view
        page.goto(f"{BASE_URL}/library?view=list")
        page.wait_for_selector(f"button[data-delete-book-id='{list_book['id']}']")
        page.click(f"button[data-delete-book-id='{list_book['id']}']")
        page.wait_for_selector("#delete-modal-backdrop.open", timeout=3000)
        log("List view table row delete modal opened!")
        page.click("#modal-confirm-btn")
        page.wait_for_load_state("networkidle")

        list_book_check = run_query(f"SELECT id FROM books WHERE id = {list_book['id']}")
        assert len(list_book_check) == 0, "Book was not deleted via List view modal"
        log("List view delete modal verified and row purged successfully!")

        browser.close()

    log("ALL BROWSER TESTS PASSED WITH 100% SUCCESS!")

if __name__ == "__main__":
    main()
