# Polymarket UI Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the SocialPredict frontend to match Polymarket's dark-mode layout: top horizontal navbar, 3-column card grid, and category system.

**Architecture:** New Component Layer approach — build new Polymarket-style components alongside existing ones, swap them into App.jsx/routes, then delete old components. Backend gets a new `Category` field on Markets with a migration.

**Tech Stack:** React 18, Tailwind CSS, Go (Gorilla Mux, GORM, PostgreSQL)

---

### Task 1: Update Tailwind Config with New Color Tokens

**Files:**
- Modify: `frontend/tailwind.config.js`

**Step 1: Add new Polymarket dark-mode color tokens**

Add these tokens inside `theme.extend.colors` in `frontend/tailwind.config.js`:

```js
'pm-page': '#171923',
'pm-card': '#1e2231',
'pm-card-border': '#2d3348',
'pm-muted': '#8b8fa3',
'pm-yes': '#22c55e',
'pm-no': '#ef4444',
'pm-hover': '#252a3a',
```

Keep all existing color tokens — they're still used by components not yet migrated.

**Step 2: Verify the dev server still works**

Run: `cd frontend && npm run start` (should already be running on port 5174)
Expected: No build errors, existing site still renders.

**Step 3: Commit**

```bash
git add frontend/tailwind.config.js
git commit -m "feat: add Polymarket dark-mode color tokens to Tailwind config"
```

---

### Task 2: Create TopNav Component

**Files:**
- Create: `frontend/src/components/topnav/TopNav.jsx`

**Step 1: Create the TopNav component**

Create `frontend/src/components/topnav/TopNav.jsx`:

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../helpers/AuthContent';
import useUserCredit from '../utils/userFinanceTools/FetchUserCredit';
import LoginModalButton from '../modals/login/LoginModalClick';

const UserMenu = ({ username, usertype, userCredit, onLogout }) => {
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
        <span>@{username}</span>
        <span className="text-pm-muted">▾</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-pm-card border border-pm-card-border rounded-lg shadow-lg py-1 z-50">
          <div className="px-4 py-2 text-sm text-pm-muted border-b border-pm-card-border">
            🪙 {userCredit ?? '...'}
          </div>
          <Link
            to="/profile"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            Profile
          </Link>
          {usertype === 'ADMIN' && (
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
          <Link
            to="/create"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            Create Market
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

const TopNav = () => {
  const { isLoggedIn, username, usertype, logout, changePasswordNeeded } = useAuth();
  const { userCredit } = useUserCredit(username);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-pm-page border-b border-pm-card-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo */}
          <Link to="/" className="text-white font-bold text-lg shrink-0">
            SocialPredict
          </Link>

          {/* Center: Search (hidden on mobile, shown md+) */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <Link
              to="/markets"
              className="w-full px-4 py-2 bg-pm-card border border-pm-card-border rounded-full text-sm text-pm-muted hover:border-gray-500 transition-colors text-left"
            >
              Search markets...
            </Link>
          </div>

          {/* Right: Auth */}
          <div className="flex items-center gap-2">
            {/* Mobile search icon */}
            <Link
              to="/markets"
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              🔍
            </Link>

            {!isLoggedIn ? (
              <div className="flex items-center gap-2">
                <LoginModalButton />
              </div>
            ) : changePasswordNeeded ? (
              <div className="flex items-center gap-2">
                <Link to="/changepassword" className="text-sm text-gray-300 hover:text-white">
                  Change Password
                </Link>
                <button onClick={logout} className="text-sm text-gray-300 hover:text-white">
                  Logout
                </button>
              </div>
            ) : (
              <UserMenu
                username={username}
                usertype={usertype}
                userCredit={userCredit}
                onLogout={logout}
              />
            )}
          </div>
        </div>
      </div>

      {/* Nav links row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-6 h-10 overflow-x-auto text-sm">
          <Link to="/" className="text-gray-400 hover:text-white whitespace-nowrap transition-colors">
            Home
          </Link>
          <Link to="/markets" className="text-gray-400 hover:text-white whitespace-nowrap transition-colors">
            Markets
          </Link>
          <Link to="/polls" className="text-gray-400 hover:text-white whitespace-nowrap transition-colors">
            Polls
          </Link>
          <Link to="/stats" className="text-gray-400 hover:text-white whitespace-nowrap transition-colors">
            Stats
          </Link>
          <Link to="/about" className="text-gray-400 hover:text-white whitespace-nowrap transition-colors">
            About
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
```

**Step 2: Verify no import errors**

The file should not error since it only imports existing modules. Check the dev server console for errors.

**Step 3: Commit**

```bash
git add frontend/src/components/topnav/TopNav.jsx
git commit -m "feat: add TopNav component (Polymarket-style horizontal navbar)"
```

---

### Task 3: Create MarketCard and MarketCardGrid Components

**Files:**
- Create: `frontend/src/components/cards/MarketCard.jsx`
- Create: `frontend/src/components/cards/MarketCardGrid.jsx`

**Step 1: Create MarketCard component**

Create `frontend/src/components/cards/MarketCard.jsx`:

```jsx
import React from 'react';
import { Link } from 'react-router-dom';
import formatResolutionDate from '../../helpers/formatResolutionDate';
import { getResolvedText, getResultCssClass } from '../../utils/labelMapping';

const MarketCard = ({ marketData }) => {
  const { market, creator, lastProbability, numUsers, totalVolume } = marketData;
  const yesLabel = market.yesLabel || 'YES';
  const noLabel = market.noLabel || 'NO';
  const yesPct = (lastProbability * 100).toFixed(0);
  const noPct = (100 - lastProbability * 100).toFixed(0);

  return (
    <Link
      to={`/markets/${market.id}`}
      className="block bg-pm-card border border-pm-card-border rounded-xl p-4 hover:border-gray-500 transition-colors"
    >
      {/* Question */}
      <h3 className="text-white font-semibold text-sm mb-3 line-clamp-2">
        {market.questionTitle}
      </h3>

      {/* Outcomes */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">{yesLabel}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{yesPct}%</span>
            <span className="px-2 py-0.5 text-xs font-medium rounded border border-pm-yes text-pm-yes">
              Yes
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded border border-pm-no text-pm-no">
              No
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">{noLabel}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{noPct}%</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-pm-muted pt-2 border-t border-pm-card-border">
        <span>Vol: {totalVolume}</span>
        <span>👤 {numUsers}</span>
        <span>
          {market.isResolved ? (
            <span className={getResultCssClass(market.resolutionResult)}>
              {getResolvedText(market.resolutionResult, market)}
            </span>
          ) : (
            formatResolutionDate(market.resolutionDateTime)
          )}
        </span>
      </div>
    </Link>
  );
};

export default MarketCard;
```

**Step 2: Create MarketCardGrid component**

Create `frontend/src/components/cards/MarketCardGrid.jsx`:

```jsx
import React from 'react';
import MarketCard from './MarketCard';

const MarketCardGrid = ({ markets }) => {
  if (!markets || markets.length === 0) {
    return (
      <div className="p-8 text-center text-pm-muted">No markets found.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {markets.map((marketData, index) => (
        <MarketCard key={marketData.market?.id ?? index} marketData={marketData} />
      ))}
    </div>
  );
};

export default MarketCardGrid;
```

**Step 3: Commit**

```bash
git add frontend/src/components/cards/MarketCard.jsx frontend/src/components/cards/MarketCardGrid.jsx
git commit -m "feat: add MarketCard and MarketCardGrid components (Polymarket card layout)"
```

---

### Task 4: Create CategoryTabs Component

**Files:**
- Create: `frontend/src/components/tabs/CategoryTabs.jsx`

**Step 1: Create the CategoryTabs component**

Create `frontend/src/components/tabs/CategoryTabs.jsx`:

```jsx
import React from 'react';

const categories = ['General'];

const statusFilters = ['Active', 'Closed', 'Resolved', 'All'];

const TabButton = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2 ${
      isActive
        ? 'text-white border-white font-semibold'
        : 'text-pm-muted border-transparent hover:text-gray-300'
    }`}
  >
    {label}
  </button>
);

const CategoryTabs = ({ activeCategory, activeStatus, onCategoryChange, onStatusChange }) => {
  return (
    <div className="border-b border-pm-card-border bg-pm-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Category tabs */}
          {categories.map((cat) => (
            <TabButton
              key={cat}
              label={cat}
              isActive={activeCategory === cat}
              onClick={() => onCategoryChange(cat)}
            />
          ))}

          {/* Divider */}
          <div className="w-px h-5 bg-pm-card-border mx-2 shrink-0" />

          {/* Status tabs */}
          {statusFilters.map((status) => (
            <TabButton
              key={status}
              label={status}
              isActive={activeStatus === status}
              onClick={() => onStatusChange(status)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryTabs;
```

**Step 2: Commit**

```bash
git add frontend/src/components/tabs/CategoryTabs.jsx
git commit -m "feat: add CategoryTabs component (Polymarket-style horizontal tabs)"
```

---

### Task 5: Wire New Components into App.jsx and Markets Page

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/markets/Markets.jsx`

**Step 1: Update App.jsx to use TopNav instead of Sidebar**

Replace the contents of `frontend/src/App.jsx`:

```jsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from './helpers/AuthContent';
import AppRoutes from './helpers/AppRoutes';
import TopNav from './components/topnav/TopNav';
import '../index.css';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-pm-page text-white'>
      <h1 className='text-4xl font-bold mb-4'>Oops! Something went wrong.</h1>
      <p className='text-xl mb-8'>
        We're sorry for the inconvenience. Please try again.
      </p>
      <pre className='mb-8 p-4 bg-pm-card rounded'>{error.message}</pre>
      <button
        onClick={resetErrorBoundary}
        className='px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
      >
        Try again
      </button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {}}
    >
      <AuthProvider>
        <Router>
          <div className='App bg-pm-page min-h-screen text-white flex flex-col'>
            <TopNav />
            <main className='flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-6'>
              <AppRoutes />
            </main>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
```

**Step 2: Update Markets page to use CardGrid and CategoryTabs**

Replace the contents of `frontend/src/pages/markets/Markets.jsx`:

```jsx
import React, { useState } from 'react';
import CategoryTabs from '../../components/tabs/CategoryTabs';
import MarketCardGrid from '../../components/cards/MarketCardGrid';
import MarketsByStatusTable from '../../components/tables/MarketsByStatusTable';
import GlobalSearchBar from '../../components/search/GlobalSearchBar';
import SearchResultsTable from '../../components/tables/SearchResultsTable';
import { TAB_TO_STATUS } from '../../utils/statusMap';

function Markets() {
  const [activeCategory, setActiveCategory] = useState('General');
  const [activeStatus, setActiveStatus] = useState('Active');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  return (
    <div>
      <CategoryTabs
        activeCategory={activeCategory}
        activeStatus={activeStatus}
        onCategoryChange={setActiveCategory}
        onStatusChange={setActiveStatus}
      />

      <div className="mt-6">
        <GlobalSearchBar
          onSearchResults={setSearchResults}
          currentStatus={TAB_TO_STATUS[activeStatus]}
          isSearching={isSearching}
          setIsSearching={setIsSearching}
        />

        {isSearching ? (
          <SearchResultsTable searchResults={searchResults} />
        ) : (
          <MarketsByStatusTable status={TAB_TO_STATUS[activeStatus]} useCardGrid={true} />
        )}
      </div>
    </div>
  );
}

export default Markets;
```

Note: `MarketsByStatusTable` currently renders `MarketTable`. We'll add a `useCardGrid` prop in the next task to make it render `MarketCardGrid` instead.

**Step 3: Verify in browser**

Navigate to `http://localhost:5174` — should see the new TopNav at top, no sidebar.
Navigate to `http://localhost:5174/markets` — should see CategoryTabs and the markets.

**Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/pages/markets/Markets.jsx
git commit -m "feat: wire TopNav and CategoryTabs into App layout and Markets page"
```

---

### Task 6: Update MarketsByStatusTable to Support Card Grid Rendering

**Files:**
- Modify: `frontend/src/components/tables/MarketsByStatusTable.jsx`

**Step 1: Read the current MarketsByStatusTable file**

Read `frontend/src/components/tables/MarketsByStatusTable.jsx` to understand how it fetches and renders data.

**Step 2: Add useCardGrid prop**

Add a `useCardGrid` prop that, when `true`, renders `MarketCardGrid` instead of `MarketTable`:

```jsx
// Add import at top:
import MarketCardGrid from '../cards/MarketCardGrid';

// In the render, replace the MarketTable usage with a conditional:
// If useCardGrid is true, render <MarketCardGrid markets={markets} />
// Otherwise, render existing <MarketTable markets={markets} />
```

The exact edit depends on the file contents — read first, then make the minimal change.

**Step 3: Verify in browser**

Navigate to `http://localhost:5174/markets` — should see the 3-column card grid instead of the table.

**Step 4: Commit**

```bash
git add frontend/src/components/tables/MarketsByStatusTable.jsx
git commit -m "feat: add useCardGrid prop to MarketsByStatusTable for card grid rendering"
```

---

### Task 7: Backend — Add Category Field to Market Model

**Files:**
- Modify: `backend/models/market.go`

**Step 1: Write the failing test**

Create `backend/migration/migrations/20260307_000000_add_market_category_test.go`:

```go
package migrations

import (
	"socialpredict/models"
	"socialpredict/models/modelstesting"
	"testing"

	"gorm.io/gorm"
)

func TestMigrateAddMarketCategory(t *testing.T) {
	db := modelstesting.NewTestDB(t)

	// AutoMigrate the base schema without Category field
	db.AutoMigrate(&models.User{}, &models.Bet{})
	// Manually create markets table without category column
	db.Exec(`CREATE TABLE IF NOT EXISTS markets (
		id BIGSERIAL PRIMARY KEY,
		created_at TIMESTAMPTZ,
		updated_at TIMESTAMPTZ,
		deleted_at TIMESTAMPTZ,
		question_title TEXT NOT NULL,
		description TEXT NOT NULL,
		outcome_type TEXT NOT NULL,
		resolution_date_time TIMESTAMPTZ NOT NULL,
		final_resolution_date_time TIMESTAMPTZ,
		utc_offset INTEGER,
		is_resolved BOOLEAN,
		resolution_result TEXT,
		initial_probability DOUBLE PRECISION NOT NULL,
		yes_label TEXT DEFAULT 'YES',
		no_label TEXT DEFAULT 'NO',
		creator_username TEXT NOT NULL
	)`)

	// Insert a market without category
	db.Exec(`INSERT INTO markets (question_title, description, outcome_type, resolution_date_time, initial_probability, creator_username) VALUES ('Test?', 'desc', 'BINARY', NOW(), 0.5, 'admin')`)

	// Run the migration
	if err := MigrateAddMarketCategory(db); err != nil {
		t.Fatalf("migration failed: %v", err)
	}

	// Verify column exists and default was backfilled
	var category string
	row := db.Raw("SELECT category FROM markets WHERE question_title = 'Test?'").Row()
	if err := row.Scan(&category); err != nil {
		t.Fatalf("could not read category: %v", err)
	}
	if category != "General" {
		t.Errorf("expected 'General', got %q", category)
	}
}
```

**Step 2: Run test to verify it fails**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./migration/migrations/ -run TestMigrateAddMarketCategory -v`
Expected: FAIL (MigrateAddMarketCategory not defined yet)

**Step 3: Add Category to Market model**

Modify `backend/models/market.go` — add after the `NoLabel` field:

```go
Category string `json:"category" gorm:"default:General"`
```

**Step 4: Create the migration**

Create `backend/migration/migrations/20260307_000000_add_market_category.go`:

```go
package migrations

import (
	"socialpredict/migration"
	"socialpredict/models"

	"gorm.io/gorm"
)

func MigrateAddMarketCategory(db *gorm.DB) error {
	m := db.Migrator()

	if !m.HasColumn(&models.Market{}, "Category") {
		if err := m.AddColumn(&models.Market{}, "Category"); err != nil {
			return err
		}
	}

	if err := db.Model(&models.Market{}).
		Where("category IS NULL OR category = ''").
		Update("category", "General").Error; err != nil {
		return err
	}

	return nil
}

func init() {
	migration.Register("20260307000000", func(db *gorm.DB) error {
		return MigrateAddMarketCategory(db)
	})
}
```

**Step 5: Run test to verify it passes**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./migration/migrations/ -run TestMigrateAddMarketCategory -v`
Expected: PASS

**Step 6: Run all backend tests to check nothing broke**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./...`
Expected: All pass

**Step 7: Commit**

```bash
git add backend/models/market.go backend/migration/migrations/20260307_000000_add_market_category.go backend/migration/migrations/20260307_000000_add_market_category_test.go
git commit -m "feat: add Category field to Market model with migration"
```

---

### Task 8: Backend — Update Create Market Handler to Accept Category

**Files:**
- Modify: `backend/handlers/markets/createmarket.go` (the handler that processes POST /v0/create)

**Step 1: Read the create market handler**

Read the file to understand the current validation and creation flow.

**Step 2: Add category validation**

After the existing input validation (title, description, labels), add category validation:

```go
// Validate category — if empty, default to "General"
if market.Category == "" {
    market.Category = "General"
}
validCategories := map[string]bool{"General": true}
if !validCategories[market.Category] {
    httpErrors.RespondWithError(w, http.StatusBadRequest, "Invalid category")
    return
}
```

The exact insertion point depends on the file structure — read the file first and insert after the existing field validation block.

**Step 3: Run all backend tests**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./...`
Expected: All pass

**Step 4: Commit**

```bash
git add backend/handlers/markets/createmarket.go
git commit -m "feat: accept and validate category field in create market handler"
```

---

### Task 9: Backend — Add Category Filter to List Markets Endpoints

**Files:**
- Modify: `backend/handlers/markets/listmarketsbystatus.go`

**Step 1: Read the list markets by status handler**

Read the file to understand how status filters are applied.

**Step 2: Add category query parameter support**

In each of the status handler functions (`ListActiveMarketsHandler`, `ListClosedMarketsHandler`, `ListResolvedMarketsHandler`), extract an optional `category` query param and add it to the DB filter:

```go
category := r.URL.Query().Get("category")
// ...in the query builder:
if category != "" {
    query = query.Where("category = ?", category)
}
```

Also add the same filter to the `ListMarketsHandler` (all markets endpoint).

**Step 3: Run all backend tests**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./...`
Expected: All pass

**Step 4: Commit**

```bash
git add backend/handlers/markets/listmarketsbystatus.go backend/handlers/markets/listmarkets.go
git commit -m "feat: add category query parameter to market listing endpoints"
```

---

### Task 10: Frontend — Update Create Market Form with Category Dropdown

**Files:**
- Modify: `frontend/src/pages/create/Create.jsx`

**Step 1: Read the Create page**

Read `frontend/src/pages/create/Create.jsx` to understand the current form.

**Step 2: Add a category field to the form state and JSX**

Add `category: 'General'` to the initial form state. Add a select dropdown to the form JSX before the submit button:

```jsx
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
  <select
    value={formData.category}
    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
    className="w-full px-4 py-2 bg-pm-card border border-pm-card-border rounded text-white text-sm"
  >
    <option value="General">General</option>
  </select>
</div>
```

Ensure the `category` field is included in the POST body sent to `/v0/create`.

**Step 3: Verify in browser**

Navigate to `http://localhost:5174/create` (must be logged in) — should see the category dropdown.

**Step 4: Commit**

```bash
git add frontend/src/pages/create/Create.jsx
git commit -m "feat: add category dropdown to create market form"
```

---

### Task 11: Visual Polish and Browser Verification

**Files:**
- Possibly tweak: `frontend/src/components/topnav/TopNav.jsx`, `frontend/src/components/cards/MarketCard.jsx`, `frontend/index.css`

**Step 1: Open browser and verify all pages**

Check these pages at `http://localhost:5174`:
- `/` — Home page renders with TopNav (no sidebar)
- `/markets` — Card grid with CategoryTabs
- `/markets/{id}` — Market detail page still works
- `/create` — Create form has category dropdown
- `/profile` — Profile page still works
- `/stats` — Stats page still works
- `/about` — About page still works
- Login/logout flow works via TopNav

**Step 2: Fix any visual issues**

Compare with Polymarket dark mode screenshots. Adjust spacing, colors, border radii as needed. Common fixes:
- Card padding/margins
- Font sizes
- Nav link active states
- Mobile responsiveness

**Step 3: Commit any polish fixes**

```bash
git add -A
git commit -m "fix: visual polish for Polymarket-style UI"
```

---

### Task 12: Delete Old Components

**IMPORTANT:** Only do this after verifying everything works in Task 11.

**Files:**
- Delete: `frontend/src/components/sidebar/Sidebar.jsx`
- Delete: `frontend/src/components/footer/Footer.jsx` (no longer imported in App.jsx)
- Modify: `frontend/tailwind.config.js` — remove old `sidebar` spacing and `sidebar` zIndex tokens

**Step 1: Verify no remaining imports of Sidebar**

Run: `grep -r "Sidebar" frontend/src/ --include="*.jsx" --include="*.js"`

Should show zero results (App.jsx no longer imports it). If any other file imports it, update that file first.

**Step 2: Delete old files**

```bash
rm frontend/src/components/sidebar/Sidebar.jsx
rm frontend/src/components/footer/Footer.jsx
```

**Step 3: Remove old Tailwind config entries**

In `frontend/tailwind.config.js`, remove:
```js
spacing: { 'sidebar': '8rem' },
zIndex: { 'sidebar': 40 },
```

**Step 4: Verify build still works**

Run: `cd frontend && npm run build`
Expected: No errors

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete old Sidebar and Footer components, clean up Tailwind config"
```

---

### Task 13: Final Verification and Screenshot Comparison

**Step 1: Open browser at localhost:5174**

Take screenshots of:
- Homepage
- Markets page (card grid)
- Market detail page
- Create market page (with category dropdown)
- Mobile viewport (resize to 375px width)

**Step 2: Compare with Polymarket screenshots**

Verify:
- Top horizontal navbar ✓
- 3-column card grid on desktop ✓
- Dark mode colors match Polymarket ✓
- Category tabs visible ✓
- Status filter tabs work ✓
- Mobile responsive ✓
- Login/logout flow ✓

**Step 3: Run all backend tests one final time**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./...`
Expected: All pass

**Step 4: Run frontend build**

Run: `cd frontend && npm run build`
Expected: No errors

**Step 5: Final commit if any remaining changes**

```bash
git add -A
git commit -m "chore: final verification of Polymarket UI redesign phase 1"
```
