/**
 * Kutubi - Custom Minimalist Dropdown Component
 * Replaces native <select> elements with Raycast/Linear-inspired dark grayscale popovers
 */

// Active open dropdown tracker
let activeDropdown = null;

/**
 * Initialize custom dropdowns on all uninitialized <select> elements
 * @param {HTMLElement|Document} root 
 */
export function initCustomDropdowns(root = document) {
  const selects = root.querySelectorAll('select:not([data-custom-dropdown-init])');
  selects.forEach(select => {
    enhanceSelect(select);
  });
}

/**
 * Close any currently open custom dropdown
 */
export function closeAllDropdowns() {
  if (activeDropdown) {
    activeDropdown.classList.remove('is-open');
    const trigger = activeDropdown.querySelector('.custom-dropdown-trigger');
    if (trigger) {
      trigger.setAttribute('aria-expanded', 'false');
    }
    const menu = activeDropdown.querySelector('.custom-dropdown-menu');
    if (menu) {
      menu.classList.remove('align-right', 'align-top');
    }
    // Remove highlighted states
    activeDropdown.querySelectorAll('.custom-dropdown-item.is-highlighted').forEach(el => {
      el.classList.remove('is-highlighted');
    });
    activeDropdown = null;
  }
}

/**
 * Enhance a single native <select> element
 * @param {HTMLSelectElement} select 
 */
function enhanceSelect(select) {
  select.setAttribute('data-custom-dropdown-init', 'true');
  select.classList.add('custom-dropdown-native');

  // Create wrapper container
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-dropdown';

  // Inherit layout utility classes from select
  if (select.classList.contains('w-auto')) wrapper.classList.add('w-auto');
  if (select.classList.contains('shrink-0')) wrapper.classList.add('shrink-0');
  if (select.classList.contains('self-start')) wrapper.classList.add('self-start');
  if (select.classList.contains('sm:self-auto')) wrapper.classList.add('sm:self-auto');
  if (select.classList.contains('flex-1')) wrapper.classList.add('flex-1');

  // Insert wrapper before select and move select inside
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);

  // Prefix handling for toolbar dropdowns (e.g. "Status: ", "Category: ", "Sort: ")
  const prefix = select.getAttribute('data-prefix') || '';

  // Trigger button
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-dropdown-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  if (select.id) {
    trigger.id = `${select.id}-trigger`;
  }

  const selectedOption = select.options[select.selectedIndex] || select.options[0];
  const initialRawText = selectedOption ? selectedOption.textContent.trim() : '';
  const initialDisplayText = formatDisplayText(initialRawText, prefix);

  trigger.innerHTML = `
    <span class="custom-dropdown-label truncate">${initialDisplayText}</span>
    <span class="material-symbols-outlined custom-dropdown-chevron text-[16px] text-text-muted" aria-hidden="true">expand_more</span>
  `;

  // Menu Popover
  const menu = document.createElement('div');
  menu.className = 'custom-dropdown-menu';
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('tabindex', '-1');

  // Populate options
  buildMenuItems(select, menu, trigger, prefix);

  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);

  // Keyboard navigation index
  let highlightedIndex = -1;

  function setHighlighted(index) {
    const items = menu.querySelectorAll('.custom-dropdown-item');
    items.forEach((item, idx) => {
      if (idx === index) {
        item.classList.add('is-highlighted');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('is-highlighted');
      }
    });
    highlightedIndex = index;
  }

  function openDropdown() {
    if (activeDropdown && activeDropdown !== wrapper) {
      closeAllDropdowns();
    }
    wrapper.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    activeDropdown = wrapper;

    // Viewport bounds checking
    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 180);
    
    // Horizontal alignment
    if (rect.left + menuWidth > window.innerWidth - 16) {
      menu.classList.add('align-right');
    } else {
      menu.classList.remove('align-right');
    }

    // Vertical alignment (flip to top if bottom space is tight)
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < 220 && spaceAbove > spaceBelow) {
      menu.classList.add('align-top');
    } else {
      menu.classList.remove('align-top');
    }

    // Highlight currently selected item
    const items = menu.querySelectorAll('.custom-dropdown-item');
    const selectedItem = menu.querySelector('.custom-dropdown-item.is-selected');
    if (selectedItem) {
      const idx = Array.from(items).indexOf(selectedItem);
      setHighlighted(idx);
    } else if (items.length > 0) {
      setHighlighted(0);
    }
  }

  function closeDropdown() {
    if (activeDropdown === wrapper) {
      closeAllDropdowns();
    }
  }

  // Trigger click
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (wrapper.classList.contains('is-open')) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  // Trigger keyboard navigation
  trigger.addEventListener('keydown', (e) => {
    const isOpen = wrapper.classList.contains('is-open');

    if (e.key === 'ArrowDown' || e.key === 'Down') {
      e.preventDefault();
      if (!isOpen) {
        openDropdown();
      } else {
        const items = menu.querySelectorAll('.custom-dropdown-item');
        const next = highlightedIndex < items.length - 1 ? highlightedIndex + 1 : 0;
        setHighlighted(next);
      }
    } else if (e.key === 'ArrowUp' || e.key === 'Up') {
      e.preventDefault();
      if (!isOpen) {
        openDropdown();
      } else {
        const items = menu.querySelectorAll('.custom-dropdown-item');
        const prev = highlightedIndex > 0 ? highlightedIndex - 1 : items.length - 1;
        setHighlighted(prev);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isOpen) {
        openDropdown();
      } else {
        const items = menu.querySelectorAll('.custom-dropdown-item');
        if (highlightedIndex >= 0 && items[highlightedIndex]) {
          selectItem(items[highlightedIndex], select, menu, trigger, prefix);
        }
      }
    } else if (e.key === 'Escape') {
      if (isOpen) {
        e.preventDefault();
        closeDropdown();
      }
    } else if (e.key === 'Tab') {
      if (isOpen) {
        closeDropdown();
      }
    }
  });

  // Menu keyboard navigation
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
      trigger.focus();
    }
  });

  // Sync when native select changes externally (e.g. form reset, code update)
  select.addEventListener('change', () => {
    const curOpt = select.options[select.selectedIndex];
    if (curOpt) {
      const labelEl = trigger.querySelector('.custom-dropdown-label');
      if (labelEl) {
        labelEl.textContent = formatDisplayText(curOpt.textContent.trim(), prefix);
      }
      menu.querySelectorAll('.custom-dropdown-item').forEach(item => {
        const isMatch = item.dataset.value === curOpt.value;
        item.classList.toggle('is-selected', isMatch);
        item.setAttribute('aria-selected', isMatch ? 'true' : 'false');
        const check = item.querySelector('.custom-dropdown-check');
        if (check) check.classList.toggle('hidden', !isMatch);
      });
    }
  });

  // Sync is-invalid state
  if (select.classList.contains('is-invalid')) {
    wrapper.classList.add('is-invalid');
  }
  const observer = new MutationObserver(() => {
    if (select.classList.contains('is-invalid')) {
      wrapper.classList.add('is-invalid');
    } else {
      wrapper.classList.remove('is-invalid');
    }
  });
  observer.observe(select, { attributes: true, attributeFilter: ['class'] });
}

/**
 * Format trigger display text with optional prefix
 */
function formatDisplayText(text, prefix) {
  if (!prefix) return text;
  // If the text already starts with the prefix (e.g. "Status: All"), don't duplicate
  if (text.toLowerCase().startsWith(prefix.toLowerCase())) return text;
  return `${prefix}${text}`;
}

/**
 * Build item elements inside the menu popover
 */
function buildMenuItems(select, menu, trigger, prefix) {
  menu.innerHTML = '';

  Array.from(select.options).forEach((option) => {
    const isSelected = option.selected;
    const item = document.createElement('div');
    item.className = `custom-dropdown-item ${isSelected ? 'is-selected' : ''}`;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    item.setAttribute('data-value', option.value);

    // Option display text inside the menu popover
    const optionText = option.textContent.trim();

    item.innerHTML = `
      <span class="custom-dropdown-item-text truncate">${optionText}</span>
      <span class="material-symbols-outlined custom-dropdown-check text-[14px] text-text-primary ${isSelected ? '' : 'hidden'}" aria-hidden="true">check</span>
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      selectItem(item, select, menu, trigger, prefix);
    });

    item.addEventListener('mouseenter', () => {
      menu.querySelectorAll('.custom-dropdown-item').forEach(el => el.classList.remove('is-highlighted'));
      item.classList.add('is-highlighted');
    });

    menu.appendChild(item);
  });
}

/**
 * Select an option item, sync native select, dispatch event and close menu
 */
function selectItem(item, select, menu, trigger, prefix) {
  const value = item.dataset.value;
  const rawLabel = item.querySelector('.custom-dropdown-item-text')?.textContent.trim() || '';

  // Update native select value
  select.value = value;

  // Update trigger label
  const labelEl = trigger.querySelector('.custom-dropdown-label');
  if (labelEl) {
    labelEl.textContent = formatDisplayText(rawLabel, prefix);
  }

  // Update selected states
  menu.querySelectorAll('.custom-dropdown-item').forEach(el => {
    const isMatch = el === item;
    el.classList.toggle('is-selected', isMatch);
    el.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    const check = el.querySelector('.custom-dropdown-check');
    if (check) {
      check.classList.toggle('hidden', !isMatch);
    }
  });

  // Close dropdown and refocus trigger
  closeAllDropdowns();
  trigger.focus();

  // Dispatch native change event so all forms and JS listeners react
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

// Global outside click handler
document.addEventListener('click', (e) => {
  if (activeDropdown && !activeDropdown.contains(e.target)) {
    closeAllDropdowns();
  }
});

// Global Escape handler
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && activeDropdown) {
    const trigger = activeDropdown.querySelector('.custom-dropdown-trigger');
    closeAllDropdowns();
    if (trigger) trigger.focus();
  }
});
