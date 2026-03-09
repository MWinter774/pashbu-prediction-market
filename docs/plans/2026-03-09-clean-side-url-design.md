# Clean URL for Bet Side Selection

## Date: 2026-03-09

## Problem

When a user clicks Yes/No on a market card from the homepage, they are navigated to `/markets/:id?side=yes|no`. The `?side=` query parameter is visible in the URL and stays there permanently.

We want to match Polymarket's behavior: clean URLs with no query params, while still preserving the user's side selection through one page refresh.

## Polymarket Reference

- URL is always clean: `/event/{slug}` — no query params for side selection
- Clicking Yes/No on the homepage navigates to the event page with the side pre-selected
- Selection survives one refresh, then resets to default on the second refresh

## Design

### Approach: React Router `location.state` + sessionStorage refresh counter

Use React Router v5's `location.state` to pass the side from MarketCard to TradeSidebar. The browser's History API preserves `location.state` across refreshes. A sessionStorage flag tracks whether the state has already been "used once," enabling exactly one-refresh persistence.

### Changes

**MarketCard** — Pass side via router state instead of query param:

```js
// Before
history.push(`/markets/${market.id}?side=${side}`);

// After
history.push({ pathname: `/markets/${market.id}`, state: { side } });
```

**TradeSidebar** — Read from `location.state` instead of `location.search`, manage refresh lifecycle:

```js
const sideParam = location.state?.side;
const initialOutcome = sideParam === 'yes' ? 'YES' : sideParam === 'no' ? 'NO' : null;

useEffect(() => {
  if (sideParam) {
    const key = `side-used-${marketId}`;
    if (sessionStorage.getItem(key)) {
      // Second load — clear everything
      sessionStorage.removeItem(key);
      history.replace({ pathname: location.pathname, state: {} });
    } else {
      // First load — mark as used, keep state for one refresh
      sessionStorage.setItem(key, '1');
    }
  }
}, []);
```

### Lifecycle

1. **Navigate from card** → `state.side = 'yes'`, sessionStorage empty → sets flag, keeps state → Yes pre-selected
2. **First refresh** → `state.side = 'yes'` still there, flag exists → clears both → Yes still pre-selected on this load
3. **Second refresh** → `state` is `{}`, no flag → defaults to null (no pre-selection)

### Scope

- Only the initial navigation from the homepage triggers persistence
- Clicking Yes/No on the market detail page itself does NOT trigger persistence — it's ephemeral UI state
- No backend changes required

### Files to modify

- `frontend/src/components/cards/MarketCard.jsx` — change `history.push` call
- `frontend/src/components/trade/TradeSidebar.jsx` — read from `location.state`, add refresh lifecycle logic
