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
		name              string
		userValue         int64
		sharesOwned       int64
		creditsToSell     int64
		expectedShares    int64
		expectedSaleValue int64
		expectError       bool
	}{
		{
			name:              "Sell exact value of one share",
			userValue:         100,
			sharesOwned:       10,
			creditsToSell:     10,
			expectedShares:    1,
			expectedSaleValue: 10,
		},
		{
			name:          "Sell more credits than position worth exceeds dust cap",
			userValue:     100,
			sharesOwned:   10,
			creditsToSell: 200,
			expectError:   true,
		},
		{
			name:              "Sell exactly all shares no dust",
			userValue:         100,
			sharesOwned:       10,
			creditsToSell:     100,
			expectedShares:    10,
			expectedSaleValue: 100,
		},
		{
			name:              "Value per share rounds down with integer division",
			userValue:         7,
			sharesOwned:       3,
			creditsToSell:     4,
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
