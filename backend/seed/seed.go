package seed

import (
	"fmt"
	"log"
	"os"
	"socialpredict/models"
	"socialpredict/setup"
	"time"

	"gorm.io/gorm"
)

func getEnv(key string) (string, error) {
	value, ok := os.LookupEnv(key)
	if !ok {
		return "", fmt.Errorf("environment variable %s not set", key)
	}
	return value, nil
}

func SeedUsers(db *gorm.DB) {

	config, err := setup.LoadEconomicsConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	adminPassword, err := getEnv("ADMIN_PASSWORD")
	if err != nil {
		log.Fatalf("Error retrieving ADMIN_PASSWORD: %v", err)
	}
	if adminPassword == "" {
		log.Fatalf("ADMIN_PASSWORD is set but empty")
	}

	// Ensure permissions exist
	permissions := []models.Permission{
		{Name: "create_markets", Description: "Create prediction markets"},
		{Name: "create_users", Description: "Create new user accounts"},
		{Name: "edit_homepage", Description: "Edit homepage content"},
	}
	for i := range permissions {
		db.Where("name = ?", permissions[i].Name).FirstOrCreate(&permissions[i])
	}

	// Check if the admin user already exists
	var adminUser models.User
	result := db.Where("username = ?", "admin").First(&adminUser)
	if result.Error != nil {
		// No admin user found, create one
		adminUser = models.User{
			PublicUser: models.PublicUser{
				Username:              "admin",
				DisplayName:           "Administrator",
				InitialAccountBalance: config.Economics.User.InitialAccountBalance,
				AccountBalance:        config.Economics.User.InitialAccountBalance,
				PersonalEmoji:         "NONE",
				Description:           "Administrator",
			},
			PrivateUser: models.PrivateUser{
				Email:  "admin@example.com",
				APIKey: "NONE",
			},
			MustChangePassword: true,
		}

		adminUser.HashPassword(adminPassword)
		db.Create(&adminUser)
	}

	// Ensure admin has all permissions (idempotent)
	db.Model(&adminUser).Association("Permissions").Replace(&permissions)
}

func EnsureDBReady(db *gorm.DB, maxAttempts int) error {
	var err error
	for attempts := 1; attempts <= maxAttempts; attempts++ {
		// Attempt to perform a simple operation like pinging the database
		sqlDB, err := db.DB()
		if err != nil {
			log.Printf("Unable to get database/sql DB from GORM DB: %v", err)
			time.Sleep(time.Second * 5)
			continue
		}

		err = sqlDB.Ping()
		if err != nil {
			log.Printf("Failed to connect to the database, attempt %d/%d: %v", attempts, maxAttempts, err)
			time.Sleep(time.Second * 5) // Wait before retrying
			continue
		}

		log.Println("Database is ready.")
		return nil
	}

	return fmt.Errorf("database is not ready after %d attempts: %v", maxAttempts, err)
}
