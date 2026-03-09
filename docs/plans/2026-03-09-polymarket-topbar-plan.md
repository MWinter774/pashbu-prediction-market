# Polymarket-style Top Bar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the top navigation bar into a two-row Polymarket-style layout with logo+icon, wider search with `/` shortcut, restructured auth section, and a filter bar that replaces the Markets page filter tabs.

**Architecture:** TopNav gets two rows — Row 1 (main bar) and Row 2 (filter bar). Filter state moves from Markets page local state to URL search params. TopNav renders filter tabs as links that update URL params; Markets page reads from URL params via `useLocation`. The filter bar is visible on every page; clicking a filter from a non-home page navigates to `/?status=X`.

**Tech Stack:** React 18, React Router v5, Tailwind CSS (existing pm-* color palette)

---

### Task 1: Add `/` keyboard shortcut to search bar

**Files:**
- Modify: `frontend/src/components/search/NavSearchDropdown.jsx`

**Step 1: Add global keydown listener for `/`**

In `NavSearchDropdown.jsx`, add a `useEffect` that listens for `/` keypress on `document` and focuses the search input. Only trigger when no other input/textarea is focused.

```jsx
// Add inside NavSearchDropdown component, after the existing useEffect hooks
useEffect(() => {
  const handleSlash = (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };
  document.addEventListener('keydown', handleSlash);
  return () => document.removeEventListener('keydown', handleSlash);
}, []);
```

**Step 2: Add `/` hint badge to the search input**

Replace the clear button section to also show a `/` hint when the input is empty and not focused. Add a state `isFocused` to track focus.

Add state:
```jsx
const [isFocused, setIsFocused] = useState(false);
```

Update `handleFocus`:
```jsx
const handleFocus = () => {
  setIsOpen(true);
  setIsFocused(true);
};
```

Add blur handler:
```jsx
const handleBlur = () => {
  setIsFocused(false);
};
```

Add `onBlur={handleBlur}` to the input element.

Replace the clear button / hint area (the section after the `<input>`):
```jsx
{query ? (
  <button
    onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-pm-muted hover:text-white text-xs"
  >
    ✕
  </button>
) : !isFocused ? (
  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-pm-muted bg-pm-page border border-pm-card-border rounded">
    /
  </kbd>
) : null}
```

**Step 3: Verify manually**

Run: `cd frontend && npm run start`
Expected: Search bar shows `/` badge when empty/unfocused. Pressing `/` focuses search. Escape blurs. Clear button still works when typing.

**Step 4: Commit**

```bash
git add frontend/src/components/search/NavSearchDropdown.jsx
git commit -m "feat: add / keyboard shortcut and hint badge to search bar"
```

---

### Task 2: Add placeholder logo icon

**Files:**
- Modify: `frontend/src/components/topnav/TopNav.jsx`

**Step 1: Add SVG icon next to logo text**

In `TopNav.jsx`, update the logo `<Link>` inside the `TopNav` component:

```jsx
{/* Left: Logo */}
<Link to="/" className="flex items-center gap-2 text-white font-bold text-lg shrink-0">
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pm-blue">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
  <span className="hidden sm:inline">SocialPredict</span>
</Link>
```

This uses a trending-up chart icon. On mobile (`sm:hidden`), only the icon shows. On `sm:` and above, both icon and text show.

**Step 2: Verify manually**

Check that logo shows icon + text on desktop, icon-only on mobile.

**Step 3: Commit**

```bash
git add frontend/src/components/topnav/TopNav.jsx
git commit -m "feat: add placeholder logo icon with mobile-responsive display"
```

---

### Task 3: Restructure guest right side (About + Log In + Sign Up + hamburger)

**Files:**
- Modify: `frontend/src/components/topnav/TopNav.jsx`

**Step 1: Update GuestMenu to only contain Stats**

The `GuestMenu` hamburger dropdown currently has Stats and About. Remove About from it (About moves to a visible link). Update the dropdown content:

```jsx
const GuestMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-2 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-pm-hover transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-pm-card border border-pm-card-border rounded-lg shadow-lg py-1 z-50">
          <Link
            to="/stats"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            Stats
          </Link>
        </div>
      )}
    </div>
  );
};
```

**Step 2: Update the guest section in TopNav render**

Replace the guest `<div>` inside the auth section:

```jsx
{!isLoggedIn ? (
  <div className="flex items-center gap-2">
    <Link
      to="/about"
      className="hidden md:block text-sm text-gray-300 hover:text-white transition-colors"
    >
      About
    </Link>
    <LoginModalButton />
    <button
      className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
      onClick={() => {}}
    >
      Sign Up
    </button>
    <GuestMenu />
  </div>
) : /* ... rest unchanged */}
```

The "About" link is hidden on mobile (`hidden md:block`) — it stays in GuestMenu for mobile. Wait — actually per design, About should move into hamburger on mobile. Let me add it back to GuestMenu for mobile users:

Update `GuestMenu` dropdown to include About for mobile:
```jsx
{isOpen && (
  <div className="absolute right-0 mt-2 w-48 bg-pm-card border border-pm-card-border rounded-lg shadow-lg py-1 z-50">
    <Link
      to="/about"
      className="block md:hidden px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
      onClick={() => setIsOpen(false)}
    >
      About
    </Link>
    <Link
      to="/stats"
      className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
      onClick={() => setIsOpen(false)}
    >
      Stats
    </Link>
  </div>
)}
```

**Step 3: Verify manually**

Check desktop: About visible as text link, Log In button, red Sign Up button, hamburger with Stats.
Check mobile: About hidden, appears in hamburger dropdown.

**Step 4: Commit**

```bash
git add frontend/src/components/topnav/TopNav.jsx
git commit -m "feat: restructure guest nav with About link and Sign Up button"
```

---

### Task 4: Restructure logged-in right side (About + credit + profile dropdown, no hamburger)

**Files:**
- Modify: `frontend/src/components/topnav/TopNav.jsx`

**Step 1: Update UserMenu to show credit balance inline and use a profile icon**

Replace the `UserMenu` component:

```jsx
const UserMenu = ({ username, permissions, userCredit, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-pm-hover transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-pm-card border border-pm-card-border rounded-lg shadow-lg py-1 z-50">
          <div className="px-4 py-2 text-sm text-white border-b border-pm-card-border font-medium">
            @{username}
          </div>
          <Link
            to="/profile"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            Profile
          </Link>
          {permissions.includes('create_users') && (
            <Link
              to="/admin"
              className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
          )}
          <Link
            to="/notifications"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            Alerts
          </Link>
          {permissions.includes('create_markets') && (
            <Link
              to="/create"
              className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
              onClick={() => setIsOpen(false)}
            >
              Create Market
            </Link>
          )}
          <div className="border-t border-pm-card-border my-1" />
          <Link
            to="/stats"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            Stats
          </Link>
          <Link
            to="/about"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
          <button
            onClick={() => { onLogout(); setIsOpen(false); }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};
```

**Step 2: Update the logged-in section in TopNav render**

Replace the logged-in branch:

```jsx
) : (
  <div className="flex items-center gap-2">
    <Link
      to="/about"
      className="hidden md:block text-sm text-gray-300 hover:text-white transition-colors"
    >
      About
    </Link>
    <span className="text-sm text-pm-muted">
      🪙 {userCredit ?? '...'}
    </span>
    <UserMenu
      username={username}
      permissions={permissions || []}
      userCredit={userCredit}
      onLogout={logout}
    />
  </div>
)}
```

Note: No `GuestMenu` / hamburger for logged-in users. About and Stats are in the profile dropdown.

**Step 3: Verify manually**

Log in and check: About visible on desktop, credit balance shows, profile icon opens dropdown with all menu items. No hamburger.

**Step 4: Commit**

```bash
git add frontend/src/components/topnav/TopNav.jsx
git commit -m "feat: restructure logged-in nav with credit balance and profile icon"
```

---

### Task 5: Add filter bar (Row 2) to TopNav

**Files:**
- Create: `frontend/src/components/topnav/FilterBar.jsx`
- Modify: `frontend/src/components/topnav/TopNav.jsx`

**Step 1: Create FilterBar component**

Create `frontend/src/components/topnav/FilterBar.jsx`:

```jsx
import React from 'react';
import { Link, useLocation, useHistory } from 'react-router-dom';

const categories = ['General'];
const statusFilters = ['Active', 'Closed', 'Resolved', 'All'];

const FilterBar = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  // Default to 'Active' if no status param
  const activeStatus = params.get('status') || 'Active';
  const activeCategory = params.get('category') || 'General';

  const buildLink = (overrides) => {
    const newParams = new URLSearchParams();
    const cat = overrides.category || activeCategory;
    const stat = overrides.status || activeStatus;
    if (cat !== 'General') newParams.set('category', cat);
    if (stat !== 'Active') newParams.set('status', stat);
    const qs = newParams.toString();
    return qs ? `/?${qs}` : '/';
  };

  return (
    <div className="border-b border-pm-card-border bg-pm-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <Link
              key={cat}
              to={buildLink({ category: cat })}
              className={`px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2 ${
                activeCategory === cat
                  ? 'text-white border-white font-semibold'
                  : 'text-pm-muted border-transparent hover:text-gray-300'
              }`}
            >
              {cat}
            </Link>
          ))}

          <div className="w-px h-5 bg-pm-card-border mx-2 shrink-0" />

          {statusFilters.map((status) => (
            <Link
              key={status}
              to={buildLink({ status })}
              className={`px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2 ${
                activeStatus === status
                  ? 'text-white border-white font-semibold'
                  : 'text-pm-muted border-transparent hover:text-gray-300'
              }`}
            >
              {status}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
```

**Step 2: Add FilterBar to TopNav**

In `TopNav.jsx`, import and render FilterBar after the main bar, inside the `<nav>`:

Add import at top:
```jsx
import FilterBar from './FilterBar';
```

Add after the closing `</div>` of the main bar content (after the `flex items-center justify-between h-14` div), but still inside `<nav>`:

```jsx
      </div>
    </div>
    <FilterBar />
  </nav>
```

**Step 3: Verify manually**

Check: Two-row nav bar. Filter tabs show on every page. Clicking a filter navigates to `/?status=X`. Active tab is highlighted.

**Step 4: Commit**

```bash
git add frontend/src/components/topnav/FilterBar.jsx frontend/src/components/topnav/TopNav.jsx
git commit -m "feat: add filter bar (Row 2) to TopNav with URL param navigation"
```

---

### Task 6: Wire Markets page to read filters from URL params

**Files:**
- Modify: `frontend/src/pages/markets/Markets.jsx`

**Step 1: Replace local state with URL param reading**

Replace `Markets.jsx` entirely:

```jsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import MarketsByStatusTable from '../../components/tables/MarketsByStatusTable';
import { TAB_TO_STATUS } from '../../utils/statusMap';

function Markets() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const activeStatus = params.get('status') || 'Active';

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">All markets</h1>
      </div>

      <div className="mt-6">
        <MarketsByStatusTable status={TAB_TO_STATUS[activeStatus] || 'active'} />
      </div>
    </div>
  );
}

export default Markets;
```

This removes the `CategoryTabs` import and local state. The filter bar in TopNav handles all filter UI. Markets page just reads `?status=` from the URL.

**Step 2: Verify manually**

Navigate to `/`. Click different filter tabs in the top bar. Markets should update. URL should change. Browser back/forward should work.

**Step 3: Commit**

```bash
git add frontend/src/pages/markets/Markets.jsx
git commit -m "refactor: Markets page reads filters from URL params instead of local state"
```

---

### Task 7: Remove browse mode from NavSearchDropdown

**Files:**
- Modify: `frontend/src/components/search/NavSearchDropdown.jsx`

**Step 1: Remove the browse mode from the dropdown**

Since the filter bar now handles category/status browsing, the search dropdown's "browse mode" (shown when focused with empty query) is redundant. Update the dropdown to only show when there's a query.

Replace the dropdown condition. Change:
```jsx
{isOpen && (
```
to:
```jsx
{isOpen && hasQuery && (
```

Then remove the entire browse mode `else` branch (the `/* Browse mode */` section with categories and status filters). The dropdown now only renders when there's an active search query.

Remove the unused `categories` and `statusFilters` constants from the top of the file.

**Step 2: Verify manually**

Focus the search bar — no dropdown appears until you type. Typing shows search results. `/` shortcut still works.

**Step 3: Commit**

```bash
git add frontend/src/components/search/NavSearchDropdown.jsx
git commit -m "refactor: remove browse mode from search dropdown, now handled by filter bar"
```

---

### Task 8: Clean up unused CategoryTabs import

**Files:**
- Check: `frontend/src/components/tabs/CategoryTabs.jsx` — verify no other files import it

**Step 1: Search for CategoryTabs usage**

Run: `grep -r "CategoryTabs" frontend/src/`

If only `Markets.jsx` imported it (and we removed that import in Task 6), the file is now unused.

**Step 2: Delete CategoryTabs if unused**

If no imports remain:
```bash
rm frontend/src/components/tabs/CategoryTabs.jsx
```

**Step 3: Commit**

```bash
git add -A frontend/src/components/tabs/CategoryTabs.jsx
git commit -m "chore: remove unused CategoryTabs component"
```

---

### Task 9: Final visual polish and verification

**Files:**
- Possibly tweak: `frontend/src/components/topnav/TopNav.jsx`, `frontend/src/components/topnav/FilterBar.jsx`

**Step 1: Compare with Polymarket screenshot**

Open `http://localhost:5174/` and compare the top bar layout against the Polymarket reference. Check:
- Row 1: Logo icon + text | search (wider) with `/` hint | About + auth buttons
- Row 2: General | separator | Active | Closed | Resolved | All
- Both rows sticky
- Mobile: icon-only logo, hidden search, horizontal scroll on filter bar

**Step 2: Adjust spacing/sizing if needed**

Potential tweaks:
- Search bar max-width (currently `max-w-lg`, may need `max-w-xl` or `max-w-2xl`)
- Row heights
- Button padding/margins

**Step 3: Commit any polish changes**

```bash
git add frontend/src/components/topnav/
git commit -m "style: polish top bar spacing and sizing to match Polymarket"
```
