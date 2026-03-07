package migrations

import (
	"socialpredict/migration"
	"socialpredict/models"

	"gorm.io/gorm"
)

// MigrateAddMarketCategory adds the Category column and backfills existing rows with "General".
func MigrateAddMarketCategory(db *gorm.DB) error {
	m := db.Migrator()

	if !m.HasColumn(&models.Market{}, "Category") {
		if err := m.AddColumn(&models.Market{}, "Category"); err != nil {
			return err
		}
	}

	if err := db.Model(&models.Market{}).
		Where("category IS NULL OR category = ''").
		Update("category", "General").Error; err != nil {
		return err
	}

	return nil
}

func init() {
	migration.Register("20260307000000", func(db *gorm.DB) error {
		return MigrateAddMarketCategory(db)
	})
}
