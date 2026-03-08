# Polymarket Bet Panel Redesign

## Overview

Restyle the TradeSidebar component to match Polymarket's bet panel UI. This is a pure frontend visual/UX change — no backend modifications needed.

## Reference

Polymarket bet panel features: Buy/Sell tabs with underline, Yes/No outcome buttons with cent prices, editable amount text input with inline balance display, quick-add increment buttons, and a blue submit button with dynamic text.

## Design

### Layout (top to bottom)

1. **Buy/Sell toggle** — left-aligned text tabs with underline on active tab (replacing current filled-button style)
2. **Outcome buttons** — two side-by-side buttons showing label + price in cents. Selected: filled bg (green YES / red NO). Unselected: subtle transparent bg. No changes from current.
3. **Amount section**:
   - Left: "Amount" label with "Balance: X" underneath in muted text
   - Right: editable text input, right-aligned, large font, integers only, no currency symbol
4. **Quick-add buttons** — row of +1, +5, +10, +100, Max. Increment behavior (add to current value).
5. **Submit button** — always pm-blue (#2d7cf6). Text: "Buy Yes" / "Buy No" / "Sell Yes" / "Sell No" based on mode + outcome. Disabled when no outcome selected or amount < 1.

### Changes Summary

| Element | Current | New |
|---|---|---|
| Buy/Sell toggle | Filled button style | Tab-style with underline |
| Amount display | Static text | Editable text input |
| Balance | Not shown | Shown below "Amount" label |
| Submit button color | Green (pm-yes) | Blue (pm-blue) always |
| Submit button text | "Trade" | "Buy Yes" / "Sell No" etc. |

### Scope

- Only file changed: `frontend/src/components/trade/TradeSidebar.jsx`
- No backend changes
- No new components
- No new dependencies
