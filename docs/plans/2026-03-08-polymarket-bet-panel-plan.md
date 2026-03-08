# Polymarket Bet Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restyle TradeSidebar to match Polymarket's bet panel UI — tab-style Buy/Sell toggle, editable amount input with inline balance, always-blue submit button with dynamic text.

**Architecture:** Single-file frontend change to `TradeSidebar.jsx`. No backend changes, no new components, no new dependencies. All changes are visual/UX within existing React state and data.

**Tech Stack:** React 18, Tailwind CSS (pm-* color tokens already defined in tailwind.config.js)

---

### Task 1: Restyle Buy/Sell toggle to tab-style with underline

**Files:**
- Modify: `frontend/src/components/trade/TradeSidebar.jsx:104-125`

**Step 1: Replace the Buy/Sell toggle markup**

Replace lines 104-125 (the `<div className="flex mb-4">` block) with:

```jsx
        <div className="flex gap-6 mb-4 border-b border-pm-card-border">
          <button
            className={`pb-2 text-sm font-semibold transition-colors ${
              mode === 'buy'
                ? 'text-white border-b-2 border-white'
                : 'text-pm-muted hover:text-white'
            }`}
            onClick={() => setMode('buy')}
          >
            Buy
          </button>
          <button
            className={`pb-2 text-sm font-semibold transition-colors ${
              mode === 'sell'
                ? 'text-white border-b-2 border-white'
                : 'text-pm-muted hover:text-white'
            }`}
            onClick={() => setMode('sell')}
          >
            Sell
          </button>
        </div>
```

Key changes:
- `flex gap-6` instead of `flex-1` — buttons are left-aligned, not stretched
- `border-b border-pm-card-border` on container — subtle separator line
- Active state: `border-b-2 border-white text-white` — underline instead of filled background
- Inactive state: `text-pm-muted` — no background, just muted text
- Removed `rounded-l-lg` / `rounded-r-lg` — tabs don't need rounded corners

**Step 2: Verify visually**

Run: `cd frontend && npm run start`

Open a market details page. Confirm:
- Buy/Sell are left-aligned text tabs
- Active tab has a white underline
- Inactive tab is muted gray
- Clicking toggles correctly

**Step 3: Commit**

```bash
git add frontend/src/components/trade/TradeSidebar.jsx
git commit -m "feat: restyle Buy/Sell toggle to tab-style with underline"
```

---

### Task 2: Replace static amount display with editable text input and inline balance

**Files:**
- Modify: `frontend/src/components/trade/TradeSidebar.jsx:155-160`

**Step 1: Add handleAmountChange function**

Add this function after `handleQuickAdd` (after line 55):

```jsx
  const handleAmountChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setAmount(0);
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setAmount(parsed);
    }
  };
```

**Step 2: Move amountRef from quick-add button to the text input**

The `amountRef` is currently assigned to the first quick-add button (line 166: `ref={idx === 0 ? amountRef : undefined}`). Remove that ref assignment from the quick-add button — it will be placed on the new input instead.

In the quick-add buttons map (around line 163-172), change:

```jsx
            {[1, 5, 10, 100].map((val, idx) => (
              <button
                key={val}
                ref={idx === 0 ? amountRef : undefined}
```

To:

```jsx
            {[1, 5, 10, 100].map((val) => (
              <button
                key={val}
```

**Step 3: Replace the amount display section**

Replace lines 157-160 (the `<div className="flex items-center justify-between mb-3">` block) with:

```jsx
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-pm-muted">Amount</span>
                <div className="text-xs text-pm-muted">
                  Balance {mode === 'sell'
                    ? (selectedOutcome === 'YES' ? shares.yesSharesOwned : selectedOutcome === 'NO' ? shares.noSharesOwned : 0)
                    : (userCredit || 0)}
                </div>
              </div>
              <input
                ref={amountRef}
                type="text"
                inputMode="numeric"
                value={amount === 0 ? '' : amount}
                onChange={handleAmountChange}
                placeholder="0"
                className="text-2xl font-bold text-right bg-transparent text-white outline-none w-24 placeholder-pm-muted"
              />
            </div>
          </div>
```

Key details:
- `type="text"` with `inputMode="numeric"` — shows number keyboard on mobile, allows full control over input parsing
- `value={amount === 0 ? '' : amount}` — shows placeholder "0" when empty instead of literal 0
- `handleAmountChange` — parses integers only, rejects non-numeric input
- Balance shows `userCredit` in buy mode, owned shares in sell mode
- `amountRef` on the input for auto-focus when arriving from MarketCard with `?side=` param

**Step 4: Verify visually**

Run dev server, open market details:
- Amount field is a typeable input, right-aligned, large font
- Typing "abc" does nothing, typing "42" shows 42
- Balance shows below "Amount" label
- Clicking +10 when input shows 5 results in 15
- Max button sets to user's balance (buy) or shares (sell)
- Auto-focus works when navigating with `?side=yes`

**Step 5: Commit**

```bash
git add frontend/src/components/trade/TradeSidebar.jsx
git commit -m "feat: replace static amount with editable input and inline balance"
```

---

### Task 3: Restyle submit button — always blue with dynamic text

**Files:**
- Modify: `frontend/src/components/trade/TradeSidebar.jsx:181-187`

**Step 1: Add dynamic button text logic**

Add this computed value before the `return` statement (after the `canTrade` line, around line 98):

```jsx
  const outcomeLabel = selectedOutcome === 'YES' ? yesLabel : selectedOutcome === 'NO' ? noLabel : '';
  const buttonText = selectedOutcome
    ? `${mode === 'buy' ? 'Buy' : 'Sell'} ${outcomeLabel}`
    : mode === 'buy' ? 'Buy' : 'Sell';
```

**Step 2: Replace the submit button**

Replace lines 181-187 (the submit `<button>` element) with:

```jsx
          <button
            className="w-full py-3 rounded-xl text-base font-bold bg-pm-blue text-white hover:bg-pm-blue-hover transition-colors disabled:opacity-50"
            onClick={handleTrade}
            disabled={!selectedOutcome || amount < 1}
          >
            {buttonText}
          </button>
```

Key changes:
- `bg-pm-blue` instead of `bg-pm-yes` — always blue
- `hover:bg-pm-blue-hover` — uses the hover variant defined in tailwind.config.js
- `{buttonText}` — shows "Buy Yes" / "Buy No" / "Sell Yes" / "Sell No" / "Buy" / "Sell"

**Step 3: Verify visually**

- No outcome selected → button says "Buy" (disabled)
- Select Yes → button says "Buy Yes" (blue)
- Select No → button says "Buy No" (blue)
- Switch to Sell mode, select Yes → "Sell Yes" (blue)
- Button is always blue regardless of outcome
- Custom labels work (if market has custom yes/no labels)

**Step 4: Commit**

```bash
git add frontend/src/components/trade/TradeSidebar.jsx
git commit -m "feat: restyle submit button to always-blue with dynamic text"
```

---

### Task 4: Final visual review and cleanup

**Step 1: Full visual walkthrough**

Run dev server and test the complete flow:
1. Navigate to a market details page — panel renders correctly
2. Buy/Sell tabs toggle with underline style
3. Yes/No outcome buttons highlight correctly
4. Amount input: type a number, use quick-add buttons, use Max
5. Balance displays correctly for buy (credit) and sell (shares)
6. Submit button: always blue, text changes with mode + outcome
7. Mobile view: bottom sheet modal works correctly
8. Place a test trade (if dev environment running) — confirm trade succeeds and panel resets

**Step 2: Commit if any cleanup needed**

```bash
git add frontend/src/components/trade/TradeSidebar.jsx
git commit -m "fix: polish bet panel styling after visual review"
```
