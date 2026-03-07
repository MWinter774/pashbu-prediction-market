# Polymarket-Style Homepage Redesign

**Date:** 2026-03-07
**Branch:** feature/polymarket-homepage

## Goal

Replace the static HTML homepage with a Polymarket-style "All markets" card grid at `/`. Remove the separate `/markets` route. Add market image support.

## Routing Changes

- `/` renders the enhanced markets grid (replaces static homepage)
- Delete `/markets` route entirely
- Delete `Home.jsx` component
- Update all internal links pointing to `/markets` to point to `/`
- Remove "Home" and "Markets" duplication from TopNav link bar

All other routes remain unchanged (`/markets/:marketId`, `/create`, `/profile`, etc.).

## Market Card — Polymarket Style

### Layout

- **Market thumbnail** (from new `image_url` field) top-left next to title; fallback placeholder if no image
- **Question title** — bold, white, 2-line clamp
- **Outcomes section** varies by market type:
  - **Binary (2 outcomes):** Single probability % with "chance" label, then two large Yes/No buttons
  - **Multi-outcome (3+):** Top outcomes listed with probability %, small Yes/No buttons per row
- **Footer:** Volume display + bookmark icon

### Interaction

- Yes/No buttons navigate to `/markets/:marketId?side=yes` or `?side=no` (pre-selects bet side on detail page)
- Card itself is clickable, navigates to `/markets/:marketId`

### Styling

- Dark background (`pm-card`), subtle border (`pm-card-border`), hover state with lift/highlight
- Yes button: `pm-yes` green; No button: `pm-no` red
- Responsive: 1 col mobile, 2 col tablet, 3 col desktop

## Backend — Market Image Support

### Database

- Add `image_url` (string, nullable) to `Market` model
- New migration to add the column

### Storage

- File uploads saved to server filesystem at `/uploads/markets/`
- Served via static file route: `GET /v0/uploads/markets/:filename`
- Validation: PNG, JPG, WEBP only; max 2MB

### API

- `POST /v0/markets` — accept optional image upload (multipart form data)
- `PUT /v0/markets/:id/image` — admin endpoint to update any market's image
- `GET /v0/markets` and `GET /v0/markets/:id` — include `image_url` in response

### Frontend

- Image upload field on Create Market form
- Admin ability to update market images (new admin endpoint usage)
- Fallback: cards without an image show default placeholder

## Homepage Category Tabs + Search

- Horizontal scrollable topic tabs below TopNav on homepage
- "All markets" bold heading on left, search + filter icons on right
- "All" tab selected by default (highlighted)
- Existing `CategoryTabs` and `GlobalSearchBar` reused and restyled
- Clicking search icon expands inline search field

## Deletions

### Frontend

- `Home.jsx` — static HTML homepage component
- `/markets` route from `AppRoutes.jsx`
- "Home" and "Markets" links from TopNav link bar
- `MobileMarketCard.jsx` — replaced by responsive new card
- Table-based market listing path (`useCardGrid={false}` in `MarketsByStatusTable`)

### Backend

- `HomepageContent` model
- Homepage content seed data
- Homepage content API handlers and routes
- Homepage content editing permission/feature

## Non-Goals

- Hero carousel / featured markets section
- Breaking news sidebar / hot topics
- Bookmarks functionality (just visual icon for now)
- Volume badges
- Branding changes
