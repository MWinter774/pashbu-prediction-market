# Polymarket UI Redesign — Design Document

**Date:** 2026-03-07
**Branch:** feature/ui-updates
**Approach:** New Component Layer (build new components alongside old, swap in, delete old)

## Scope (Phase 1)

- **G** — Top horizontal navbar with search (replacing left sidebar)
- **F** — 3-column market card grid (replacing table layout)
- **A** — Category/topic system (backend + frontend, starting with "General" only)

### Deferred to later phases

- B — Featured/hero market carousel
- C — Breaking news / Hot topics right sidebar
- D — Bookmark/save markets
- E — Volume badges on market cards

## 1. Top Horizontal Navbar

### Layout

- Fixed top bar, full width, dark background
- **Left:** Logo/brand name
- **Center:** Search bar (rounded, placeholder "Search markets...")
- **Right:** Log In / Sign Up (anonymous) or user menu dropdown (authenticated: Profile, Credits, Logout)

### Mobile

- Search bar collapses to a search icon
- Auth/user menu becomes a hamburger menu
- Category tabs remain horizontally scrollable

### New components

- `TopNav.jsx` — main navbar
- `CategoryTabs.jsx` — horizontal category + status tabs
- `UserMenu.jsx` — dropdown for authenticated users

### Old components to delete

- `Sidebar.jsx`

## 2. 3-Column Market Card Grid

### Layout

- Responsive grid: 3 columns desktop, 2 tablet, 1 mobile
- Rounded rectangle cards with subtle border, slightly lighter background than page

### Card anatomy

- **Top:** Market question (bold, white, clickable link to detail page)
- **Body:** Outcome options — each row: option label, probability %, small Yes/No action buttons
- **Footer:** Volume, creator info, market status indicator

### Data source

Same hooks/API as current MarketTable — reuses existing market list endpoints.

### New components

- `MarketCardGrid.jsx` — grid container
- `MarketCard.jsx` — individual card

### Old components to delete

- `MarketTable.jsx`
- `MobileMarketCard.jsx`
- `MarketsByStatusTable.jsx`
- `SearchResultsTable.jsx`
- `MarketTables.jsx`

## 3. Category/Topic System

### Backend

- Add `Category` string field to `Market` model
- Migration: add `category` column, default existing markets to `"General"`
- Predefined categories: `General` (only one for now, infrastructure ready for more)
- Update create market handler to accept `category`
- Validate category against allowed list
- New query param on `GET /v0/markets`: `?category=General`

### Frontend

- `CategoryTabs.jsx` renders category filters + status filters
- Active tab: bold text with white underline indicator (Polymarket style)
- Horizontally scrollable on mobile
- Create market form gets a category dropdown
- Markets page fetches with combined params: `?category=General&status=active`

## 4. Page Layout & Color Scheme

### Page structure

```
┌─────────────────────────────────────┐
│           TopNav                     │
├─────────────────────────────────────┤
│        CategoryTabs                  │
├─────────────────────────────────────┤
│                                     │
│     MarketCardGrid (main content)   │
│     max-width ~1200px, centered     │
│                                     │
└─────────────────────────────────────┘
```

### Color scheme (Polymarket dark mode)

| Element | Color | Token |
|---------|-------|-------|
| Page background | `#171923` | `bg-page` |
| Card background | `#1e2231` | `bg-card` |
| Card border | `#2d3348` | `border-card` |
| Navbar background | `#171923` | `bg-page` (with bottom border) |
| Primary text | `#ffffff` | default white |
| Secondary text | `#8b8fa3` | `text-muted` |
| Yes/Buy button | `#22c55e` | green outlined |
| No/Sell button | `#ef4444` | red outlined |
| Active tab | white underline | — |
| Search bar bg | `#1e2231` | `bg-card` |

### App.jsx changes

- Remove sidebar layout
- Vertical stack: TopNav → CategoryTabs → centered main content (max-width 1200px)
- Update `tailwind.config.js` with new color tokens

### Routing

No changes to `AppRoutes.jsx` — same routes, new layout wrapper.

## Cleanup Checklist

After new components are wired in and verified, DELETE:

- [ ] `components/sidebar/Sidebar.jsx`
- [ ] `components/tables/MarketTable.jsx`
- [ ] `components/tables/MobileMarketCard.jsx`
- [ ] `components/tables/MarketsByStatusTable.jsx`
- [ ] `components/tables/SearchResultsTable.jsx`
- [ ] `components/tables/MarketTables.jsx`
- [ ] Old sidebar-related Tailwind config (spacing, z-index)
- [ ] Old color tokens no longer used
