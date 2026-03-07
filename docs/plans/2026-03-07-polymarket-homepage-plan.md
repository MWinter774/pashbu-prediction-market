# Polymarket-Style Homepage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the static HTML homepage with a Polymarket-style "All markets" card grid at `/`, add market image support, and clean up dead code.

**Architecture:** Enhance existing market card components with Polymarket styling and inline bet navigation. Add `image_url` field to Market model with file upload support. Route `/` directly to the enhanced markets grid, delete `/markets` route and all homepage content infrastructure.

**Tech Stack:** Go (backend), React/Vite (frontend), Tailwind CSS, GORM, Gorilla Mux, PostgreSQL

---

## Task 1: Backend — Add `image_url` to Market Model + Migration

**Files:**
- Modify: `backend/models/market.go:9-26`
- Create: `backend/migration/migrations/20260309_000000_add_market_image.go`
- Modify: `backend/handlers/marketpublicresponse/publicresponsemarket.go:11-62`

**Step 1: Add `ImageURL` field to Market model**

In `backend/models/market.go`, add after the `Category` field (line 23):

```go
ImageURL           string    `json:"imageUrl" gorm:"default:null"`
```

**Step 2: Add `ImageURL` to `PublicResponseMarket`**

In `backend/handlers/marketpublicresponse/publicresponsemarket.go`, add to the struct (after line 25):

```go
ImageURL                string    `json:"imageUrl"`
```

And in the `GetPublicResponseMarketByID` function, add to the response mapping (after line 58):

```go
ImageURL:                market.ImageURL,
```

**Step 3: Add `ImageURL` to `MarketOverview` response**

In `backend/handlers/markets/listmarkets.go`, the `MarketOverview` struct uses `PublicResponseMarket` which now includes `ImageURL` — no change needed here since it embeds the public response.

**Step 4: Create migration**

Create `backend/migration/migrations/20260309_000000_add_market_image.go`:

```go
package migrations

import (
	"socialpredict/migration"
	"socialpredict/models"

	"gorm.io/gorm"
)

func MigrateAddMarketImage(db *gorm.DB) error {
	if !db.Migrator().HasColumn(&models.Market{}, "image_url") {
		if err := db.Migrator().AddColumn(&models.Market{}, "ImageURL"); err != nil {
			return err
		}
	}
	return nil
}

func init() {
	migration.Register("20260309000000", func(db *gorm.DB) error {
		return MigrateAddMarketImage(db)
	})
}
```

**Step 5: Run tests**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./...`
Expected: All existing tests pass (migration is additive, no breaking changes)

**Step 6: Commit**

```bash
git add backend/models/market.go backend/handlers/marketpublicresponse/publicresponsemarket.go backend/migration/migrations/20260309_000000_add_market_image.go backend/handlers/markets/listmarkets.go
git commit -m "feat: add image_url field to Market model with migration"
```

---

## Task 2: Backend — Image Upload Endpoint

**Files:**
- Create: `backend/handlers/markets/marketimage.go`
- Modify: `backend/server/server.go:124-136` (add route)

**Step 1: Create the image upload handler**

Create `backend/handlers/markets/marketimage.go`:

```go
package marketshandlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"socialpredict/middleware"
	"socialpredict/models"
	"socialpredict/util"
	"strings"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

const (
	maxImageSize    = 2 << 20 // 2MB
	uploadDir       = "./uploads/markets"
)

var allowedImageTypes = map[string]string{
	"image/png":  ".png",
	"image/jpeg": ".jpg",
	"image/webp": ".webp",
}

// UploadMarketImageHandler handles image upload for a market.
// Creator can upload on their own market; admins (create_users permission) can upload on any market.
func UploadMarketImageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not supported", http.StatusMethodNotAllowed)
		return
	}

	db := util.GetDB()

	// Authenticate user
	user, httperr := middleware.ValidateTokenAndGetUser(r, db)
	if httperr != nil {
		http.Error(w, httperr.Error(), httperr.StatusCode)
		return
	}

	vars := mux.Vars(r)
	marketId := vars["marketId"]

	// Find the market
	var market models.Market
	if err := db.First(&market, "id = ?", marketId).Error; err != nil {
		http.Error(w, "Market not found", http.StatusNotFound)
		return
	}

	// Check permissions: creator or admin
	isCreator := market.CreatorUsername == user.Username
	isAdmin := user.HasPermission("create_users")
	if !isCreator && !isAdmin {
		http.Error(w, "Not authorized to update this market's image", http.StatusForbidden)
		return
	}

	// Parse multipart form
	if err := r.ParseMultipartForm(maxImageSize); err != nil {
		http.Error(w, "Image too large (max 2MB)", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "No image file provided", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate content type
	contentType := header.Header.Get("Content-Type")
	ext, ok := allowedImageTypes[contentType]
	if !ok {
		http.Error(w, "Invalid image type. Allowed: PNG, JPG, WEBP", http.StatusBadRequest)
		return
	}

	// Validate size
	if header.Size > maxImageSize {
		http.Error(w, "Image too large (max 2MB)", http.StatusBadRequest)
		return
	}

	// Ensure upload directory exists
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	filePath := filepath.Join(uploadDir, filename)

	// Save file
	dst, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "Server error", http.StatusInternalServerError)
		return
	}

	// Delete old image if exists
	if market.ImageURL != "" {
		oldPath := strings.TrimPrefix(market.ImageURL, "/v0/")
		os.Remove(oldPath)
	}

	// Update market record
	market.ImageURL = fmt.Sprintf("/v0/uploads/markets/%s", filename)
	if err := db.Save(&market).Error; err != nil {
		http.Error(w, "Error saving market", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"imageUrl":"%s"}`, market.ImageURL)
}
```

**Step 2: Add the route and static file server to `server.go`**

In `backend/server/server.go`, add to the market routes section (after line 136):

```go
// Market image upload
r.HandleFunc("/v0/markets/{marketId}/image", securityMiddleware(marketshandlers.UploadMarketImageHandler)).Methods("PUT")

// Serve uploaded market images
r.PathPrefix("/v0/uploads/markets/").Handler(
	http.StripPrefix("/v0/uploads/markets/",
		http.FileServer(http.Dir("./uploads/markets")),
	),
)
```

**Step 3: Add `uuid` dependency**

Run: `cd backend && go get github.com/google/uuid`

**Step 4: Run tests**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./...`
Expected: All tests pass

**Step 5: Commit**

```bash
git add backend/handlers/markets/marketimage.go backend/server/server.go backend/go.mod backend/go.sum
git commit -m "feat: add market image upload endpoint"
```

---

## Task 3: Backend — Delete Homepage Content System

**Files:**
- Delete: `backend/handlers/cms/` (entire directory)
- Modify: `backend/server/server.go:166-173` (remove homepage routes)
- Modify: `backend/seed/seed.go:103-141` (remove SeedHomepage)
- Delete: `backend/seed/home.md`
- Delete: `backend/seed/home_embed.go`
- Modify: `backend/main.go` (remove SeedHomepage call)
- Modify: `backend/migration/migrations/20251013_080000_core_models.go` (remove HomepageContent from AutoMigrate)

**Step 1: Remove homepage routes from `server.go`**

Remove lines 166-173 (the homepage content section) from `backend/server/server.go`. Remove the import for the CMS homepage HTTP handler.

**Step 2: Remove `SeedHomepage` from `seed.go`**

Remove the `SeedHomepage` function (lines 103-141) from `backend/seed/seed.go`.

**Step 3: Delete embedded homepage content files**

Delete `backend/seed/home.md` and `backend/seed/home_embed.go`.

**Step 4: Remove `SeedHomepage` call from `main.go`**

Find and remove the `seed.SeedHomepage(db, ...)` call in `backend/main.go`.

**Step 5: Delete `backend/handlers/cms/` directory**

Remove the entire CMS handlers directory.

**Step 6: Remove HomepageContent from core migration AutoMigrate**

In `backend/migration/migrations/20251013_080000_core_models.go`, remove `&models.HomepageContent{}` from the `db.AutoMigrate(...)` call. Note: don't drop the table in migration — it can remain as an unused table.

**Step 7: Delete the HomepageContent model**

Remove `backend/models/homepage.go`.

**Step 8: Run tests**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./...`
Expected: All tests pass (may need to fix import references)

**Step 9: Commit**

```bash
git add -A
git commit -m "refactor: remove homepage content system (model, handlers, seed, routes)"
```

---

## Task 4: Frontend — Redesign MarketCard (Polymarket Style)

**Files:**
- Modify: `frontend/src/components/cards/MarketCard.jsx:1-60`

**Step 1: Rewrite MarketCard with Polymarket-style layout**

Replace the entire contents of `frontend/src/components/cards/MarketCard.jsx`:

```jsx
import React from 'react';
import { Link, useHistory } from 'react-router-dom';

const MarketCard = ({ marketData }) => {
  const history = useHistory();
  const { market, lastProbability, totalVolume } = marketData;
  const yesLabel = market.yesLabel || 'YES';
  const noLabel = market.noLabel || 'NO';
  const yesPct = (lastProbability * 100).toFixed(0);

  const handleBetClick = (e, side) => {
    e.preventDefault();
    e.stopPropagation();
    history.push(`/markets/${market.id}?side=${side}`);
  };

  return (
    <Link
      to={`/markets/${market.id}`}
      className="block bg-pm-card border border-pm-card-border rounded-xl p-4 hover:border-gray-500 transition-colors"
    >
      {/* Header: Icon + Title */}
      <div className="flex items-start gap-3 mb-4">
        {market.imageUrl ? (
          <img
            src={market.imageUrl}
            alt=""
            className="w-10 h-10 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-pm-hover shrink-0 flex items-center justify-center text-pm-muted text-lg">
            ?
          </div>
        )}
        <h3 className="text-white font-semibold text-sm line-clamp-2">
          {market.questionTitle}
        </h3>
      </div>

      {/* Probability */}
      <div className="mb-4">
        <span className="text-2xl font-bold text-white">{yesPct}%</span>
        <span className="text-sm text-pm-muted ml-1">chance</span>
      </div>

      {/* Yes / No Buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={(e) => handleBetClick(e, 'yes')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold bg-pm-yes/15 text-pm-yes border border-pm-yes/30 hover:bg-pm-yes/25 transition-colors"
        >
          {yesLabel}
        </button>
        <button
          onClick={(e) => handleBetClick(e, 'no')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold bg-pm-no/15 text-pm-no border border-pm-no/30 hover:bg-pm-no/25 transition-colors"
        >
          {noLabel}
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-pm-muted pt-2 border-t border-pm-card-border">
        <span>Vol: {totalVolume}</span>
      </div>
    </Link>
  );
};

export default MarketCard;
```

**Step 2: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/src/components/cards/MarketCard.jsx
git commit -m "feat: redesign MarketCard with Polymarket-style layout and bet buttons"
```

---

## Task 5: Frontend — Update Routing (Homepage = Markets Grid)

**Files:**
- Modify: `frontend/src/helpers/AppRoutes.jsx:1-134`
- Delete: `frontend/src/pages/home/Home.jsx`
- Delete: `frontend/src/pages/home/` (directory, if empty after)

**Step 1: Update AppRoutes — replace Home with Markets at `/`, remove `/markets` route**

In `frontend/src/helpers/AppRoutes.jsx`:

1. Remove the `Home` import (line 12)
2. Remove the `/markets` route block (lines 47-53)
3. Change the `/` route (lines 118-124) to render `<Markets />` instead of `<Home />`

The updated `/` route:

```jsx
<Route exact path='/'>
  {isLoggedIn && mustChangePassword ? (
    <Redirect to='/changepassword' />
  ) : (
    <Markets />
  )}
</Route>
```

**Step 2: Delete `Home.jsx`**

Delete `frontend/src/pages/home/Home.jsx` and the `home/` directory if empty.

**Step 3: Update TopNav links**

In `frontend/src/components/topnav/TopNav.jsx`:

1. Remove the "Home" link (line 141-143) and the "Markets" link (line 144-146) from the nav links row
2. Change the search bar link from `/markets` to `/` (lines 95-101)
3. Change the mobile search icon link from `/markets` to `/` (lines 106-111)

The updated nav links row (lines 139-157) becomes:

```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6">
  <div className="flex items-center gap-6 h-10 overflow-x-auto text-sm">
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
```

**Step 4: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: replace homepage with markets grid, remove /markets route"
```

---

## Task 6: Frontend — Delete Dead Components

**Files:**
- Delete: `frontend/src/components/tables/MobileMarketCard.jsx`
- Modify: `frontend/src/components/tables/MarketsByStatusTable.jsx` (remove table rendering path and MobileMarketCard import)

**Step 1: Remove table-based rendering from MarketsByStatusTable**

In `frontend/src/components/tables/MarketsByStatusTable.jsx`:

1. Remove the `MobileMarketCard` import
2. Remove the `TableHeader` component definition (if only used in table path)
3. Remove the `MarketRow` component definition (if only used in table path)
4. Remove the `useCardGrid` prop — always render `MarketCardGrid`
5. Simplify the component to only fetch data and render `MarketCardGrid`

The simplified component should just:
- Fetch markets by status from the API
- Pass them to `MarketCardGrid`
- Handle loading/error states

**Step 2: Delete MobileMarketCard**

Delete `frontend/src/components/tables/MobileMarketCard.jsx`.

**Step 3: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove MobileMarketCard and table-based market listing"
```

---

## Task 7: Frontend — Add "All markets" Header with Search

**Files:**
- Modify: `frontend/src/pages/markets/Markets.jsx:1-41`

**Step 1: Update Markets page with "All markets" header and integrated search**

Update `frontend/src/pages/markets/Markets.jsx` to add a Polymarket-style header:

```jsx
import React, { useState } from 'react';
import CategoryTabs from '../../components/tabs/CategoryTabs';
import MarketsByStatusTable from '../../components/tables/MarketsByStatusTable';
import GlobalSearchBar from '../../components/search/GlobalSearchBar';
import SearchResultsTable from '../../components/tables/SearchResultsTable';
import { TAB_TO_STATUS } from '../../utils/statusMap';

function Markets() {
  const [activeCategory, setActiveCategory] = useState('General');
  const [activeStatus, setActiveStatus] = useState('Active');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div>
      {/* "All markets" header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">All markets</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 text-pm-muted hover:text-white transition-colors"
            aria-label="Search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Inline search bar (toggled) */}
      {showSearch && (
        <div className="mb-4">
          <GlobalSearchBar
            onSearchResults={setSearchResults}
            currentStatus={TAB_TO_STATUS[activeStatus]}
            isSearching={isSearching}
            setIsSearching={setIsSearching}
          />
        </div>
      )}

      <CategoryTabs
        activeCategory={activeCategory}
        activeStatus={activeStatus}
        onCategoryChange={setActiveCategory}
        onStatusChange={setActiveStatus}
      />

      <div className="mt-6">
        {isSearching ? (
          <SearchResultsTable searchResults={searchResults} />
        ) : (
          <MarketsByStatusTable status={TAB_TO_STATUS[activeStatus]} />
        )}
      </div>
    </div>
  );
}

export default Markets;
```

**Step 2: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/src/pages/markets/Markets.jsx
git commit -m "feat: add Polymarket-style 'All markets' header with toggle search"
```

---

## Task 8: Frontend — Image Upload on Create Market Form

**Files:**
- Modify: `frontend/src/pages/create/Create.jsx`

**Step 1: Add image upload field to Create Market form**

In `frontend/src/pages/create/Create.jsx`, add:

1. A new state variable: `const [imageFile, setImageFile] = useState(null);`
2. An image preview state: `const [imagePreview, setImagePreview] = useState(null);`
3. An image upload input after the category select field
4. After market creation succeeds, upload the image to `PUT /v0/markets/:id/image`

Add the image input JSX (after the category select):

```jsx
{/* Market Image */}
<div>
  <label className="block text-sm font-medium text-gray-300 mb-1">
    Market Image (optional)
  </label>
  <input
    type="file"
    accept="image/png,image/jpeg,image/webp"
    onChange={(e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          setError('Image must be under 2MB');
          return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      }
    }}
    className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pm-card file:text-gray-300 hover:file:bg-pm-hover"
  />
  {imagePreview && (
    <img src={imagePreview} alt="Preview" className="mt-2 w-20 h-20 rounded-lg object-cover" />
  )}
</div>
```

Add image upload after market creation succeeds (after the market is created and before redirect):

```javascript
// Upload image if provided
if (imageFile && data.id) {
  const formData = new FormData();
  formData.append('image', imageFile);
  await fetch(`${API_URL}/v0/markets/${data.id}/image`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
}
```

**Step 2: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/src/pages/create/Create.jsx
git commit -m "feat: add image upload to create market form"
```

---

## Task 9: Integration Test — Full Flow Verification

**Step 1: Start the development environment**

Run: `./SocialPredict up`

**Step 2: Verify homepage shows markets grid**

1. Open `http://localhost:5173/`
2. Confirm: "All markets" heading visible with category tabs and card grid
3. Confirm: No separate `/markets` page (should 404 or redirect)

**Step 3: Verify market card design**

1. Cards should show: thumbnail placeholder (? icon), title, probability %, Yes/No buttons, volume
2. Clicking "Yes" button navigates to `/markets/:id?side=yes`
3. Clicking card body navigates to `/markets/:id`

**Step 4: Verify image upload**

1. Log in as admin
2. Create a new market with an image attached
3. Confirm the image appears on the market card on the homepage

**Step 5: Verify TopNav**

1. Logo links to `/`
2. Search bar links to `/` (or opens search on homepage)
3. Nav links: Polls, Stats, About (no Home or Markets)

**Step 6: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: integration fixes for polymarket homepage"
```

---

## Task Summary

| Task | Description | Scope |
|------|-------------|-------|
| 1 | Add `image_url` to Market model + migration | Backend |
| 2 | Image upload endpoint | Backend |
| 3 | Delete homepage content system | Backend |
| 4 | Redesign MarketCard (Polymarket style) | Frontend |
| 5 | Update routing (/ = markets grid) | Frontend |
| 6 | Delete dead components | Frontend |
| 7 | Add "All markets" header with search | Frontend |
| 8 | Image upload on Create Market form | Frontend |
| 9 | Integration test | Full stack |
