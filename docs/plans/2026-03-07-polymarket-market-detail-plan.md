# Polymarket-Style Market Detail Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the market detail page to match Polymarket's two-column layout with a persistent trade sidebar, large probability display, and streamlined Buy/Sell flow.

**Architecture:** Approach C — new page-level layout shell (`MarketDetailsLayout.jsx`) with reused child components (`MarketChart`, `ActivityTabs`, `useMarketDetails`). New `TradeSidebar` component handles both desktop sidebar and mobile modal. No backend changes.

**Tech Stack:** React 18, Tailwind CSS (existing `pm-*` color tokens), CanvasJS charts, React Router v5

---

### Task 1: Create TradeSidebar component (Buy flow)

The core new component. Handles Buy/Sell toggle, outcome buttons with prices, quick-add amount input, and trade submission.

**Files:**
- Create: `frontend/src/components/trade/TradeSidebar.jsx`

**Step 1: Create the TradeSidebar component**

```jsx
import React, { useState } from 'react';
import { useMarketLabels } from '../../hooks/useMarketLabels';
import { submitBet } from '../layouts/trade/TradeUtils';
import useUserCredit from '../utils/userFinanceTools/FetchUserCredit';
import { useAuth } from '../../helpers/AuthContent';

const TradeSidebar = ({ market, marketId, currentProbability, token, isLoggedIn, onTransactionSuccess }) => {
  const [mode, setMode] = useState('buy'); // 'buy' or 'sell'
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [amount, setAmount] = useState(0);
  const { yesLabel, noLabel } = useMarketLabels(market);
  const { username } = useAuth();
  const { userCredit } = useUserCredit(username);

  const yesPrice = Math.round(currentProbability * 100);
  const noPrice = 100 - yesPrice;

  const handleQuickAdd = (value) => {
    if (value === 'max') {
      setAmount(userCredit || 0);
    } else {
      setAmount((prev) => prev + value);
    }
  };

  const handleTrade = () => {
    if (!token) {
      alert('Please log in to trade.');
      return;
    }
    if (!selectedOutcome || amount < 1) {
      alert('Select an outcome and enter an amount.');
      return;
    }

    if (mode === 'buy') {
      submitBet(
        { marketId, amount, outcome: selectedOutcome },
        token,
        (data) => {
          alert(`Trade placed! ID: ${data.id}`);
          setAmount(0);
          setSelectedOutcome(null);
          onTransactionSuccess();
        },
        (error) => alert(`Trade failed: ${error.message}`)
      );
    }
    // Sell flow will be added in Task 2
  };

  const isResolved = market.isResolved;
  const isExpired = new Date(market.resolutionDateTime) <= new Date();
  const canTrade = isLoggedIn && !isResolved && !isExpired;

  return (
    <div className="bg-pm-card rounded-xl border border-pm-card-border p-5">
      {/* Buy/Sell toggle */}
      {canTrade && (
        <div className="flex mb-4">
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-l-lg transition-colors ${
              mode === 'buy'
                ? 'bg-white text-black'
                : 'bg-transparent text-pm-muted hover:text-white'
            }`}
            onClick={() => setMode('buy')}
          >
            Buy
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-r-lg transition-colors ${
              mode === 'sell'
                ? 'bg-white text-black'
                : 'bg-transparent text-pm-muted hover:text-white'
            }`}
            onClick={() => setMode('sell')}
          >
            Sell
          </button>
        </div>
      )}

      {/* Outcome buttons */}
      <div className="flex gap-3 mb-5">
        <button
          className={`flex-1 py-3 rounded-xl text-base font-bold transition-colors ${
            selectedOutcome === 'YES'
              ? 'bg-pm-yes text-white'
              : 'bg-pm-yes/15 text-pm-yes hover:bg-pm-yes/25'
          }`}
          onClick={() => canTrade && setSelectedOutcome('YES')}
          disabled={!canTrade}
        >
          {yesLabel} {yesPrice}c
        </button>
        <button
          className={`flex-1 py-3 rounded-xl text-base font-bold transition-colors ${
            selectedOutcome === 'NO'
              ? 'bg-pm-no text-white'
              : 'bg-pm-no/15 text-pm-no hover:bg-pm-no/25'
          }`}
          onClick={() => canTrade && setSelectedOutcome('NO')}
          disabled={!canTrade}
        >
          {noLabel} {noPrice}c
        </button>
      </div>

      {/* Amount section */}
      {canTrade && (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-pm-muted">Amount</span>
            <span className="text-2xl font-bold text-white">{amount}</span>
          </div>

          <div className="flex gap-2 mb-5">
            {[1, 5, 10, 100].map((val) => (
              <button
                key={val}
                className="flex-1 py-2 text-sm font-medium bg-pm-card-border rounded-lg text-white hover:bg-pm-hover transition-colors"
                onClick={() => handleQuickAdd(val)}
              >
                +{val}
              </button>
            ))}
            <button
              className="flex-1 py-2 text-sm font-medium bg-pm-card-border rounded-lg text-white hover:bg-pm-hover transition-colors"
              onClick={() => handleQuickAdd('max')}
            >
              Max
            </button>
          </div>

          <button
            className="w-full py-3 rounded-xl text-base font-bold bg-pm-yes text-white hover:bg-pm-yes/90 transition-colors disabled:opacity-50"
            onClick={handleTrade}
            disabled={!selectedOutcome || amount < 1}
          >
            Trade
          </button>
        </>
      )}

      {/* Logged out state */}
      {!isLoggedIn && !isResolved && (
        <p className="text-center text-pm-muted text-sm mt-2">Log in to trade</p>
      )}
    </div>
  );
};

export default TradeSidebar;
```

**Step 2: Verify the component renders without errors**

Run: `cd frontend && npm run build 2>&1 | head -20`
Expected: No build errors (component won't be mounted yet, just verifying imports resolve)

**Step 3: Commit**

```bash
git add frontend/src/components/trade/TradeSidebar.jsx
git commit -m "feat: add TradeSidebar component with buy flow"
```

---

### Task 2: Add Sell flow to TradeSidebar

**Files:**
- Modify: `frontend/src/components/trade/TradeSidebar.jsx`

**Step 1: Add sell flow using existing `fetchUserShares` and `submitSale`**

Add these imports at the top of `TradeSidebar.jsx`:

```jsx
import { submitBet, fetchUserShares, submitSale } from '../layouts/trade/TradeUtils';
```

Add state for shares after the existing state declarations:

```jsx
const [shares, setShares] = useState({ noSharesOwned: 0, yesSharesOwned: 0 });
```

Add a `useEffect` to fetch shares when sell mode is active (add `useEffect` to React import):

```jsx
import React, { useState, useEffect } from 'react';

// Inside the component, after state declarations:
useEffect(() => {
  if (mode === 'sell' && token) {
    fetchUserShares(marketId, token)
      .then((data) => {
        const sharesObj = Array.isArray(data)
          ? data[0] || { noSharesOwned: 0, yesSharesOwned: 0 }
          : data || { noSharesOwned: 0, yesSharesOwned: 0 };
        setShares(sharesObj);
      })
      .catch(() => setShares({ noSharesOwned: 0, yesSharesOwned: 0 }));
  }
}, [mode, marketId, token]);
```

Update the `handleTrade` function's sell branch:

```jsx
if (mode === 'sell') {
  submitSale(
    { marketId, amount, outcome: selectedOutcome },
    token,
    (data) => {
      alert(`Sale complete! ID: ${data.id}`);
      setAmount(0);
      setSelectedOutcome(null);
      onTransactionSuccess();
    },
    (error) => alert(`Sale failed: ${error.message}`)
  );
}
```

Update the "Max" button logic to be mode-aware:

```jsx
const handleQuickAdd = (value) => {
  if (value === 'max') {
    if (mode === 'sell') {
      const maxShares = selectedOutcome === 'YES' ? shares.yesSharesOwned : shares.noSharesOwned;
      setAmount(maxShares || 0);
    } else {
      setAmount(userCredit || 0);
    }
  } else {
    setAmount((prev) => prev + value);
  }
};
```

**Step 2: Verify build**

Run: `cd frontend && npm run build 2>&1 | head -20`
Expected: No build errors

**Step 3: Commit**

```bash
git add frontend/src/components/trade/TradeSidebar.jsx
git commit -m "feat: add sell flow to TradeSidebar"
```

---

### Task 3: Rewrite MarketDetailsLayout with two-column grid

Replace the single-column layout with a two-column CSS grid on desktop. Left column has all market content, right column has the sticky TradeSidebar.

**Files:**
- Modify: `frontend/src/components/marketDetails/MarketDetailsLayout.jsx`

**Step 1: Rewrite MarketDetailsLayout**

Replace the entire file contents:

```jsx
import React, { useState } from 'react';
import ResolutionAlert from '../resolutions/ResolutionAlert';
import MarketChart from '../charts/MarketChart';
import ActivityTabs from '../tabs/ActivityTabs';
import ResolveModalButton from '../modals/resolution/ResolveModal';
import TradeSidebar from '../trade/TradeSidebar';
import TradeCTA from '../TradeCTA';
import formatResolutionDate from '../../helpers/formatResolutionDate';
import { API_URL } from '../../config';

function MarketDetailsLayout({
  market,
  creator,
  numUsers,
  totalVolume,
  marketDust,
  currentProbability,
  probabilityChanges,
  marketId,
  username,
  isLoggedIn,
  token,
  refetchData,
}) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTransactionSuccess = () => {
    setShowTradeModal(false);
    if (refetchData) refetchData();
    setRefreshTrigger((prev) => prev + 1);
  };

  const shouldShowTradeButtons =
    !market.isResolved && isLoggedIn && new Date(market.resolutionDateTime) > new Date();

  const imageUrl = market.imageUrl
    ? `${API_URL}/v0/uploads/markets/${market.imageUrl}`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <ResolutionAlert
        isResolved={market.isResolved}
        resolutionResult={market.resolutionResult}
        market={market}
      />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-6">
        {/* Left column */}
        <div className="min-w-0">
          {/* Market header */}
          <div className="flex items-start gap-4 mb-6">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={market.questionTitle}
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">
                {market.questionTitle}
              </h1>
            </div>
          </div>

          {/* Probability display */}
          <div className="mb-2">
            <span className="text-3xl font-bold text-pm-yes">
              {Math.round(currentProbability * 100)}% chance
            </span>
          </div>

          {/* Chart */}
          <div className="mb-4">
            <MarketChart
              data={probabilityChanges}
              currentProbability={currentProbability}
              title=""
              className="w-full"
              closeDateTime={market.resolutionDateTime}
              yesLabel={market.yesLabel}
              noLabel={market.noLabel}
            />
          </div>

          {/* Inline stats */}
          <div className="flex items-center gap-4 text-sm text-pm-muted mb-6">
            <span>{Math.round(totalVolume)} Vol.</span>
            <span>|</span>
            <span>
              {market.isResolved
                ? 'Closed'
                : formatResolutionDate(market.resolutionDateTime)}
            </span>
          </div>

          {/* Resolve button (creator only) */}
          {username === market.creatorUsername && !market.isResolved && (
            <div className="mb-6">
              <ResolveModalButton
                marketId={marketId}
                token={token}
                market={market}
                disabled={!token}
                className="text-xs px-4 py-2"
              />
            </div>
          )}

          {/* Rules section */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white mb-2">Rules</h2>
            <p
              className={`text-sm text-gray-300 whitespace-pre-wrap break-words ${
                showFullDescription ? '' : 'line-clamp-3'
              }`}
            >
              {market.description}
            </p>
            {market.description && market.description.length > 200 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-sm text-blue-400 hover:text-blue-300 mt-1"
              >
                {showFullDescription ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {/* Activity tabs */}
          <div className="mb-4">
            <ActivityTabs
              marketId={marketId}
              market={market}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>

        {/* Right column - Trade sidebar (desktop only) */}
        <div className="hidden md:block">
          <div className="sticky top-6">
            <TradeSidebar
              market={market}
              marketId={marketId}
              currentProbability={currentProbability}
              token={token}
              isLoggedIn={isLoggedIn}
              onTransactionSuccess={handleTransactionSuccess}
            />
          </div>
        </div>
      </div>

      {/* Mobile floating CTA */}
      {shouldShowTradeButtons && (
        <TradeCTA onClick={() => setShowTradeModal(true)} disabled={!token} />
      )}

      {/* Mobile trade modal */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:hidden z-50">
          <div className="w-full bg-pm-card rounded-t-2xl p-5 pb-8 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Trade</h3>
              <button
                onClick={() => setShowTradeModal(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                x
              </button>
            </div>
            <TradeSidebar
              market={market}
              marketId={marketId}
              currentProbability={currentProbability}
              token={token}
              isLoggedIn={isLoggedIn}
              onTransactionSuccess={handleTransactionSuccess}
            />
          </div>
        </div>
      )}

      {/* Mobile spacer */}
      <div className="h-24 md:hidden" />
    </div>
  );
}

export default MarketDetailsLayout;
```

**Step 2: Verify build**

Run: `cd frontend && npm run build 2>&1 | head -20`
Expected: No build errors

**Step 3: Verify in browser**

Navigate to `http://localhost:5174/markets/4` and confirm:
- Two-column layout on desktop (left content, right trade sidebar)
- Trade sidebar is sticky on scroll
- Probability shows as "50% chance" in green
- Rules section with "Show more"
- Inline stats (volume + date)

**Step 4: Commit**

```bash
git add frontend/src/components/marketDetails/MarketDetailsLayout.jsx
git commit -m "feat: rewrite MarketDetailsLayout with two-column Polymarket grid"
```

---

### Task 4: Rework TradeCTA for mobile bottom-sheet trigger

Update the mobile floating CTA to just be a simple "Trade" button that triggers the modal in the parent.

**Files:**
- Modify: `frontend/src/components/TradeCTA.jsx`

**Step 1: Simplify TradeCTA**

Replace the entire file:

```jsx
import React from 'react';

export default function TradeCTA({ onClick, disabled }) {
  return (
    <div
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-pm-page/90 backdrop-blur p-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full py-3 rounded-xl text-base font-bold bg-pm-yes text-white hover:bg-pm-yes/90 transition-colors disabled:opacity-50"
      >
        Trade
      </button>
    </div>
  );
}
```

**Step 2: Verify in browser on mobile viewport**

Resize browser to mobile width. Confirm floating "Trade" button appears at bottom. Tap it to open the trade modal.

**Step 3: Commit**

```bash
git add frontend/src/components/TradeCTA.jsx
git commit -m "feat: simplify TradeCTA as mobile bottom-sheet trigger"
```

---

### Task 5: Restyle MarketChart for Polymarket look

Switch from step-area to line chart and clean up the header. Remove the "Probability Changes" title (probability is now shown above the chart).

**Files:**
- Modify: `frontend/src/components/charts/MarketChart.jsx`

**Step 1: Update chart type and styling**

In `MarketChart.jsx`, update the `generateChartData` function to use `'line'` instead of `'stepArea'`:

```jsx
// In generateChartData(), change type: 'stepArea' to type: 'line' for both data series
{
  type: 'line',
  name: yesLabel,
  showInLegend: false,
  color: showInverseProbability ? '#22c55e' : '#22c55e', // pm-yes green
  lineThickness: 2,
  markerSize: 0,
  dataPoints: generateDataPoints(data, false),
},
// And the NO series:
{
  type: 'line',
  name: noLabel,
  showInLegend: false,
  color: '#ef4444', // pm-no red
  lineThickness: 2,
  markerSize: 0,
  dataPoints: generateDataPoints(data, true),
}
```

Update the Y-axis to show percentages:

```jsx
axisY: {
  includeZero: true,
  minimum: 0,
  maximum: 1,
  labelFontColor: '#8b8fa3', // pm-muted
  suffix: '%',
  valueFormatString: '#0',
  labelFormatter: function(e) {
    return Math.round(e.value * 100) + '%';
  },
},
```

Update the X-axis label color:

```jsx
axisX: {
  valueFormatString: 'DD MMM YY',
  labelFontColor: '#8b8fa3', // pm-muted
},
```

The title prop is now passed as `""` from MarketDetailsLayout, so the `<h3>` will just be empty. Simplify the header to only show the toggle button when title is empty:

```jsx
return (
  <div className={`rounded-lg ${className} overflow-hidden`}>
    {(title || true) && (
      <div className="flex justify-end items-center mb-2">
        {title && <h3 className="text-lg font-medium flex-1">{title}</h3>}
        <button
          onClick={() => setShowInverseProbability(!showInverseProbability)}
          className={`px-3 py-1 text-sm rounded-lg transition-colors duration-200 ${
            showInverseProbability
              ? 'bg-pm-no hover:bg-pm-no/80 text-white'
              : 'bg-pm-card-border hover:bg-pm-hover text-gray-300'
          }`}
        >
          {showInverseProbability
            ? `Show ${yesLabel}`
            : `Show ${noLabel}`}
        </button>
      </div>
    )}
    <CanvasJSChart options={options} />
  </div>
);
```

**Step 2: Verify in browser**

Navigate to market detail page. Confirm chart shows as a smooth line (not step-area), Y-axis shows percentages, and the toggle button uses pm-* colors.

**Step 3: Commit**

```bash
git add frontend/src/components/charts/MarketChart.jsx
git commit -m "refactor: restyle MarketChart with line chart and pm colors"
```

---

### Task 6: Clean up removed components

Remove or mark as unused the old components that are now replaced by TradeSidebar.

**Files:**
- Delete: `frontend/src/components/modals/bet/BetModal.jsx`
- Delete: `frontend/src/components/tabs/TradeTabs.jsx`

Note: Keep `BuySharesLayout.jsx`, `SellSharesLayout.jsx`, `BetButtons.jsx`, and `TradeUtils.jsx` as they may still be imported elsewhere or useful. The key components being replaced are `BetModal` and `TradeTabs` which are no longer referenced.

**Step 1: Verify no remaining imports of removed components**

Run: `cd frontend && grep -r "BetModal\|BetModalButton" src/ --include="*.jsx" --include="*.js" -l`

If `MarketDetailsLayout.jsx` no longer imports them (confirmed in Task 3), delete them.

Run: `cd frontend && grep -r "TradeTabs" src/ --include="*.jsx" --include="*.js" -l`

If only `BetModal.jsx` imports `TradeTabs` and both are being removed, proceed.

**Step 2: Delete the files**

```bash
rm frontend/src/components/modals/bet/BetModal.jsx
rm frontend/src/components/tabs/TradeTabs.jsx
```

**Step 3: Verify build**

Run: `cd frontend && npm run build 2>&1 | head -20`
Expected: No build errors

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove BetModal and TradeTabs replaced by TradeSidebar"
```

---

### Task 7: End-to-end visual verification

No code changes. Verify everything works together.

**Step 1: Desktop verification**

Navigate to `http://localhost:5174/markets/4`. Confirm:
- [ ] Two-column layout: left content, right trade sidebar
- [ ] Market image + title at top
- [ ] Large green "XX% chance" probability display
- [ ] Line chart with pm-yes green color
- [ ] Inline stats (volume + close date) below chart
- [ ] "Rules" section with "Show more" truncation
- [ ] Activity tabs (Positions, Bets, Leaderboard, Comments)
- [ ] Trade sidebar: Buy/Sell toggle, Yes/No buttons with prices, quick-add amount buttons, Trade button
- [ ] Trade sidebar is sticky when scrolling
- [ ] Resolve button shows for market creator
- [ ] Resolved market: no trade controls, just prices

**Step 2: Mobile verification**

Resize to mobile viewport. Confirm:
- [ ] Single column layout
- [ ] No trade sidebar visible
- [ ] Floating "Trade" button at bottom
- [ ] Tapping Trade opens bottom-sheet modal with full trade UI
- [ ] Can close modal with X button

**Step 3: Trade flow verification**

- [ ] Select Yes/No outcome, add amount, click Trade
- [ ] Confirm bet is placed and data refreshes
- [ ] Switch to Sell tab, verify shares are shown
- [ ] Place a sell order, confirm it works

**Step 4: Commit (if any final tweaks needed)**

```bash
git add -A
git commit -m "fix: final tweaks from visual verification"
```
