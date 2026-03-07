package migrations_test

import (
	"testing"
	"time"

	"socialpredict/migration/migrations"
	"socialpredict/models"
	"socialpredict/models/modelstesting"

	"gorm.io/gorm"
)

// MarketPreCategory mirrors the schema before the category migration.
type MarketPreCategory struct {
	ID                      int64 `gorm:"primaryKey"`
	QuestionTitle           string
	Description             string
	OutcomeType             string
	ResolutionDateTime      time.Time
	FinalResolutionDateTime time.Time
	UTCOffset               int
	IsResolved              bool
	ResolutionResult        string
	InitialProbability      float64
	YesLabel                string
	NoLabel                 string
	CreatorUsername         string
}

func (MarketPreCategory) TableName() string { return "markets" }

func seedPreCategoryMarket(t *testing.T, db *gorm.DB) int64 {
	t.Helper()
	m := MarketPreCategory{
		ID:                 2,
		QuestionTitle:      "Category Test Market",
		Description:        "Test Description",
		OutcomeType:        "BINARY",
		ResolutionDateTime: time.Now().Add(24 * time.Hour),
		YesLabel:           "YES",
		NoLabel:            "NO",
		CreatorUsername:    "alice",
	}
	if err := db.Create(&m).Error; err != nil {
		t.Fatalf("failed to seed pre-category market: %v", err)
	}
	return m.ID
}

func TestMigrateAddMarketCategory_AddsColumnAndBackfills(t *testing.T) {
	db := modelstesting.NewFakeDB(t)

	// Simulate pre-category state: drop the column if present.
	_ = db.Migrator().DropColumn(&models.Market{}, "Category")

	id := seedPreCategoryMarket(t, db)

	// Run the migration under test.
	if err := migrations.MigrateAddMarketCategory(db); err != nil {
		t.Fatalf("migration failed: %v", err)
	}

	// Assert column exists.
	if !db.Migrator().HasColumn(&models.Market{}, "Category") {
		t.Fatalf("expected category column after migration")
	}

	// Assert backfill applied.
	var out models.Market
	if err := db.First(&out, id).Error; err != nil {
		t.Fatalf("load market failed: %v", err)
	}
	if out.Category != "General" {
		t.Fatalf("expected Category 'General', got %q", out.Category)
	}
}
