# Clean URL Bet Side Selection — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove `?side=yes|no` query param from URLs, passing bet side via React Router `location.state` with one-refresh persistence.

**Architecture:** MarketCard passes side via `history.push` state object. TradeSidebar reads `location.state.side` instead of `location.search`. A sessionStorage flag per market tracks refresh count to clear state after one refresh.

**Tech Stack:** React Router v5 (`useHistory`, `useLocation`), sessionStorage, React hooks

---

### Task 1: Update MarketCard to pass side via router state

**Files:**
- Modify: `frontend/src/components/cards/MarketCard.jsx:14`

**Step 1: Change `history.push` to use state object**

Replace line 14:
```js
history.push(`/markets/${market.id}?side=${side}`);
```

With:
```js
history.push({ pathname: `/markets/${market.id}`, state: { side } });
```

**Step 2: Verify MarketCard renders and navigates**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add frontend/src/components/cards/MarketCard.jsx
git commit -m "feat: pass bet side via router state instead of query param"
```

---

### Task 2: Update TradeSidebar to read from location.state

**Files:**
- Modify: `frontend/src/components/trade/TradeSidebar.jsx:1-2,9-11,35-39`

**Step 1: Add `useHistory` import**

Replace line 2:
```js
import { useLocation } from 'react-router-dom';
```

With:
```js
import { useLocation, useHistory } from 'react-router-dom';
```

**Step 2: Read side from `location.state` instead of `location.search`**

Replace lines 9-11:
```js
  const location = useLocation();
  const sideParam = new URLSearchParams(location.search).get('side');
  const initialOutcome = sideParam === 'yes' ? 'YES' : sideParam === 'no' ? 'NO' : null;
```

With:
```js
  const location = useLocation();
  const history = useHistory();
  const sideParam = location.state?.side;
  const initialOutcome = sideParam === 'yes' ? 'YES' : sideParam === 'no' ? 'NO' : null;
```

**Step 3: Replace the auto-focus useEffect with refresh lifecycle logic**

Replace lines 35-39:
```js
  useEffect(() => {
    if (initialOutcome && amountRef.current) {
      amountRef.current.focus();
    }
  }, [initialOutcome]);
```

With:
```js
  useEffect(() => {
    if (sideParam) {
      const key = `side-used-${marketId}`;
      if (sessionStorage.getItem(key)) {
        // Second load — clear flag and router state
        sessionStorage.removeItem(key);
        history.replace({ pathname: location.pathname, state: {} });
      } else {
        // First load — mark as used, keep state for one refresh
        sessionStorage.setItem(key, '1');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialOutcome && amountRef.current) {
      amountRef.current.focus();
    }
  }, [initialOutcome]);
```

**Step 4: Verify build succeeds**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors.

**Step 5: Commit**

```bash
git add frontend/src/components/trade/TradeSidebar.jsx
git commit -m "feat: read bet side from router state with one-refresh persistence"
```

---

### Task 3: Manual smoke test

**Step 1: Start dev server**

Run: `cd frontend && npm run start`

**Step 2: Test navigation from homepage**

1. Click "Yes" on any market card
2. Verify URL is `/markets/:id` (no `?side=`)
3. Verify Yes button is pre-selected and amount input is focused

**Step 3: Test one-refresh persistence**

1. From step above, refresh the page (F5)
2. Verify Yes is still pre-selected
3. Refresh again
4. Verify no side is pre-selected (reset to default)

**Step 4: Test in-page click does not persist**

1. Navigate directly to `/markets/:id` (no state)
2. Click "No" on the trade sidebar
3. Refresh
4. Verify no side is pre-selected

**Step 5: Commit (no code change — just verify)**

No commit needed. All done.
