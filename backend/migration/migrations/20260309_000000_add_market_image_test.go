package migrations_test

import (
	"testing"
	"time"

	"socialpredict/migration/migrations"
	"socialpredict/models"
	"socialpredict/models/modelstesting"

	"gorm.io/gorm"
)

// MarketPreImage mirrors the schema before the image migration.
type MarketPreImage struct {
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
	Category                string
	CreatorUsername         string
}

func (MarketPreImage) TableName() string { return "markets" }

func seedPreImageMarket(t *testing.T, db *gorm.DB) int64 {
	t.Helper()
	m := MarketPreImage{
		ID:                 3,
		QuestionTitle:      "Image Test Market",
		Description:        "Test Description",
		OutcomeType:        "BINARY",
		ResolutionDateTime: time.Now().Add(24 * time.Hour),
		YesLabel:           "YES",
		NoLabel:            "NO",
		Category:           "General",
		CreatorUsername:    "alice",
	}
	if err := db.Create(&m).Error; err != nil {
		t.Fatalf("failed to seed pre-image market: %v", err)
	}
	return m.ID
}

func TestMigrateAddMarketImage_AddsColumn(t *testing.T) {
	db := modelstesting.NewFakeDB(t)

	// Simulate pre-image state: drop the column if present.
	_ = db.Migrator().DropColumn(&models.Market{}, "ImageURL")

	seedPreImageMarket(t, db)

	// Run the migration under test.
	if err := migrations.MigrateAddMarketImage(db); err != nil {
		t.Fatalf("migration failed: %v", err)
	}

	// Assert column exists.
	if !db.Migrator().HasColumn(&models.Market{}, "ImageURL") {
		t.Fatalf("expected image_url column after migration")
	}
}

func TestMigrateAddMarketImage_Idempotent(t *testing.T) {
	db := modelstesting.NewFakeDB(t)

	// Run twice — should not error.
	if err := migrations.MigrateAddMarketImage(db); err != nil {
		t.Fatalf("first migration run failed: %v", err)
	}
	if err := migrations.MigrateAddMarketImage(db); err != nil {
		t.Fatalf("second migration run failed: %v", err)
	}
}
