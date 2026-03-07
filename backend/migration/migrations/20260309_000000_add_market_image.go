package migrations

import (
	"socialpredict/migration"
	"socialpredict/models"

	"gorm.io/gorm"
)

func MigrateAddMarketImage(db *gorm.DB) error {
	if !db.Migrator().HasColumn(&models.Market{}, "image_url") {
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
