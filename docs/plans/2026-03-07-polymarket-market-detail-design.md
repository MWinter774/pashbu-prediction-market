# Polymarket-Style Market Detail Page Design

## Summary

Redesign the market detail page (`/markets/:id`) to match Polymarket's layout: a two-column desktop layout with a persistent trade sidebar, Polymarket-style probability display, and streamlined trading flow.

## Approach

Approach C: New page-level layout shell with reused child components. The chart, activity tabs, and data hooks remain stable. Main new work is the two-column layout and a new trade sidebar component.

## Desktop Layout (md+)

Two-column CSS grid: `grid-cols-[1fr_380px]`

### Left Column (main content)

1. **Market header**: Market image thumbnail + title (large heading).
2. **Chart section**:
   - Time range filter tabs above the chart (Past, 1W, 1M, 3M, All).
   - Large green probability text: "50% chance" with change indicator (up/down arrow + percentage change).
   - Reuse `MarketChart`, restyle to line chart.
   - Compact inline stats below chart: volume + end date (e.g. "0 Vol. | Mar 7, 2026").
3. **Rules section**: Market description, truncated to ~3 lines with "Show more" link. Single section (no tabs).
4. **Activity section**: Reuse `ActivityTabs` (Positions, Bets, Leaderboard, Comments), restyled.

### Right Column (trade sidebar, sticky)

New `TradeSidebar` component, `position: sticky; top: ...`.

1. **Buy/Sell toggle**: Two tabs. Buy selected by default.
2. **Outcome buttons**: Two large buttons side by side.
   - Yes button (green/pm-yes) showing price (e.g. "Yes 50c").
   - No button (gray/pm-no) showing price (e.g. "No 50c").
   - Prices derived from probability. Uses market's custom yesLabel/noLabel.
3. **Amount input**: "Amount" label left, large value display right. Quick-add buttons: +1, +5, +10, +100, Max. Max uses user's available balance.
4. **Trade button**: Full-width green button. Uses existing `submitBet` logic.
5. **Resolve button**: Only shown for market creator on unresolved markets, below Trade button.
6. **Logged out / resolved state**: Show outcome prices as read-only. Display "Log in to trade" prompt when not authenticated.

## Mobile Layout (< md)

Single column, full width. Same content order as left column.

Trade sidebar is hidden. Floating "Trade" button at bottom of screen (reworked `TradeCTA`). Tapping opens `TradeSidebar` content as a bottom-sheet modal.

## Component Changes

### New
- `MarketDetailsLayout.jsx` — Rewritten. Two-column grid wrapper.
- `TradeSidebar.jsx` — Buy/Sell toggle, outcome buttons, amount quick-adds, Trade button. Used in sidebar (desktop) and modal (mobile).
- `TradeCTA.jsx` — Reworked. Floating mobile button that opens TradeSidebar in a modal.

### Reused (restyled)
- `MarketChart.jsx` — Restyle, switch to line chart.
- `ActivityTabs.jsx` — Restyle tabs.
- `useMarketDetails.jsx` — No changes.
- `ResolutionAlert.jsx` — No changes.
- `ResolveModal.jsx` — No changes.

### Removed / replaced
- `BuySharesLayout.jsx` — Replaced by TradeSidebar buy flow.
- `SellSharesLayout.jsx` — Replaced by TradeSidebar sell flow.
- `TradeTabs.jsx` — Replaced by Buy/Sell toggle in TradeSidebar.
- `BetModal.jsx` — Replaced by mobile modal rendering of TradeSidebar.

## Data Flow

No backend changes. Existing `useMarketDetails` hook provides all data. `submitBet` utility handles trade submission. User balance for "Max" fetched via existing `FetchUserCredit` utility or `/v0/users/{username}` endpoint.
