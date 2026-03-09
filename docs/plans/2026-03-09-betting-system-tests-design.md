# Betting System Test Suite Design

## Goal

Comprehensive test coverage for the WPAM + DBPM betting system: math calculations, position lifecycle, selling mechanics, and market resolution. Pure unit tests using in-memory SQLite (existing `modelstesting` pattern), moderate scale (up to 20-30 bets per scenario).

## Decisions

- **Pure unit tests** — no external DB, uses `modelstesting.NewFakeDB` and `GenerateBet`/`GenerateMarket`/`GenerateUser` helpers
- **Table-driven tests** — following existing codebase conventions
- **One new file per package** — keeps tests discoverable next to production code
- **Shared invariant helpers** — reusable assertion functions for pool conservation, probability bounds, non-negative shares

## New Test Files

### 1. `handlers/math/outcomes/dbpm/marketshares_scenarios_test.go`

Multi-user DBPM scenarios exercising the full pipeline (divide shares, course payouts, normalization, scaling, adjustment, aggregation).

| Scenario | Description |
|---|---|
| 5 users alternating YES/NO | Interleaved bets from different users |
| All bets YES, resolve NO | Every bettor loses — zero-sum edge |
| All bets NO, resolve YES | Mirror of above |
| 20-bet sequence, 4 users | Moderate scale with buys and sells, rounding stability |
| Single user buys YES then sells | Net position after sell |
| Two users, one sells entirely | Seller should have 0 shares |

Invariant assertions on every test: pool conservation, non-negative shares, probability bounds.

### 2. `handlers/math/probabilities/wpam/wpam_scenarios_test.go`

Probability calculation edge cases.

| Scenario | Description |
|---|---|
| 20 alternating YES/NO bets | Oscillation within (0,1), convergence toward heavier side |
| 10 all-YES bets | Monotonically increasing, never exceeds 1 |
| 10 all-NO bets | Monotonically decreasing, never below 0 |
| Buy then sell sequence | Probability moves up then back down |
| Large bet then many small opposing | Big early bet doesn't permanently dominate |

Invariant assertions: probability in (0,1), count == bets+1, initial == 0.5.

### 3. `handlers/math/positions/positionsmath_scenarios_test.go`

End-to-end lifecycle through `CalculateMarketPositions_WPAM_DBPM` using fake DB.

| Scenario | Description |
|---|---|
| 3 users mixed, unresolved | Shares, value, TotalSpent consistency |
| 3 users, resolved YES | Winners get value, losers get 0 |
| 3 users, resolved NO | Mirror |
| Buy then sell, check position | Reduced shares and updated value |
| User sells entire position | 0 shares, still present in output |
| Sell then rebuy | Net state after sell + rebuy |
| 5 users, 15 bets with sells, resolved | Moderate complexity, pool conservation |

Assertions: pool conservation (resolved), all bettors present, TotalSpent correct, resolution fields propagated.

### 4. `handlers/bets/selling/sellposition_math_test.go`

Pure unit tests for `calculateSharesToSell` and `getSharesOwnedForOutcome`.

**`calculateSharesToSell` (8 scenarios):**
- Sell exact value of one share (0 dust)
- Sell credits worth 2.5 shares (2 shares, dust within cap)
- Sell more than position worth (caps at all shares)
- Dust exceeds cap → `ErrDustCapExceeded`
- Dust just under cap → success
- Dust exactly at cap → success
- Position value 0 → error
- Credits less than one share → error

**`getSharesOwnedForOutcome` (5 scenarios):**
- YES with YES shares → returns shares
- NO with NO shares → returns shares
- YES with 0 YES → error
- NO with 0 NO → error
- Invalid outcome → error

### 5. `handlers/math/testinvariants/invariants.go`

Shared assertion helpers (regular package, not `_test.go`):

- `AssertPoolConservation(t, bets, finalPayouts)` — sum of payouts == market volume
- `AssertNonNegativeShares(t, positions)` — all YES/NO shares >= 0
- `AssertProbabilityBounds(t, probabilities)` — all in (0, 1)
- `AssertAllBettorsPresent(t, bets, positions)` — every bettor appears in output

## Total: ~31 new test scenarios
