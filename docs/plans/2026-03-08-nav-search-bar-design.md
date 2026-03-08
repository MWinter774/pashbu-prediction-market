# Nav Search Bar Design

## Goal

Replace the decorative search placeholder in TopNav with a functional Polymarket-style search bar that shows categories on focus and live search results on typing. Remove the search toggle button from the Markets page.

## What Changes

### TopNav Search Bar (new `NavSearchDropdown` component)

- **Default**: Rounded input with placeholder "Search markets..." and search icon, same visual style as current decorative link
- **On focus**: Dropdown appears below with:
  - **Categories**: "General" (current categories from CategoryTabs)
  - **Status filters**: Active, Closed, Resolved, All
  - Each item is a link that navigates to `/` with appropriate filter (or scrolls to filtered view)
- **On typing**: Dropdown switches to live search results using existing `searchMarkets` API (300ms debounce, limit 20). Each result shows market title + probability % and links to `/markets/:id`
- **On blur / Escape / clicking result**: Dropdown closes and input clears
- **Mobile**: Same search bar shown inline (replaces current `🔍` emoji link)

### Markets Page Cleanup

Remove from `Markets.jsx`:
- Search toggle button (magnifying glass SVG next to "All markets")
- `showSearch` state
- Toggled `GlobalSearchBar` rendering
- `SearchResultsTable` rendering in search mode
- Imports for `GlobalSearchBar` and `SearchResultsTable`

The page keeps: "All markets" heading, `CategoryTabs`, `MarketsByStatusTable`.

### Files Removed / Deprecated

- `GlobalSearchBar.jsx` — logic absorbed into `NavSearchDropdown`
- `SearchResultsTable.jsx` — no longer needed (results shown in dropdown)
- `MarketSearch.jsx` — already unused legacy component

### TopNav Changes

- Remove decorative `<Link to="/">Search markets...</Link>` (desktop)
- Remove `🔍` emoji link (mobile)
- Add `NavSearchDropdown` component in their place

## Architecture

New file: `frontend/src/components/search/NavSearchDropdown.jsx`

Uses:
- `searchMarkets` from `api/marketsApi.js` (unchanged)
- Click-outside-to-close pattern (same as `UserMenu` in TopNav)
- `useRef` for dropdown ref, `useState` for query/results/mode
- `useEffect` with debounce for search
- React Router `Link` for navigation to markets and category filters

## Backend

No backend changes required. Existing `/v0/markets/search` endpoint handles everything.
