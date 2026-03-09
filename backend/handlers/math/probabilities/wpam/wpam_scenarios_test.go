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
	_ = modelstesting.GenerateEconomicConfig()

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
				if probs[1].Probability <= probs[0].Probability {
					t.Errorf("probability should increase after YES buy: %.6f -> %.6f",
						probs[0].Probability, probs[1].Probability)
				}
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
				if probs[1].Probability <= 0.7 {
					t.Errorf("expected high probability after large YES bet, got %.6f", probs[1].Probability)
				}
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

			for i, p := range probs {
				t.Logf("prob[%d] = %.6f", i, p.Probability)
			}
		})
	}
}
