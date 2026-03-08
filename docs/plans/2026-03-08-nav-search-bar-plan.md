# Nav Search Bar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the decorative TopNav search placeholder with a functional Polymarket-style search bar that shows categories on focus and live search results on typing, and remove the search toggle from the Markets page.

**Architecture:** New `NavSearchDropdown` component in `frontend/src/components/search/` that combines a text input with a dropdown panel. The dropdown has two modes: browse (categories + status filters shown on focus) and search results (shown as user types). Uses the existing `searchMarkets` API with 300ms debounce. Click-outside-to-close pattern reused from `UserMenu`.

**Tech Stack:** React 18, React Router v5 (`Link`, `useHistory`), Tailwind CSS, existing `searchMarkets` API

---

### Task 1: Create NavSearchDropdown component

**Files:**
- Create: `frontend/src/components/search/NavSearchDropdown.jsx`

**Step 1: Create the component file**

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { searchMarkets } from '../../api/marketsApi';

const categories = ['General'];
const statusFilters = [
  { label: 'Active', value: 'active' },
  { label: 'Closed', value: 'closed' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'All', value: 'all' },
];

const NavSearchDropdown = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const history = useHistory();

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchMarkets(query.trim(), 'all', 8);
        setResults(data);
      } catch (error) {
        console.error('Search error:', error);
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleResultClick = (marketId) => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
    history.push(`/markets/${marketId}`);
  };

  const handleLinkClick = () => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
  };

  const hasQuery = query.trim().length > 0;
  const allResults = [
    ...(results?.primaryResults || []),
    ...(results?.fallbackResults || []),
  ];

  return (
    <div className="relative flex-1 max-w-lg" ref={containerRef}>
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pm-muted pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search markets..."
          className="w-full pl-9 pr-8 py-2 bg-pm-card border border-pm-card-border rounded-full text-sm text-white placeholder-pm-muted hover:border-gray-500 focus:border-gray-400 focus:outline-none transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-pm-muted hover:text-white text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-pm-card border border-pm-card-border rounded-lg shadow-lg overflow-hidden z-50">
          {hasQuery ? (
            /* Search results mode */
            <div>
              {loading && (
                <div className="px-4 py-3 text-sm text-pm-muted">Searching...</div>
              )}
              {!loading && allResults.length === 0 && results && (
                <div className="px-4 py-3 text-sm text-pm-muted">
                  No markets found for "{query}"
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
          ) : (
            /* Browse mode */
            <div>
              <div className="px-4 pt-3 pb-1">
                <p className="text-xs font-semibold text-pm-muted uppercase tracking-wide">Categories</p>
              </div>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  to="/"
                  onClick={handleLinkClick}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover transition-colors"
                >
                  {cat}
                </Link>
              ))}
              <div className="border-t border-pm-card-border my-1" />
              <div className="px-4 pt-2 pb-1">
                <p className="text-xs font-semibold text-pm-muted uppercase tracking-wide">Status</p>
              </div>
              {statusFilters.map((sf) => (
                <Link
                  key={sf.value}
                  to="/"
                  onClick={handleLinkClick}
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover transition-colors"
                >
                  {sf.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NavSearchDropdown;
```

**Step 2: Verify the file was created**

Run: `ls frontend/src/components/search/NavSearchDropdown.jsx`
Expected: File listed

**Step 3: Commit**

```bash
git add frontend/src/components/search/NavSearchDropdown.jsx
git commit -m "feat: add NavSearchDropdown component with live search and browse mode"
```

---

### Task 2: Integrate NavSearchDropdown into TopNav

**Files:**
- Modify: `frontend/src/components/topnav/TopNav.jsx:1-205`

**Step 1: Replace decorative search with NavSearchDropdown**

In `TopNav.jsx`, add the import at the top (after other imports):

```jsx
import NavSearchDropdown from '../search/NavSearchDropdown';
```

Replace lines 155-173 (the center search section and mobile search icon):

Old code (lines 154-173):
```jsx
          {/* Center: Search (hidden on mobile, shown md+) */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <Link
              to="/"
              className="w-full px-4 py-2 bg-pm-card border border-pm-card-border rounded-full text-sm text-pm-muted hover:border-gray-500 transition-colors text-left"
            >
              Search markets...
            </Link>
          </div>

          {/* Right: Auth */}
          <div className="flex items-center gap-2">
            {/* Mobile search icon */}
            <Link
              to="/"
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              🔍
            </Link>
```

New code:
```jsx
          {/* Center: Search */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <NavSearchDropdown />
          </div>

          {/* Right: Auth */}
          <div className="flex items-center gap-2">
```

Also remove the `Link` import if it's no longer used (check — it's still used by `UserMenu` and `GuestMenu` internally, but `TopNav` itself no longer uses `Link` directly). Actually, `Link` is used inside `UserMenu` and `GuestMenu` which are in the same file, so the import must stay.

**Step 2: Verify the app renders**

Run: Open `http://localhost:5174/` and confirm the search bar appears in the nav, focus shows the dropdown, and typing triggers search results.

**Step 3: Commit**

```bash
git add frontend/src/components/topnav/TopNav.jsx
git commit -m "feat: integrate NavSearchDropdown into TopNav, remove decorative search"
```

---

### Task 3: Clean up Markets page — remove search toggle

**Files:**
- Modify: `frontend/src/pages/markets/Markets.jsx:1-63`

**Step 1: Remove search-related code from Markets.jsx**

Replace the entire file contents with:

```jsx
import React, { useState } from 'react';
import CategoryTabs from '../../components/tabs/CategoryTabs';
import MarketsByStatusTable from '../../components/tables/MarketsByStatusTable';
import { TAB_TO_STATUS } from '../../utils/statusMap';

function Markets() {
  const [activeCategory, setActiveCategory] = useState('General');
  const [activeStatus, setActiveStatus] = useState('Active');

  return (
    <div>
      {/* "All markets" header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">All markets</h1>
      </div>

      <CategoryTabs
        activeCategory={activeCategory}
        activeStatus={activeStatus}
        onCategoryChange={setActiveCategory}
        onStatusChange={setActiveStatus}
      />

      <div className="mt-6">
        <MarketsByStatusTable status={TAB_TO_STATUS[activeStatus]} />
      </div>
    </div>
  );
}

export default Markets;
```

This removes:
- `GlobalSearchBar` and `SearchResultsTable` imports
- `searchResults`, `isSearching`, `showSearch` state
- Search toggle button (magnifying glass SVG)
- Toggled search bar rendering
- Conditional search results vs market table rendering

**Step 2: Verify the Markets page renders without the search toggle**

Run: Open `http://localhost:5174/` and confirm:
- "All markets" heading has no search icon next to it
- Category tabs and market grid render normally

**Step 3: Commit**

```bash
git add frontend/src/pages/markets/Markets.jsx
git commit -m "fix: remove search toggle from Markets page, search now lives in TopNav"
```

---

### Task 4: Delete unused search components

**Files:**
- Delete: `frontend/src/components/search/GlobalSearchBar.jsx`
- Delete: `frontend/src/components/search/MarketSearch.jsx`
- Delete: `frontend/src/components/tables/SearchResultsTable.jsx`

**Step 1: Verify no other files import these components**

Run: `grep -r "GlobalSearchBar\|MarketSearch\|SearchResultsTable" frontend/src/ --include="*.jsx" --include="*.js" -l`

Expected: No files listed (Markets.jsx was already cleaned up in Task 3)

**Step 2: Delete the files**

```bash
rm frontend/src/components/search/GlobalSearchBar.jsx
rm frontend/src/components/search/MarketSearch.jsx
rm frontend/src/components/tables/SearchResultsTable.jsx
```

**Step 3: Verify the app still builds and renders**

Run: Open `http://localhost:5174/` and confirm everything works.

**Step 4: Commit**

```bash
git add -u frontend/src/components/search/GlobalSearchBar.jsx frontend/src/components/search/MarketSearch.jsx frontend/src/components/tables/SearchResultsTable.jsx
git commit -m "chore: delete unused search components replaced by NavSearchDropdown"
```

---

### Task 5: Manual verification

**Step 1: Verify all behaviors**

Open `http://localhost:5174/` and test:

1. **Nav search bar visible** — rounded input with "Search markets..." placeholder and search icon
2. **Focus dropdown** — click the search bar, dropdown appears with "Categories" (General) and "Status" (Active, Closed, Resolved, All) sections
3. **Live search** — type a market name, results appear with thumbnail, title, and probability %
4. **Result click** — click a result, navigates to `/markets/:id`, dropdown closes, input clears
5. **Escape** — press Escape while dropdown is open, it closes
6. **Click outside** — click anywhere outside dropdown, it closes
7. **Clear button** — type text, click ✕, text clears
8. **Markets page** — no search toggle button next to "All markets" heading
9. **Category/status links** — click a category or status in the dropdown, navigates to home page

**Step 2: Commit any fixes if needed**
