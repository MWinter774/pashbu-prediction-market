package migrations

import (
	"socialpredict/migration"
	"socialpredict/models"

	"gorm.io/gorm"
)

// MigrateAddMarketImage adds the ImageURL column to the markets table.
func MigrateAddMarketImage(db *gorm.DB) error {
	if !db.Migrator().HasColumn(&models.Market{}, "ImageURL") {
		if err := db.Migrator().AddColumn(&models.Market{}, "ImageURL"); err != nil {
			return err
		}
	}
	return nil
}

func init() {
	migration.Register("20260309000000", func(db *gorm.DB) error {
		return MigrateAddMarketImage(db)
	})
}
