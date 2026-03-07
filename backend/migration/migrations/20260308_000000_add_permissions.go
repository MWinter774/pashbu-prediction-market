package migrations

import (
	"socialpredict/migration"
	"socialpredict/models"

	"gorm.io/gorm"
)

// MigrateAddPermissions creates the permissions system and migrates existing users.
func MigrateAddPermissions(db *gorm.DB) error {
	// 1. Create permissions and user_permissions tables
	if err := db.AutoMigrate(&models.Permission{}); err != nil {
		return err
	}

	// Create join table manually if GORM doesn't auto-create it
	type UserPermission struct {
		UserID       int64 `gorm:"primaryKey"`
		PermissionID int64 `gorm:"primaryKey"`
	}
	if err := db.Table("user_permissions").AutoMigrate(&UserPermission{}); err != nil {
		return err
	}

	// 2. Seed the three permissions
	permissions := []models.Permission{
		{Name: "create_markets", Description: "Create prediction markets"},
		{Name: "create_users", Description: "Create new user accounts"},
		{Name: "edit_homepage", Description: "Edit homepage content"},
	}
	for i := range permissions {
		// Use FirstOrCreate to be idempotent
		if err := db.Where("name = ?", permissions[i].Name).FirstOrCreate(&permissions[i]).Error; err != nil {
			return err
		}
	}

	// 3. Grant all permissions to existing ADMIN users
	// Check if user_type column exists before querying it
	if db.Migrator().HasColumn(&models.User{}, "user_type") {
		type OldUser struct {
			ID       int64
			UserType string
		}
		var admins []OldUser
		db.Table("users").Where("user_type = ?", "ADMIN").Find(&admins)

		for _, admin := range admins {
			for _, perm := range permissions {
				db.Table("user_permissions").Create(map[string]interface{}{
					"user_id":       admin.ID,
					"permission_id": perm.ID,
				})
			}
		}

		// 4. Drop user_type column
		if err := db.Migrator().DropColumn(&models.User{}, "user_type"); err != nil {
			return err
		}
	}

	return nil
}

func init() {
	migration.Register("20260308000000", func(db *gorm.DB) error {
		return MigrateAddPermissions(db)
	})
}
