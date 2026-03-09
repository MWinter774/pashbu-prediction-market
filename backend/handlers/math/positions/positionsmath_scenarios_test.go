package positionsmath

import (
	"socialpredict/models/modelstesting"
	"strconv"
	"testing"
	"time"
)

func TestPositionLifecycleScenarios(t *testing.T) {
	tests := []struct {
		Name string
		Bets []struct {
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
				if totalValue != 45 {
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
				if posMap["bob"].Value != 0 {
					t.Errorf("bob (NO bettor) should have 0 value when YES wins, got %d", posMap["bob"].Value)
				}
				if posMap["alice"].Value <= 0 {
					t.Errorf("alice (YES bettor) should have positive value, got %d", posMap["alice"].Value)
				}
				var totalValue int64
				for _, p := range positions {
					totalValue += p.Value
				}
				if totalValue != 45 {
					t.Errorf("expected total value 45, got %d", totalValue)
				}
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
				if posMap["alice"].Value != 0 {
					t.Errorf("alice (YES bettor) should have 0 value when NO wins, got %d", posMap["alice"].Value)
				}
				if posMap["charlie"].Value != 0 {
					t.Errorf("charlie (YES bettor) should have 0 value when NO wins, got %d", posMap["charlie"].Value)
				}
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
				if posMap["alice"].YesSharesOwned <= 0 {
					t.Errorf("alice should still have YES shares after partial sell, got %d", posMap["alice"].YesSharesOwned)
				}
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
				found := false
				for _, p := range positions {
					if p.Username == "alice" {
						found = true
						if p.TotalSpent != 0 {
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
				if posMap["alice"].TotalSpent != 35 {
					t.Errorf("alice TotalSpent should be 35, got %d", posMap["alice"].TotalSpent)
				}
				if posMap["alice"].YesSharesOwned <= 0 {
					t.Errorf("alice should have YES shares after rebuy, got %d", posMap["alice"].YesSharesOwned)
				}
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
				usernames := make(map[string]bool)
				for _, p := range positions {
					usernames[p.Username] = true
				}
				for _, name := range []string{"alice", "bob", "charlie", "diana", "eve"} {
					if !usernames[name] {
						t.Errorf("user %s missing from positions", name)
					}
				}
				var totalValue int64
				for _, p := range positions {
					totalValue += p.Value
				}
				if totalValue != 125 {
					t.Errorf("expected total value 125, got %d", totalValue)
				}
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

			for _, p := range positions {
				t.Logf("user=%s YES=%d NO=%d Value=%d TotalSpent=%d",
					p.Username, p.YesSharesOwned, p.NoSharesOwned, p.Value, p.TotalSpent)
			}

			tc.Checks(t, positions)
		})
	}
}
