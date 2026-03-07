package migrations_test

import (
	"testing"

	"socialpredict/migration/migrations"
	"socialpredict/models"
	"socialpredict/models/modelstesting"
)

// UserPrePermissions mirrors the schema before the permissions migration.
type UserPrePermissions struct {
	ID       int64  `gorm:"primaryKey"`
	Username string `gorm:"unique;not null"`
	UserType string `gorm:"not null"`
}

func (UserPrePermissions) TableName() string { return "users" }

func TestMigrateAddPermissions_CreatesTablesAndMigratesAdmin(t *testing.T) {
	db := modelstesting.NewTestDB(t)

	// Set up baseline schema with user_type column
	if err := db.AutoMigrate(&UserPrePermissions{}); err != nil {
		t.Fatalf("setup baseline schema: %v", err)
	}

	// Seed an ADMIN and a REGULAR user
	db.Create(&UserPrePermissions{ID: 1, Username: "admin", UserType: "ADMIN"})
	db.Create(&UserPrePermissions{ID: 2, Username: "alice", UserType: "REGULAR"})

	// Run migration
	if err := migrations.MigrateAddPermissions(db); err != nil {
		t.Fatalf("migration failed: %v", err)
	}

	// Assert permissions table has 3 rows
	var permCount int64
	db.Model(&models.Permission{}).Count(&permCount)
	if permCount != 3 {
		t.Fatalf("expected 3 permissions, got %d", permCount)
	}

	// Assert admin user has all 3 permissions
	type UserPerm struct {
		UserID       int64
		PermissionID int64
	}
	var adminPerms []UserPerm
	db.Table("user_permissions").Where("user_id = ?", 1).Find(&adminPerms)
	if len(adminPerms) != 3 {
		t.Fatalf("expected admin to have 3 permissions, got %d", len(adminPerms))
	}

	// Assert regular user has 0 permissions
	var regularPerms []UserPerm
	db.Table("user_permissions").Where("user_id = ?", 2).Find(&regularPerms)
	if len(regularPerms) != 0 {
		t.Fatalf("expected regular user to have 0 permissions, got %d", len(regularPerms))
	}

	// Assert user_type column is dropped
	if db.Migrator().HasColumn(&UserPrePermissions{}, "UserType") {
		t.Fatalf("expected user_type column to be dropped")
	}
}
