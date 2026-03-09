# Fix Last Bettor Zero Shares Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix a bug where the last bettor in a market gets 0 shares because `adjustForPositiveExcess` drives their payout negative and `EnsureMinimumPayouts` misses it.

**Architecture:** Two targeted fixes in `backend/handlers/math/outcomes/dbpm/marketshares.go`: (1) `adjustForPositiveExcess` skips zero-payout bets when distributing remainder reductions, (2) `EnsureMinimumPayouts` catches negative payouts too. Both changes preserve pool conservation.

**Tech Stack:** Go, existing DBPM test infrastructure in `marketshares_test.go` and `marketshares_scenarios_test.go`

---

### Task 1: Write failing test for `adjustForPositiveExcess` with zero-payout bet

**Files:**
- Modify: `backend/handlers/math/outcomes/dbpm/marketshares_test.go:469-503` (TestAdjustForPositiveExcess)

**Step 1: Add test case to TestAdjustForPositiveExcess**

Add a new test case at the end of the `testcases` slice in `TestAdjustForPositiveExcess` (after the "SmallExcess" case, before the closing `}`):

```go
{
    Name:           "ExcessWithZeroPayoutNewestBet",
    ScaledPayouts:  []int64{7, 17, 3, 29, 0},
    Excess:         1,
    ExpectedResult: []int64{7, 17, 3, 28, 0},
},
```

This reproduces the exact bug: the last bet has payout 0, and excess=1 should be taken from the next-newest non-zero bet (index 3), not from the zero-payout bet.

**Step 2: Run test to verify it fails**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test -run TestAdjustForPositiveExcess/ExcessWithZeroPayoutNewestBet ./handlers/math/outcomes/dbpm/ -v`

Expected: FAIL — current code produces `[7, 17, 3, 29, -1]` instead of `[7, 17, 3, 28, 0]`

**Step 3: Commit failing test**

```bash
git add backend/handlers/math/outcomes/dbpm/marketshares_test.go
git commit -m "test: add failing test for adjustForPositiveExcess with zero-payout bet"
```

---

### Task 2: Fix `adjustForPositiveExcess` to skip zero-payout bets

**Files:**
- Modify: `backend/handlers/math/outcomes/dbpm/marketshares.go:176-180`

**Step 1: Update the remainder reduction loop**

Replace the remainder loop in `adjustForPositiveExcess` (lines 176-180):

```go
	// Apply the remainder reduction to the newest bets
	for betIndex := int64(len(scaledPayouts)) - 1; remainderReduction > 0; betIndex-- {
		scaledPayouts[betIndex] -= 1
		remainderReduction--
	}
```

With:

```go
	// Apply the remainder reduction to the newest bets, skipping zero-payout bets
	for betIndex := int64(len(scaledPayouts)) - 1; remainderReduction > 0 && betIndex >= 0; betIndex-- {
		if scaledPayouts[betIndex] <= 0 {
			continue
		}
		scaledPayouts[betIndex] -= 1
		remainderReduction--
	}
```

**Step 2: Run the failing test to verify it passes**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test -run TestAdjustForPositiveExcess ./handlers/math/outcomes/dbpm/ -v`

Expected: All TestAdjustForPositiveExcess cases PASS

**Step 3: Run all DBPM tests to check for regressions**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./handlers/math/outcomes/dbpm/ -v`

Expected: All PASS

**Step 4: Commit**

```bash
git add backend/handlers/math/outcomes/dbpm/marketshares.go
git commit -m "fix: skip zero-payout bets in adjustForPositiveExcess remainder loop"
```

---

### Task 3: Write failing test for `EnsureMinimumPayouts` with negative payout

**Files:**
- Modify: `backend/handlers/math/outcomes/dbpm/marketshares_test.go:741-822` (TestEnsureMinimumPayouts)

**Step 1: Add test case to TestEnsureMinimumPayouts**

Add a new test case at the end of the `testcases` slice in `TestEnsureMinimumPayouts` (after the "SellBetZeroPayout" case):

```go
{
    Name: "NegativePayoutBumpedToOne",
    Bets: []models.Bet{
        modelstesting.GenerateBet(20, "NO", "one", 1, 0),
        modelstesting.GenerateBet(10, "YES", "two", 1, time.Minute),
        modelstesting.GenerateBet(10, "YES", "three", 1, 2*time.Minute),
    },
    Payouts:        []int64{20, 15, -1},
    ExpectedResult: []int64{20, 14, 1},
},
```

**Step 2: Run test to verify it fails**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test -run TestEnsureMinimumPayouts/NegativePayoutBumpedToOne ./handlers/math/outcomes/dbpm/ -v`

Expected: FAIL — current code skips -1 because `-1 != 0`, result is `[20, 15, -1]`

**Step 3: Commit failing test**

```bash
git add backend/handlers/math/outcomes/dbpm/marketshares_test.go
git commit -m "test: add failing test for EnsureMinimumPayouts with negative payout"
```

---

### Task 4: Fix `EnsureMinimumPayouts` to catch negative payouts

**Files:**
- Modify: `backend/handlers/math/outcomes/dbpm/marketshares.go:237-240`

**Step 1: Change the condition from `p != 0` to `p > 0`**

In `EnsureMinimumPayouts`, replace line 238:

```go
		if p != 0 {
```

With:

```go
		if p > 0 {
```

Also update the comment on line 236 from "zero-payout" to "zero-or-negative-payout":

```go
	// For each zero-or-negative-payout bet, bump to 1 and take from the largest payout on the same side
```

**Step 2: Run the failing test to verify it passes**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test -run TestEnsureMinimumPayouts ./handlers/math/outcomes/dbpm/ -v`

Expected: All TestEnsureMinimumPayouts cases PASS

**Step 3: Run all DBPM tests**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./handlers/math/outcomes/dbpm/ -v`

Expected: All PASS

**Step 4: Commit**

```bash
git add backend/handlers/math/outcomes/dbpm/marketshares.go
git commit -m "fix: catch negative payouts in EnsureMinimumPayouts safety net"
```

---

### Task 5: Add end-to-end scenario test reproducing the original bug

**Files:**
- Modify: `backend/handlers/math/outcomes/dbpm/marketshares_scenarios_test.go`

**Step 1: Add scenario to TestDBPMScenarios**

Add a new test case to the `tests` slice in `TestDBPMScenarios` that reproduces the exact market 3 scenario:

```go
{
    Name: "Last bet zero divergence with rounding excess",
    Bets: []models.Bet{
        modelstesting.GenerateBet(10, "NO", "admin", 1, 0),
        modelstesting.GenerateBet(5, "YES", "maorwinter", 1, time.Minute),
        modelstesting.GenerateBet(10, "NO", "user", 1, 2*time.Minute),
        modelstesting.GenerateBet(20, "NO", "user", 1, 3*time.Minute),
        modelstesting.GenerateBet(10, "YES", "test", 1, 4*time.Minute),
    },
    ExpectedPositions: map[string]struct{ Yes, No int64 }{
        "admin":      {Yes: 0, No: 7},
        "maorwinter": {Yes: 16, No: 0},
        "user":       {Yes: 0, No: 31},
        "test":       {Yes: 1, No: 0},
    },
},
```

Note: `test` must have at least 1 YES share (not 0). `maorwinter` donates 1 share (17→16), and `user` gets 31 (from the adjusted excess going to index 3 instead of index 4: 29→28, then 3+28=31).

**Step 2: Run the scenario test**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test -run "TestDBPMScenarios/Last_bet_zero_divergence" ./handlers/math/outcomes/dbpm/ -v`

Expected: PASS with pool conservation, non-negative shares, and correct positions

**Step 3: Run full test suite**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./... -v 2>&1 | tail -30`

Expected: All PASS

**Step 4: Commit**

```bash
git add backend/handlers/math/outcomes/dbpm/marketshares_scenarios_test.go
git commit -m "test: add scenario test for last bettor zero divergence with rounding excess"
```
