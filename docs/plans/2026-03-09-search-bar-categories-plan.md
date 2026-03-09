# Search Bar Category Dropdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show categories in the search bar dropdown on focus (empty query), matching Polymarket's search bar UX.

**Architecture:** Extract hardcoded category/status arrays from FilterBar into a shared constants file. Add a "browse mode" to NavSearchDropdown that renders category links when focused with no query. Search mode (typing) is unchanged.

**Tech Stack:** React 18, React Router v5, Tailwind CSS

---

### Task 1: Create shared categories constants file

**Files:**
- Create: `frontend/src/constants/categories.js`

**Step 1: Create the constants file**

```js
export const CATEGORIES = ['General'];
export const STATUS_FILTERS = ['Active', 'Closed', 'Resolved', 'All'];
```

**Step 2: Verify no build errors**

Run: `cd frontend && npx vite build --mode development 2>&1 | tail -5`
Expected: Build succeeds (unused export is fine)

**Step 3: Commit**

```bash
git add frontend/src/constants/categories.js
git commit -m "feat: add shared categories and status filter constants"
```

---

### Task 2: Update FilterBar to use shared constants

**Files:**
- Modify: `frontend/src/components/topnav/FilterBar.jsx:1-5`

**Step 1: Replace hardcoded arrays with imports**

Change lines 1-5 from:
```jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const categories = ['General'];
const statusFilters = ['Active', 'Closed', 'Resolved', 'All'];
```

To:
```jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CATEGORIES, STATUS_FILTERS } from '../../constants/categories';
```

**Step 2: Update references in JSX**

- Line 29: `categories.map` → `CATEGORIES.map`
- Line 45: `statusFilters.map` → `STATUS_FILTERS.map`

**Step 3: Verify no build errors**

Run: `cd frontend && npx vite build --mode development 2>&1 | tail -5`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add frontend/src/components/topnav/FilterBar.jsx
git commit -m "refactor: use shared constants in FilterBar"
```

---

### Task 3: Add browse mode to NavSearchDropdown

**Files:**
- Modify: `frontend/src/components/search/NavSearchDropdown.jsx`

**Step 1: Add imports**

Add after the existing `useHistory` import (line 2):
```jsx
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../../constants/categories';
```

**Step 2: Add category click handler**

Add after the `handleResultClick` function (after line 82):
```jsx
const handleCategoryClick = () => {
  setIsOpen(false);
  setQuery('');
};
```

**Step 3: Change dropdown condition from `isOpen && hasQuery` to `isOpen`**

Change line 128 from:
```jsx
{isOpen && hasQuery && (
```
To:
```jsx
{isOpen && (
```

**Step 4: Add browse mode inside the dropdown**

Insert before the existing `<div>` that contains search results (after line 129, inside the dropdown wrapper). The final dropdown structure should be:

```jsx
{isOpen && (
  <div className="absolute top-full left-0 right-0 mt-2 bg-pm-card border border-pm-card-border rounded-lg shadow-lg overflow-hidden z-50">
    {/* Browse mode: categories */}
    {!hasQuery && (
      <div className="p-2">
        <div className="px-2 py-1.5 text-xs font-medium text-pm-muted uppercase tracking-wider">
          Categories
        </div>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            to={cat === 'General' ? '/' : `/?category=${cat}`}
            onClick={handleCategoryClick}
            className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-pm-hover transition-colors"
          >
            <span className="text-sm text-white">{cat}</span>
          </Link>
        ))}
      </div>
    )}

    {/* Search mode: live results */}
    {hasQuery && (
      <div>
        {loading && (
          <div className="px-4 py-3 text-sm text-pm-muted">Searching...</div>
        )}
        {!loading && allResults.length === 0 && results && (
          <div className="px-4 py-3 text-sm text-pm-muted">
            No markets found for &ldquo;{query}&rdquo;
          </div>
        )}
        {allResults.map((item) => (
          <button
            key={item.market.id}
            onClick={() => handleResultClick(item.market.id)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pm-hover transition-colors text-left"
          >
            {item.market.imageUrl ? (
              <img
                src={item.market.imageUrl}
                alt=""
                className="w-8 h-8 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-pm-hover shrink-0 flex items-center justify-center text-pm-muted text-sm">
                ?
              </div>
            )}
            <span className="text-sm text-white truncate flex-1">
              {item.market.questionTitle}
            </span>
            <span className="text-sm font-semibold text-white shrink-0">
              {(item.lastProbability * 100).toFixed(0)}%
            </span>
          </button>
        ))}
      </div>
    )}
  </div>
)}
```

**Step 5: Verify no build errors**

Run: `cd frontend && npx vite build --mode development 2>&1 | tail -5`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add frontend/src/components/search/NavSearchDropdown.jsx
git commit -m "feat: show categories in search dropdown on focus"
```

---

### Task 4: Manual smoke test

**Step 1: Start dev server**

Run: `cd frontend && npm run start`

**Step 2: Verify browse mode**

1. Click the search bar — dropdown should appear with "Categories" header and "General" link
2. Click "General" — should navigate to `/` and close dropdown

**Step 3: Verify search mode**

1. Click search bar, type a query — dropdown should switch to live search results
2. Clear the query — dropdown should switch back to categories
3. Press Escape — dropdown should close

**Step 4: Verify FilterBar still works**

1. Check FilterBar row below TopNav still shows category and status tabs
2. Click tabs — should navigate correctly

**Step 5: Commit plan doc**

```bash
git add docs/plans/2026-03-09-search-bar-categories-plan.md
git commit -m "doc: add search bar categories implementation plan"
```
