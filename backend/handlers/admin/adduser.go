package adminhandlers

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"socialpredict/middleware"
	"socialpredict/models"
	"socialpredict/security"
	"socialpredict/setup"
	"socialpredict/util"

	"github.com/brianvoe/gofakeit"
	"gorm.io/gorm"
)

func AddUserHandler(loadEconConfig setup.EconConfigLoader) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not supported", http.StatusMethodNotAllowed)
			return
		}

		// Initialize security service
		securityService := security.NewSecurityService()

		var req struct {
			Username    string   `json:"username" validate:"required,min=3,max=30,username"`
			Permissions []string `json:"permissions"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Error decoding request body", http.StatusBadRequest)
			log.Printf("AddUserHandler: %v", err)
			return
		}

		// Validate the username using security service
		if err := securityService.Validator.ValidateStruct(struct {
			Username string `json:"username" validate:"required,min=3,max=30,username"`
		}{Username: req.Username}); err != nil {
			http.Error(w, "Invalid username: "+err.Error(), http.StatusBadRequest)
			log.Printf("AddUserHandler: %v", err)
			return
		}

		// Sanitize the username
		sanitizedUsername, err := securityService.Sanitizer.SanitizeUsername(req.Username)
		if err != nil {
			http.Error(w, "Invalid username format: "+err.Error(), http.StatusBadRequest)
			log.Printf("AddUserHandler: %v", err)
			return
		}
		req.Username = sanitizedUsername

		db := util.GetDB()

		// Validate that the user has create_users permission
		if _, httpErr := middleware.ValidateUserHasPermission(r, db, "create_users"); httpErr != nil {
			http.Error(w, httpErr.Message, httpErr.StatusCode)
			return
		}

		// Resolve requested permissions to Permission objects
		var permissions []models.Permission
		if len(req.Permissions) > 0 {
			if err := db.Where("name IN ?", req.Permissions).Find(&permissions).Error; err != nil {
				http.Error(w, "Failed to resolve permissions", http.StatusInternalServerError)
				log.Printf("AddUserHandler: %v", err)
				return
			}
			if len(permissions) != len(req.Permissions) {
				http.Error(w, "One or more invalid permission names", http.StatusBadRequest)
				return
			}
		}

		appConfig := loadEconConfig()
		user := models.User{
			PublicUser: models.PublicUser{
				Username:              req.Username,
				DisplayName:           util.UniqueDisplayName(db),
				InitialAccountBalance: appConfig.Economics.User.InitialAccountBalance,
				AccountBalance:        appConfig.Economics.User.InitialAccountBalance,
				PersonalEmoji:         randomEmoji(),
			},
			PrivateUser: models.PrivateUser{
				Email:  util.UniqueEmail(db),
				APIKey: util.GenerateUniqueApiKey(db),
			},
			MustChangePassword: true,
		}

		// Check uniqueness of username, displayname, and email
		if err := checkUniqueFields(db, &user); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			log.Printf("AddUserHandler: %v", err)
			return
		}

		password := gofakeit.Password(true, true, true, false, false, 12)
		if err := user.HashPassword(password); err != nil {
			http.Error(w, "Failed to hash password", http.StatusInternalServerError)
			log.Printf("AddUserHandler: %v", err)
			return
		}

		if result := db.Create(&user); result.Error != nil {
			http.Error(w, "Failed to create user", http.StatusInternalServerError)
			log.Printf("AddUserHandler: %v", result.Error)
			return
		}

		// Assign permissions
		if len(permissions) > 0 {
			if err := db.Model(&user).Association("Permissions").Append(&permissions); err != nil {
				http.Error(w, "Failed to assign permissions", http.StatusInternalServerError)
				log.Printf("AddUserHandler: %v", err)
				return
			}
		}

		responseData := map[string]interface{}{
			"message":     "User created successfully",
			"username":    user.Username,
			"password":    password,
			"permissions": req.Permissions,
		}
		json.NewEncoder(w).Encode(responseData)
	}
}

func checkUniqueFields(db *gorm.DB, user *models.User) error {
	var count int64
	db.Model(&models.User{}).Where(
		"username = ? OR display_name = ? OR email = ? OR api_key = ?",
		user.Username, user.DisplayName, user.Email, user.APIKey,
	).Count(&count)

	if count > 0 {
		return fmt.Errorf("username, display name, email, or API key already in use")
	}

	return nil
}

func randomEmoji() string {
	emojis := []string{"😀", "😃", "😄", "😁", "😆"}
	return emojis[rand.Intn(len(emojis))]
}
