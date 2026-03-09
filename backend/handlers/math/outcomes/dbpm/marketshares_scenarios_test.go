package dbpm

import (
	"socialpredict/handlers/math/probabilities/wpam"
	"socialpredict/models"
	"socialpredict/models/modelstesting"
	"testing"
	"time"
)

// runFullDBPMPipeline runs all DBPM steps and returns net positions and final payouts.
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

// Invariant helpers inlined to avoid circular import with testinvariants package.

func assertPoolConservation(t *testing.T, bets []models.Bet, finalPayouts []int64) {
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

func assertNonNegativeShares(t *testing.T, positions []DBPMMarketPosition) {
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

func assertProbabilityBounds(t *testing.T, probabilities []wpam.ProbabilityChange) {
	t.Helper()
	for i, pc := range probabilities {
		if pc.Probability <= 0 || pc.Probability >= 1 {
			t.Errorf("probability[%d] out of bounds (0,1): %.17f", i, pc.Probability)
		}
	}
}

func TestDBPMScenarios(t *testing.T) {
	tests := []struct {
		Name              string
		Bets              []models.Bet
		ExpectedPositions map[string]struct{ Yes, No int64 }
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
	}

	for _, tc := range tests {
		t.Run(tc.Name, func(t *testing.T) {
			probChanges := wpam.CalculateMarketProbabilitiesWPAM(time.Now(), tc.Bets)

			positions, finalPayouts := runFullDBPMPipeline(tc.Bets, probChanges)

			assertPoolConservation(t, tc.Bets, finalPayouts)
			assertNonNegativeShares(t, positions)
			assertProbabilityBounds(t, probChanges)

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

			for _, p := range positions {
				t.Logf("user=%s YES=%d NO=%d", p.Username, p.YesSharesOwned, p.NoSharesOwned)
			}
		})
	}
}
