# Search Bar Category Dropdown Design

## Goal

Show categories in the search bar dropdown on focus (empty query), matching Polymarket's search bar UX. On typing, switch to live search results.

## Behavior

- **On focus (empty query):** Dropdown opens showing category links as a list. Each navigates to `/?category=X` (same URL scheme FilterBar uses).
- **On typing:** Dropdown switches to live search results (current behavior, unchanged).
- **On blur / Escape / click-outside:** Dropdown closes (unchanged).
- **On category click:** Navigate to filtered view, close dropdown, clear input.

## Shared Categories Constant

New file: `frontend/src/constants/categories.js`

Exports `CATEGORIES` and `STATUS_FILTERS` arrays. Both `FilterBar.jsx` and `NavSearchDropdown.jsx` import from here instead of hardcoding.

## NavSearchDropdown Changes

Dropdown condition changes from `isOpen && hasQuery` to `isOpen`. Two modes:

1. **Browse mode** (`isOpen && !hasQuery`): "Categories" label + category links styled as list items with hover highlight. Each is a React Router `Link` to `/?category=X`.
2. **Search mode** (`isOpen && hasQuery`): Current live search results, no changes.

## Visual Style

Matches existing dropdown styling (bg-pm-card, border-pm-card-border, rounded-lg, shadow-lg). Category items use same hover style as search results (hover:bg-pm-hover). Section header in text-pm-muted text-xs uppercase.

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/constants/categories.js` | New shared constants |
| `frontend/src/components/search/NavSearchDropdown.jsx` | Add browse mode on empty focus |
| `frontend/src/components/topnav/FilterBar.jsx` | Import from shared constants |

## Backend

No backend changes required.
