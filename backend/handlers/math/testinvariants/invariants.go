package testinvariants

import (
	"socialpredict/handlers/math/outcomes/dbpm"
	"socialpredict/handlers/math/probabilities/wpam"
	"socialpredict/models"
	"testing"
)

// AssertPoolConservation checks that sum(finalPayouts) == sum of all bet amounts (market volume).
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

// AssertAllBettorsPresent checks that every unique username in bets appears in the provided list.
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
