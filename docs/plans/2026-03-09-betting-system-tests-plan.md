# Betting System Test Suite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Comprehensive test coverage for the WPAM + DBPM betting system — math calculations, position lifecycle, selling mechanics, and pool conservation invariants.

**Architecture:** New test files alongside existing ones in each package. Shared invariant assertion helpers in a dedicated `testinvariants` package. All tests are pure unit tests using in-memory SQLite via `modelstesting.NewFakeDB`. Table-driven tests following existing codebase conventions.

**Tech Stack:** Go testing, `modelstesting` helpers (`GenerateBet`, `GenerateMarket`, `GenerateUser`, `NewFakeDB`, `UseStandardTestEconomics`, `GenerateEconomicConfig`), SQLite in-memory DB via GORM.

---

### Task 1: Shared Invariant Helpers

**Files:**
- Create: `backend/handlers/math/testinvariants/invariants.go`

**Step 1: Write the invariant helpers**

```go
package testinvariants

import (
	"socialpredict/handlers/math/outcomes/dbpm"
	"socialpredict/handlers/math/probabilities/wpam"
	"socialpredict/models"
	"testing"
)

// AssertPoolConservation checks that sum(finalPayouts) == sum of all positive bet amounts (market volume).
func AssertPoolConservation(t *testing.T, bets []models.Bet, finalPayouts []int64) {
	t.Helper()
	var volume int64
	for _, b := range bets {
		volume += b.Amount
	}
	var payoutSum int64
	for _, p := range finalPayouts {
		payoutSum += p
	}
	if payoutSum != volume {
		t.Errorf("pool conservation violated: payoutSum=%d, marketVolume=%d", payoutSum, volume)
	}
}

// AssertNonNegativeShares checks that every user's YES and NO shares are >= 0.
func AssertNonNegativeShares(t *testing.T, positions []dbpm.DBPMMarketPosition) {
	t.Helper()
	for _, p := range positions {
		if p.YesSharesOwned < 0 {
			t.Errorf("user %s has negative YES shares: %d", p.Username, p.YesSharesOwned)
		}
		if p.NoSharesOwned < 0 {
			t.Errorf("user %s has negative NO shares: %d", p.Username, p.NoSharesOwned)
		}
	}
}

// AssertProbabilityBounds checks that all probabilities are in the exclusive range (0, 1).
func AssertProbabilityBounds(t *testing.T, probabilities []wpam.ProbabilityChange) {
	t.Helper()
	for i, pc := range probabilities {
		if pc.Probability <= 0 || pc.Probability >= 1 {
			t.Errorf("probability[%d] out of bounds (0,1): %.17f", i, pc.Probability)
		}
	}
}

// AssertAllBettorsPresent checks that every unique username in bets appears in positions.
func AssertAllBettorsPresent(t *testing.T, bets []models.Bet, usernames []string) {
	t.Helper()
	bettorSet := make(map[string]bool)
	for _, b := range bets {
		bettorSet[b.Username] = true
	}
	presentSet := make(map[string]bool)
	for _, u := range usernames {
		presentSet[u] = true
	}
	for bettor := range bettorSet {
		if !presentSet[bettor] {
			t.Errorf("bettor %q placed bets but is missing from positions", bettor)
		}
	}
}
```

**Step 2: Verify it compiles**

Run: `cd backend && go build ./handlers/math/testinvariants/...`
Expected: no errors

**Step 3: Commit**

```bash
git add backend/handlers/math/testinvariants/invariants.go
git commit -m "test: add shared invariant assertion helpers for betting system tests"
```

---

### Task 2: DBPM Multi-User Scenarios

**Files:**
- Create: `backend/handlers/math/outcomes/dbpm/marketshares_scenarios_test.go`
- Reference: `backend/handlers/math/outcomes/dbpm/marketshares.go` (all exported functions)
- Reference: `backend/models/modelstesting/testhelpers.go` (`GenerateBet`, `GenerateProbability`)
- Reference: `backend/handlers/math/testinvariants/invariants.go`

**Step 1: Write the scenario tests**

This file tests the full DBPM pipeline (DivideUpMarketPoolSharesDBPM → CalculateCoursePayoutsDBPM → CalculateNormalizationFactorsDBPM → CalculateScaledPayoutsDBPM → AdjustPayouts → EnsureMinimumPayouts → AggregateUserPayoutsDBPM → NetAggregateMarketPositions) with complex multi-user scenarios.

```go
package dbpm

import (
	"socialpredict/handlers/math/probabilities/wpam"
	"socialpredict/handlers/math/testinvariants"
	"socialpredict/models"
	"socialpredict/models/modelstesting"
	"testing"
	"time"
)

// runFullDBPMPipeline runs all DBPM steps and returns net positions and final payouts.
// This is a test-only helper that chains the functions in the same order as
// CalculateMarketPositions_WPAM_DBPM in positionsmath.go.
func runFullDBPMPipeline(bets []models.Bet, probChanges []wpam.ProbabilityChange) ([]DBPMMarketPosition, []int64) {
	sYes, sNo := DivideUpMarketPoolSharesDBPM(bets, probChanges)
	coursePayouts := CalculateCoursePayoutsDBPM(bets, probChanges)
	fYes, fNo := CalculateNormalizationFactorsDBPM(sYes, sNo, coursePayouts)
	scaledPayouts := CalculateScaledPayoutsDBPM(bets, coursePayouts, fYes, fNo)
	adjusted := AdjustPayouts(bets, scaledPayouts)
	final := EnsureMinimumPayouts(bets, adjusted)
	aggregated := AggregateUserPayoutsDBPM(bets, final)
	net := NetAggregateMarketPositions(aggregated)
	return net, final
}

func TestDBPMScenarios(t *testing.T) {
	tests := []struct {
		Name string
		Bets []models.Bet
		// We compute probabilities from WPAM so they're consistent.
		// Checks are on invariants + specific share expectations.
		ExpectedPositions map[string]struct{ Yes, No int64 } // nil means just check invariants
	}{
		{
			Name: "5 users alternating YES and NO",
			Bets: []models.Bet{
				modelstesting.GenerateBet(10, "YES", "alice", 1, 0),
				modelstesting.GenerateBet(10, "NO", "bob", 1, time.Minute),
				modelstesting.GenerateBet(15, "YES", "charlie", 1, 2*time.Minute),
				modelstesting.GenerateBet(10, "NO", "diana", 1, 3*time.Minute),
				modelstesting.GenerateBet(5, "YES", "eve", 1, 4*time.Minute),
			},
		},
		{
			Name: "All bets on YES side",
			Bets: []models.Bet{
				modelstesting.GenerateBet(20, "YES", "alice", 1, 0),
				modelstesting.GenerateBet(15, "YES", "bob", 1, time.Minute),
				modelstesting.GenerateBet(10, "YES", "charlie", 1, 2*time.Minute),
			},
		},
		{
			Name: "All bets on NO side",
			Bets: []models.Bet{
				modelstesting.GenerateBet(20, "NO", "alice", 1, 0),
				modelstesting.GenerateBet(15, "NO", "bob", 1, time.Minute),
				modelstesting.GenerateBet(10, "NO", "charlie", 1, 2*time.Minute),
			},
		},
		{
			Name: "20 bets from 4 users with sells",
			Bets: func() []models.Bet {
				bets := []models.Bet{
					modelstesting.GenerateBet(10, "YES", "alice", 1, 0),
					modelstesting.GenerateBet(15, "NO", "bob", 1, time.Minute),
					modelstesting.GenerateBet(20, "YES", "charlie", 1, 2*time.Minute),
					modelstesting.GenerateBet(5, "NO", "diana", 1, 3*time.Minute),
					modelstesting.GenerateBet(10, "YES", "alice", 1, 4*time.Minute),
					modelstesting.GenerateBet(-5, "NO", "bob", 1, 5*time.Minute),
					modelstesting.GenerateBet(10, "NO", "diana", 1, 6*time.Minute),
					modelstesting.GenerateBet(15, "YES", "bob", 1, 7*time.Minute),
					modelstesting.GenerateBet(-10, "YES", "charlie", 1, 8*time.Minute),
					modelstesting.GenerateBet(5, "YES", "diana", 1, 9*time.Minute),
					modelstesting.GenerateBet(10, "NO", "alice", 1, 10*time.Minute),
					modelstesting.GenerateBet(5, "YES", "charlie", 1, 11*time.Minute),
					modelstesting.GenerateBet(-5, "YES", "alice", 1, 12*time.Minute),
					modelstesting.GenerateBet(10, "NO", "bob", 1, 13*time.Minute),
					modelstesting.GenerateBet(5, "YES", "diana", 1, 14*time.Minute),
					modelstesting.GenerateBet(10, "NO", "charlie", 1, 15*time.Minute),
					modelstesting.GenerateBet(-5, "NO", "diana", 1, 16*time.Minute),
					modelstesting.GenerateBet(10, "YES", "alice", 1, 17*time.Minute),
					modelstesting.GenerateBet(5, "NO", "bob", 1, 18*time.Minute),
					modelstesting.GenerateBet(10, "YES", "charlie", 1, 19*time.Minute),
				}
				return bets
			}(),
		},
		{
			Name: "User buys YES then sells YES",
			Bets: []models.Bet{
				modelstesting.GenerateBet(30, "YES", "alice", 1, 0),
				modelstesting.GenerateBet(10, "NO", "bob", 1, time.Minute),
				modelstesting.GenerateBet(-15, "YES", "alice", 1, 2*time.Minute),
			},
		},
		{
			Name: "Two users one sells entire position",
			Bets: []models.Bet{
				modelstesting.GenerateBet(20, "YES", "alice", 1, 0),
				modelstesting.GenerateBet(20, "NO", "bob", 1, time.Minute),
				modelstesting.GenerateBet(-20, "YES", "alice", 1, 2*time.Minute),
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.Name, func(t *testing.T) {
			// Compute WPAM probabilities for consistency
			probChanges := wpam.CalculateMarketProbabilitiesWPAM(time.Now(), tc.Bets)

			positions, finalPayouts := runFullDBPMPipeline(tc.Bets, probChanges)

			// Invariant: pool conservation
			testinvariants.AssertPoolConservation(t, tc.Bets, finalPayouts)

			// Invariant: non-negative shares
			testinvariants.AssertNonNegativeShares(t, positions)

			// Invariant: probability bounds
			testinvariants.AssertProbabilityBounds(t, probChanges)

			// Check specific expected positions if provided
			if tc.ExpectedPositions != nil {
				posMap := make(map[string]DBPMMarketPosition)
				for _, p := range positions {
					posMap[p.Username] = p
				}
				for username, expected := range tc.ExpectedPositions {
					actual, ok := posMap[username]
					if !ok {
						t.Errorf("expected position for %s but not found", username)
						continue
					}
					if actual.YesSharesOwned != expected.Yes || actual.NoSharesOwned != expected.No {
						t.Errorf("user %s: expected YES=%d NO=%d, got YES=%d NO=%d",
							username, expected.Yes, expected.No, actual.YesSharesOwned, actual.NoSharesOwned)
					}
				}
			}

			// Log positions for debugging
			for _, p := range positions {
				t.Logf("user=%s YES=%d NO=%d", p.Username, p.YesSharesOwned, p.NoSharesOwned)
			}
		})
	}
}
```

**Step 2: Run the tests**

Run: `cd backend && go test -v ./handlers/math/outcomes/dbpm/... -run TestDBPMScenarios`
Expected: all PASS, all invariants hold

**Step 3: Commit**

```bash
git add backend/handlers/math/outcomes/dbpm/marketshares_scenarios_test.go
git commit -m "test: add multi-user DBPM scenario tests with pool conservation invariants"
```

---

### Task 3: WPAM Probability Edge Cases

**Files:**
- Create: `backend/handlers/math/probabilities/wpam/wpam_scenarios_test.go`
- Reference: `backend/handlers/math/probabilities/wpam/wpam_marketprobabilities.go:32-56` (`CalculateMarketProbabilitiesWPAM`)
- Reference: `backend/handlers/math/testinvariants/invariants.go`

**Step 1: Write the scenario tests**

```go
package wpam_test

import (
	"socialpredict/handlers/math/probabilities/wpam"
	"socialpredict/handlers/math/testinvariants"
	"socialpredict/models"
	"socialpredict/models/modelstesting"
	"testing"
	"time"
)

func TestWPAMScenarios(t *testing.T) {
	_ = modelstesting.GenerateEconomicConfig() // ensure config loaded

	tests := []struct {
		Name   string
		Bets   []models.Bet
		Checks func(t *testing.T, probs []wpam.ProbabilityChange)
	}{
		{
			Name: "20 alternating YES/NO bets",
			Bets: func() []models.Bet {
				var bets []models.Bet
				for i := 0; i < 20; i++ {
					outcome := "YES"
					if i%2 == 1 {
						outcome = "NO"
					}
					bets = append(bets, modelstesting.GenerateBet(5, outcome, "user", 1, time.Duration(i)*time.Minute))
				}
				return bets
			}(),
			Checks: func(t *testing.T, probs []wpam.ProbabilityChange) {
				// Should have 21 entries (initial + 20 bets)
				if len(probs) != 21 {
					t.Errorf("expected 21 probability changes, got %d", len(probs))
				}
				testinvariants.AssertProbabilityBounds(t, probs)
			},
		},
		{
			Name: "10 all-YES bets monotonically increase",
			Bets: func() []models.Bet {
				var bets []models.Bet
				for i := 0; i < 10; i++ {
					bets = append(bets, modelstesting.GenerateBet(10, "YES", "user", 1, time.Duration(i)*time.Minute))
				}
				return bets
			}(),
			Checks: func(t *testing.T, probs []wpam.ProbabilityChange) {
				if len(probs) != 11 {
					t.Errorf("expected 11 probability changes, got %d", len(probs))
				}
				testinvariants.AssertProbabilityBounds(t, probs)
				// Check monotonically increasing (non-strict since initial is 0.5)
				for i := 1; i < len(probs); i++ {
					if probs[i].Probability < probs[i-1].Probability {
						t.Errorf("probability decreased at index %d: %.6f -> %.6f",
							i, probs[i-1].Probability, probs[i].Probability)
					}
				}
			},
		},
		{
			Name: "10 all-NO bets monotonically decrease",
			Bets: func() []models.Bet {
				var bets []models.Bet
				for i := 0; i < 10; i++ {
					bets = append(bets, modelstesting.GenerateBet(10, "NO", "user", 1, time.Duration(i)*time.Minute))
				}
				return bets
			}(),
			Checks: func(t *testing.T, probs []wpam.ProbabilityChange) {
				if len(probs) != 11 {
					t.Errorf("expected 11 probability changes, got %d", len(probs))
				}
				testinvariants.AssertProbabilityBounds(t, probs)
				// Check monotonically decreasing
				for i := 1; i < len(probs); i++ {
					if probs[i].Probability > probs[i-1].Probability {
						t.Errorf("probability increased at index %d: %.6f -> %.6f",
							i, probs[i-1].Probability, probs[i].Probability)
					}
				}
			},
		},
		{
			Name: "Buy YES then sell YES - probability goes up then down",
			Bets: []models.Bet{
				modelstesting.GenerateBet(30, "YES", "alice", 1, 0),
				modelstesting.GenerateBet(-15, "YES", "alice", 1, time.Minute),
			},
			Checks: func(t *testing.T, probs []wpam.ProbabilityChange) {
				if len(probs) != 3 {
					t.Fatalf("expected 3 probability changes, got %d", len(probs))
				}
				testinvariants.AssertProbabilityBounds(t, probs)
				// After YES buy, prob should increase
				if probs[1].Probability <= probs[0].Probability {
					t.Errorf("probability should increase after YES buy: %.6f -> %.6f",
						probs[0].Probability, probs[1].Probability)
				}
				// After YES sell, prob should decrease
				if probs[2].Probability >= probs[1].Probability {
					t.Errorf("probability should decrease after YES sell: %.6f -> %.6f",
						probs[1].Probability, probs[2].Probability)
				}
			},
		},
		{
			Name: "Large bet then many small opposing",
			Bets: func() []models.Bet {
				bets := []models.Bet{
					modelstesting.GenerateBet(100, "YES", "whale", 1, 0),
				}
				for i := 1; i <= 15; i++ {
					bets = append(bets, modelstesting.GenerateBet(5, "NO", "small", 1, time.Duration(i)*time.Minute))
				}
				return bets
			}(),
			Checks: func(t *testing.T, probs []wpam.ProbabilityChange) {
				if len(probs) != 17 {
					t.Errorf("expected 17 probability changes, got %d", len(probs))
				}
				testinvariants.AssertProbabilityBounds(t, probs)
				// After the big YES bet, prob should be high
				if probs[1].Probability <= 0.7 {
					t.Errorf("expected high probability after large YES bet, got %.6f", probs[1].Probability)
				}
				// After 15 small NO bets, probability should have decreased but still > 0.5
				// (100 YES vs 75 NO total)
				final := probs[len(probs)-1].Probability
				if final <= 0.5 {
					t.Errorf("expected final probability > 0.5 (YES volume dominates), got %.6f", final)
				}
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.Name, func(t *testing.T) {
			probs := wpam.CalculateMarketProbabilitiesWPAM(time.Now(), tc.Bets)
			tc.Checks(t, probs)

			// Log all probabilities for debugging
			for i, p := range probs {
				t.Logf("prob[%d] = %.6f", i, p.Probability)
			}
		})
	}
}
```

**Step 2: Run the tests**

Run: `cd backend && go test -v ./handlers/math/probabilities/wpam/... -run TestWPAMScenarios`
Expected: all PASS

**Step 3: Commit**

```bash
git add backend/handlers/math/probabilities/wpam/wpam_scenarios_test.go
git commit -m "test: add WPAM probability scenario tests with bounds and monotonicity checks"
```

---

### Task 4: Position Lifecycle Scenarios

**Files:**
- Create: `backend/handlers/math/positions/positionsmath_scenarios_test.go`
- Reference: `backend/handlers/math/positions/positionsmath.go:40-180` (`CalculateMarketPositions_WPAM_DBPM`)
- Reference: `backend/models/modelstesting/modelstesting.go` (`NewFakeDB`)
- Reference: `backend/models/modelstesting/testhelpers.go` (`GenerateMarket`, `GenerateUser`, `GenerateBet`)

These tests exercise the full pipeline end-to-end through the DB-backed `CalculateMarketPositions_WPAM_DBPM`.

**Step 1: Write the scenario tests**

```go
package positionsmath

import (
	"socialpredict/models"
	"socialpredict/models/modelstesting"
	"strconv"
	"testing"
	"time"
)

// setupMarketWithBets creates a market and its bets in the fake DB.
// Returns the market and its ID as string.
func setupMarketWithBets(t *testing.T, bets []struct {
	Amount   int64
	Outcome  string
	Username string
	Offset   time.Duration
}, isResolved bool, resolutionResult string) (string, func()) {
	t.Helper()
	db := modelstesting.NewFakeDB(t)
	_, _ = modelstesting.UseStandardTestEconomics(t)

	creator := modelstesting.GenerateUser("creator", 0)
	if err := db.Create(&creator).Error; err != nil {
		t.Fatalf("failed to create creator: %v", err)
	}

	market := modelstesting.GenerateMarket(1, creator.Username)
	market.IsResolved = isResolved
	market.ResolutionResult = resolutionResult
	if err := db.Create(&market).Error; err != nil {
		t.Fatalf("failed to create market: %v", err)
	}

	// Create unique users
	usersSeen := make(map[string]bool)
	for _, b := range bets {
		if !usersSeen[b.Username] && b.Username != creator.Username {
			user := modelstesting.GenerateUser(b.Username, 0)
			if err := db.Create(&user).Error; err != nil {
				t.Fatalf("failed to create user %s: %v", b.Username, err)
			}
			usersSeen[b.Username] = true
		}
	}

	for _, b := range bets {
		bet := modelstesting.GenerateBet(b.Amount, b.Outcome, b.Username, uint(market.ID), b.Offset)
		if err := db.Create(&bet).Error; err != nil {
			t.Fatalf("failed to create bet: %v", err)
		}
	}

	marketIDStr := strconv.Itoa(int(market.ID))

	// Return a function that calculates positions (captures db)
	calcPositions := func() ([]MarketPosition, error) {
		return CalculateMarketPositions_WPAM_DBPM(db, marketIDStr)
	}

	// We can't return calcPositions directly since the signature varies.
	// Instead, store db in a package-level var? No — just inline the tests.
	// Actually, let's return the db reference via closure.
	_ = calcPositions
	return marketIDStr, nil
}

func TestPositionLifecycleScenarios(t *testing.T) {
	tests := []struct {
		Name             string
		Bets             []struct {
			Amount   int64
			Outcome  string
			Username string
			Offset   time.Duration
		}
		IsResolved       bool
		ResolutionResult string
		Checks           func(t *testing.T, positions []MarketPosition)
	}{
		{
			Name: "3 users mixed bets unresolved",
			Bets: []struct {
				Amount   int64
				Outcome  string
				Username string
				Offset   time.Duration
			}{
				{20, "YES", "alice", 0},
				{15, "NO", "bob", time.Minute},
				{10, "YES", "charlie", 2 * time.Minute},
			},
			IsResolved:       false,
			ResolutionResult: "",
			Checks: func(t *testing.T, positions []MarketPosition) {
				if len(positions) < 3 {
					t.Fatalf("expected at least 3 positions, got %d", len(positions))
				}
				var totalValue int64
				for _, p := range positions {
					totalValue += p.Value
					if p.YesSharesOwned < 0 || p.NoSharesOwned < 0 {
						t.Errorf("user %s has negative shares", p.Username)
					}
				}
				// For unresolved markets, total value should equal market volume
				if totalValue != 45 { // 20+15+10
					t.Errorf("expected total value 45, got %d", totalValue)
				}
			},
		},
		{
			Name: "3 users resolved YES",
			Bets: []struct {
				Amount   int64
				Outcome  string
				Username string
				Offset   time.Duration
			}{
				{20, "YES", "alice", 0},
				{15, "NO", "bob", time.Minute},
				{10, "YES", "charlie", 2 * time.Minute},
			},
			IsResolved:       true,
			ResolutionResult: "YES",
			Checks: func(t *testing.T, positions []MarketPosition) {
				posMap := make(map[string]MarketPosition)
				for _, p := range positions {
					posMap[p.Username] = p
				}
				// Bob bet NO and lost — should have 0 value
				if posMap["bob"].Value != 0 {
					t.Errorf("bob (NO bettor) should have 0 value when YES wins, got %d", posMap["bob"].Value)
				}
				// YES bettors should have positive value
				if posMap["alice"].Value <= 0 {
					t.Errorf("alice (YES bettor) should have positive value, got %d", posMap["alice"].Value)
				}
				// Total value should equal market volume
				var totalValue int64
				for _, p := range positions {
					totalValue += p.Value
				}
				if totalValue != 45 {
					t.Errorf("expected total value 45, got %d", totalValue)
				}
				// IsResolved should be propagated
				for _, p := range positions {
					if !p.IsResolved {
						t.Errorf("expected IsResolved=true for %s", p.Username)
					}
					if p.ResolutionResult != "YES" {
						t.Errorf("expected ResolutionResult=YES for %s, got %s", p.Username, p.ResolutionResult)
					}
				}
			},
		},
		{
			Name: "3 users resolved NO",
			Bets: []struct {
				Amount   int64
				Outcome  string
				Username string
				Offset   time.Duration
			}{
				{20, "YES", "alice", 0},
				{15, "NO", "bob", time.Minute},
				{10, "YES", "charlie", 2 * time.Minute},
			},
			IsResolved:       true,
			ResolutionResult: "NO",
			Checks: func(t *testing.T, positions []MarketPosition) {
				posMap := make(map[string]MarketPosition)
				for _, p := range positions {
					posMap[p.Username] = p
				}
				// YES bettors should have 0 value
				if posMap["alice"].Value != 0 {
					t.Errorf("alice (YES bettor) should have 0 value when NO wins, got %d", posMap["alice"].Value)
				}
				if posMap["charlie"].Value != 0 {
					t.Errorf("charlie (YES bettor) should have 0 value when NO wins, got %d", posMap["charlie"].Value)
				}
				// Bob bet NO and won — should have all value
				if posMap["bob"].Value != 45 {
					t.Errorf("bob (sole NO bettor) should have value 45, got %d", posMap["bob"].Value)
				}
			},
		},
		{
			Name: "Buy then partial sell",
			Bets: []struct {
				Amount   int64
				Outcome  string
				Username string
				Offset   time.Duration
			}{
				{50, "YES", "alice", 0},
				{20, "NO", "bob", time.Minute},
				{-20, "YES", "alice", 2 * time.Minute},
			},
			IsResolved:       false,
			ResolutionResult: "",
			Checks: func(t *testing.T, positions []MarketPosition) {
				posMap := make(map[string]MarketPosition)
				for _, p := range positions {
					posMap[p.Username] = p
				}
				// Alice sold some YES shares — should still have some
				if posMap["alice"].YesSharesOwned <= 0 {
					t.Errorf("alice should still have YES shares after partial sell, got %d", posMap["alice"].YesSharesOwned)
				}
				// Total value = market volume (50+20-20 = 50)
				var totalValue int64
				for _, p := range positions {
					totalValue += p.Value
				}
				if totalValue != 50 {
					t.Errorf("expected total value 50, got %d", totalValue)
				}
			},
		},
		{
			Name: "User sells entire position",
			Bets: []struct {
				Amount   int64
				Outcome  string
				Username string
				Offset   time.Duration
			}{
				{30, "YES", "alice", 0},
				{20, "NO", "bob", time.Minute},
				{-30, "YES", "alice", 2 * time.Minute},
			},
			IsResolved:       false,
			ResolutionResult: "",
			Checks: func(t *testing.T, positions []MarketPosition) {
				// Alice should still appear in output (as zero-position user)
				found := false
				for _, p := range positions {
					if p.Username == "alice" {
						found = true
						// TotalSpent should be net of buys and sells
						if p.TotalSpent != 0 { // 30 + (-30) = 0
							t.Errorf("alice TotalSpent should be 0, got %d", p.TotalSpent)
						}
					}
				}
				if !found {
					t.Errorf("alice should appear in positions even after selling everything")
				}
			},
		},
		{
			Name: "Sell then rebuy",
			Bets: []struct {
				Amount   int64
				Outcome  string
				Username string
				Offset   time.Duration
			}{
				{30, "YES", "alice", 0},
				{10, "NO", "bob", time.Minute},
				{-15, "YES", "alice", 2 * time.Minute},
				{20, "YES", "alice", 3 * time.Minute},
			},
			IsResolved:       false,
			ResolutionResult: "",
			Checks: func(t *testing.T, positions []MarketPosition) {
				posMap := make(map[string]MarketPosition)
				for _, p := range positions {
					posMap[p.Username] = p
				}
				// Alice: bought 30, sold 15, bought 20 = net 35 spent
				if posMap["alice"].TotalSpent != 35 {
					t.Errorf("alice TotalSpent should be 35, got %d", posMap["alice"].TotalSpent)
				}
				// Should have YES shares
				if posMap["alice"].YesSharesOwned <= 0 {
					t.Errorf("alice should have YES shares after rebuy, got %d", posMap["alice"].YesSharesOwned)
				}
				// Total value = market volume (30+10-15+20 = 45)
				var totalValue int64
				for _, p := range positions {
					totalValue += p.Value
				}
				if totalValue != 45 {
					t.Errorf("expected total value 45, got %d", totalValue)
				}
			},
		},
		{
			Name: "5 users 15 bets with sells resolved YES",
			Bets: []struct {
				Amount   int64
				Outcome  string
				Username string
				Offset   time.Duration
			}{
				{20, "YES", "alice", 0},
				{15, "NO", "bob", time.Minute},
				{10, "YES", "charlie", 2 * time.Minute},
				{25, "NO", "diana", 3 * time.Minute},
				{10, "YES", "eve", 4 * time.Minute},
				{-10, "YES", "alice", 5 * time.Minute},
				{15, "YES", "bob", 6 * time.Minute},
				{-5, "NO", "diana", 7 * time.Minute},
				{10, "NO", "charlie", 8 * time.Minute},
				{20, "YES", "alice", 9 * time.Minute},
				{-10, "NO", "bob", 10 * time.Minute},
				{5, "YES", "eve", 11 * time.Minute},
				{10, "NO", "diana", 12 * time.Minute},
				{-5, "YES", "charlie", 13 * time.Minute},
				{15, "YES", "alice", 14 * time.Minute},
			},
			IsResolved:       true,
			ResolutionResult: "YES",
			Checks: func(t *testing.T, positions []MarketPosition) {
				// All 5 users should appear
				usernames := make(map[string]bool)
				for _, p := range positions {
					usernames[p.Username] = true
				}
				for _, name := range []string{"alice", "bob", "charlie", "diana", "eve"} {
					if !usernames[name] {
						t.Errorf("user %s missing from positions", name)
					}
				}
				// Total value should equal market volume
				// Volume = 20+15+10+25+10-10+15-5+10+20-10+5+10-5+15 = 125
				var totalValue int64
				for _, p := range positions {
					totalValue += p.Value
				}
				if totalValue != 125 {
					t.Errorf("expected total value 125, got %d", totalValue)
				}
				// NO-only bettors should have 0 value (market resolved YES)
				for _, p := range positions {
					if p.YesSharesOwned == 0 && p.NoSharesOwned > 0 && p.Value != 0 {
						t.Errorf("user %s has only NO shares but non-zero value %d in YES-resolved market",
							p.Username, p.Value)
					}
				}
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.Name, func(t *testing.T) {
			db := modelstesting.NewFakeDB(t)
			_, _ = modelstesting.UseStandardTestEconomics(t)

			creator := modelstesting.GenerateUser("creator", 0)
			if err := db.Create(&creator).Error; err != nil {
				t.Fatalf("failed to create creator: %v", err)
			}

			market := modelstesting.GenerateMarket(1, creator.Username)
			market.IsResolved = tc.IsResolved
			market.ResolutionResult = tc.ResolutionResult
			if err := db.Create(&market).Error; err != nil {
				t.Fatalf("failed to create market: %v", err)
			}

			usersSeen := make(map[string]bool)
			for _, b := range tc.Bets {
				if !usersSeen[b.Username] && b.Username != creator.Username {
					user := modelstesting.GenerateUser(b.Username, 0)
					if err := db.Create(&user).Error; err != nil {
						t.Fatalf("failed to create user %s: %v", b.Username, err)
					}
					usersSeen[b.Username] = true
				}
			}

			for _, b := range tc.Bets {
				bet := modelstesting.GenerateBet(b.Amount, b.Outcome, b.Username, uint(market.ID), b.Offset)
				if err := db.Create(&bet).Error; err != nil {
					t.Fatalf("failed to create bet: %v", err)
				}
			}

			marketIDStr := strconv.Itoa(int(market.ID))
			positions, err := CalculateMarketPositions_WPAM_DBPM(db, marketIDStr)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			// Log all positions
			for _, p := range positions {
				t.Logf("user=%s YES=%d NO=%d Value=%d TotalSpent=%d",
					p.Username, p.YesSharesOwned, p.NoSharesOwned, p.Value, p.TotalSpent)
			}

			tc.Checks(t, positions)
		})
	}
}
```

**Step 2: Run the tests**

Run: `cd backend && go test -v ./handlers/math/positions/... -run TestPositionLifecycleScenarios`
Expected: all PASS

**Step 3: Commit**

```bash
git add backend/handlers/math/positions/positionsmath_scenarios_test.go
git commit -m "test: add position lifecycle scenario tests with sell/rebuy and resolution"
```

---

### Task 5: Selling Math Edge Cases

**Files:**
- Create: `backend/handlers/bets/selling/sellposition_math_test.go`
- Reference: `backend/handlers/bets/selling/sellpositioncore.go:95-110` (`getSharesOwnedForOutcome`)
- Reference: `backend/handlers/bets/selling/sellpositioncore.go:114-143` (`calculateSharesToSell`)
- Reference: `backend/handlers/bets/selling/dustcap_test.go` (existing tests — avoid duplication)

The existing `dustcap_test.go` already covers: dust within/at/exceeding cap, no dust, cap disabled, zero value, negative value, credits less than one share. We add tests for `getSharesOwnedForOutcome` and additional `calculateSharesToSell` edge cases not yet covered.

**Step 1: Write the tests**

```go
package sellbetshandlers

import (
	positionsmath "socialpredict/handlers/math/positions"
	"socialpredict/models/modelstesting"
	"testing"
)

func TestGetSharesOwnedForOutcome(t *testing.T) {
	tests := []struct {
		name        string
		position    positionsmath.UserMarketPosition
		outcome     string
		expected    int64
		expectError bool
		errorMsg    string
	}{
		{
			name:     "YES outcome with YES shares",
			position: positionsmath.UserMarketPosition{YesSharesOwned: 10, NoSharesOwned: 0},
			outcome:  "YES",
			expected: 10,
		},
		{
			name:     "NO outcome with NO shares",
			position: positionsmath.UserMarketPosition{YesSharesOwned: 0, NoSharesOwned: 15},
			outcome:  "NO",
			expected: 15,
		},
		{
			name:        "YES outcome with 0 YES shares",
			position:    positionsmath.UserMarketPosition{YesSharesOwned: 0, NoSharesOwned: 10},
			outcome:     "YES",
			expectError: true,
			errorMsg:    "no shares owned for selected outcome",
		},
		{
			name:        "NO outcome with 0 NO shares",
			position:    positionsmath.UserMarketPosition{YesSharesOwned: 10, NoSharesOwned: 0},
			outcome:     "NO",
			expectError: true,
			errorMsg:    "no shares owned for selected outcome",
		},
		{
			name:        "Invalid outcome string",
			position:    positionsmath.UserMarketPosition{YesSharesOwned: 10, NoSharesOwned: 10},
			outcome:     "MAYBE",
			expectError: true,
			errorMsg:    "invalid outcome",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			shares, err := getSharesOwnedForOutcome(tc.position, tc.outcome)
			if tc.expectError {
				if err == nil {
					t.Errorf("expected error but got none")
					return
				}
				if err.Error() != tc.errorMsg {
					t.Errorf("expected error %q, got %q", tc.errorMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
					return
				}
				if shares != tc.expected {
					t.Errorf("expected %d shares, got %d", tc.expected, shares)
				}
			}
		})
	}
}

func TestCalculateSharesToSell_AdditionalEdgeCases(t *testing.T) {
	cfg := modelstesting.GenerateEconomicConfig()

	tests := []struct {
		name               string
		userValue          int64
		sharesOwned        int64
		creditsToSell      int64
		expectedShares     int64
		expectedSaleValue  int64
		expectError        bool
		errorMsg           string
	}{
		{
			name:              "Sell exact value of one share",
			userValue:         100,
			sharesOwned:       10,
			creditsToSell:     10, // valuePerShare=10
			expectedShares:    1,
			expectedSaleValue: 10,
		},
		{
			name:              "Sell more credits than position worth caps at all shares",
			userValue:         100,
			sharesOwned:       10,
			creditsToSell:     200, // way more than position, but dust=200-100=100 > cap
			expectError:       true, // dust cap exceeded
			errorMsg:          "",   // ErrDustCapExceeded
		},
		{
			name:              "Sell exactly all shares no dust",
			userValue:         100,
			sharesOwned:       10,
			creditsToSell:     100, // valuePerShare=10, sharesToSell=10, actualSale=100, dust=0
			expectedShares:    10,
			expectedSaleValue: 100,
		},
		{
			name:              "Value per share rounds down - integer division",
			userValue:         7,
			sharesOwned:       3,  // valuePerShare = 7/3 = 2 (integer division)
			creditsToSell:     4,  // sharesToSell = 4/2 = 2, actualSale = 4, dust = 0
			expectedShares:    2,
			expectedSaleValue: 4,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			position := positionsmath.UserMarketPosition{
				Value: tc.userValue,
			}

			shares, saleValue, err := calculateSharesToSell(position, tc.sharesOwned, tc.creditsToSell, cfg)

			if tc.expectError {
				if err == nil {
					t.Errorf("expected error but got none (shares=%d, saleValue=%d)", shares, saleValue)
				}
			} else {
				if err != nil {
					t.Errorf("unexpected error: %v", err)
					return
				}
				if shares != tc.expectedShares {
					t.Errorf("expected %d shares to sell, got %d", tc.expectedShares, shares)
				}
				if saleValue != tc.expectedSaleValue {
					t.Errorf("expected sale value %d, got %d", tc.expectedSaleValue, saleValue)
				}
			}
		})
	}
}
```

**Step 2: Run the tests**

Run: `cd backend && go test -v ./handlers/bets/selling/... -run "TestGetSharesOwnedForOutcome|TestCalculateSharesToSell_AdditionalEdgeCases"`
Expected: all PASS

**Step 3: Commit**

```bash
git add backend/handlers/bets/selling/sellposition_math_test.go
git commit -m "test: add selling math edge case tests for getSharesOwnedForOutcome and calculateSharesToSell"
```

---

### Task 6: Run Full Test Suite

**Step 1: Run all backend tests**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./...`
Expected: all PASS, no regressions

**Step 2: Verify no build issues**

Run: `cd backend && go vet ./...`
Expected: clean

---
