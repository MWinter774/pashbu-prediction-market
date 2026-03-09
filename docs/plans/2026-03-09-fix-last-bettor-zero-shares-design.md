# Fix: Last bettor gets zero shares in DBPM position calculation

## Problem

When rounding causes total scaled payouts to exceed the market pool by 1+, `adjustForPositiveExcess` distributes reductions starting from the newest bets. The last bet always has zero divergence from the current probability, so its scaled payout is 0. Reducing 0 by 1 produces -1. `EnsureMinimumPayouts` then skips it because it checks `p != 0` (not `p <= 0`). The bettor ends up with 0 shares despite having placed a valid bet.

## Reproduction

Market 3 bets (oldest first):
1. admin: NO 10 (prob 0.25)
2. maorwinter: YES 5 (prob 0.40)
3. user: NO 10 (prob 0.2857)
4. user: NO 20 (prob 0.1818)
5. test: YES 10 (prob 0.3077)

Scaled payouts round to [7, 17, 3, 29, 0] = 56, but volume = 55. Excess = +1. `adjustForPositiveExcess` subtracts 1 from index 4 (newest), yielding [7, 17, 3, 29, -1]. `EnsureMinimumPayouts` skips index 4 because -1 != 0. `AggregateUserPayoutsDBPM` clamps negative to 0. Result: test has 0 shares.

## Changes

### 1. `adjustForPositiveExcess` — skip zero-payout bets

When distributing remainder reduction from newest to oldest, skip bets whose payout is already 0. Move to the next-newest bet instead. This prevents creating negative payouts.

### 2. `EnsureMinimumPayouts` — check `p <= 0` instead of `p != 0`

Safety net: catch both zero and negative payouts. One-character change from `!=` to `>`.

### 3. Tests

- Existing DBPM tests must still pass
- Add test reproducing this scenario: last bet with zero divergence + rounding excess targeting it

## Invariants preserved

- Pool conservation: total payouts == market volume
- Minimum guarantee: every bettor gets >= 1 share (if same-side donor with >1 exists)
- No negative payouts in the pipeline
