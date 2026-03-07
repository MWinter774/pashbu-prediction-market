# User Permissions System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace role-based `UserType` (ADMIN/REGULAR) with a granular permission system using `Permission` and `UserPermission` tables.

**Architecture:** New `Permission` model + many-to-many join table `UserPermission`. A new `ValidateUserHasPermission` middleware function replaces `ValidateAdminToken`. All handlers, login response, seed logic, and frontend auth switch from `usertype` to `permissions` array.

**Tech Stack:** Go (GORM, Gorilla Mux), React (Context API), SQLite (tests), PostgreSQL (prod)

---

### Task 1: Add Permission and UserPermission models

**Files:**
- Modify: `backend/models/user.go`

**Step 1: Write the new models and update User**

Replace the contents of `backend/models/user.go` with:

```go
package models

import (
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	ID                 int64        `json:"id" gorm:"primary_key"`
	PublicUser
	PrivateUser
	MustChangePassword bool         `json:"mustChangePassword" gorm:"default:true"`
	Permissions        []Permission `json:"-" gorm:"many2many:user_permissions;"`
}

type PublicUser struct {
	Username              string `json:"username" gorm:"unique;not null"`
	DisplayName           string `json:"displayname" gorm:"unique;not null"`
	InitialAccountBalance int64  `json:"initialAccountBalance"`
	AccountBalance        int64  `json:"accountBalance"`
	PersonalEmoji         string `json:"personalEmoji,omitempty"`
	Description           string `json:"description,omitempty"`
	PersonalLink1         string `json:"personalink1,omitempty"`
	PersonalLink2         string `json:"personalink2,omitempty"`
	PersonalLink3         string `json:"personalink3,omitempty"`
	PersonalLink4         string `json:"personalink4,omitempty"`
}

type PrivateUser struct {
	Email    string `json:"email" gorm:"unique;not null"`
	APIKey   string `json:"apiKey,omitempty" gorm:"unique"`
	Password string `json:"password,omitempty" gorm:"not null"`
}

type Permission struct {
	ID          int64  `json:"id" gorm:"primaryKey"`
	Name        string `json:"name" gorm:"uniqueIndex;not null;size:64"`
	Description string `json:"description"`
}

// HashPassword hashes given password
func (u *User) HashPassword(password string) error {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	u.Password = string(bytes)
	return err
}

// CheckPasswordHash checks if provided password is correct
func (u *User) CheckPasswordHash(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(password))
	return err == nil
}

// HasPermission checks if the user has a specific permission loaded via Preload("Permissions")
func (u *User) HasPermission(name string) bool {
	for _, p := range u.Permissions {
		if p.Name == name {
			return true
		}
	}
	return false
}

// PermissionNames returns a slice of permission name strings
func (u *User) PermissionNames() []string {
	names := make([]string, len(u.Permissions))
	for i, p := range u.Permissions {
		names[i] = p.Name
	}
	return names
}
```

Key changes:
- Removed `UserType` field from `PublicUser`
- Added `Permissions []Permission` many-to-many on `User`
- Added `Permission` struct
- Added `HasPermission` and `PermissionNames` helper methods

**Step 2: Run build to verify compilation**

Run: `cd backend && go build ./...`
Expected: Compilation errors in files that reference `UserType` — this is expected and will be fixed in subsequent tasks.

**Step 3: Commit**

```bash
git add backend/models/user.go
git commit -m "feat: add Permission model, remove UserType from User"
```

---

### Task 2: Add database migration

**Files:**
- Create: `backend/migration/migrations/20260308_000000_add_permissions.go`
- Create: `backend/migration/migrations/20260308_000000_add_permissions_test.go`

**Step 1: Write the migration test**

Create `backend/migration/migrations/20260308_000000_add_permissions_test.go`:

```go
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
```

**Step 2: Run test to verify it fails**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./migration/migrations/ -run TestMigrateAddPermissions -v`
Expected: FAIL — `MigrateAddPermissions` function not defined.

**Step 3: Write the migration**

Create `backend/migration/migrations/20260308_000000_add_permissions.go`:

```go
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
```

**Step 4: Run test to verify it passes**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./migration/migrations/ -run TestMigrateAddPermissions -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/migration/migrations/20260308_000000_add_permissions.go backend/migration/migrations/20260308_000000_add_permissions_test.go
git commit -m "feat: add permissions migration with admin user data migration"
```

---

### Task 3: Add ValidateUserHasPermission middleware

**Files:**
- Modify: `backend/middleware/auth.go`
- Delete: `backend/middleware/authadmin.go`

**Step 1: Add ValidateUserHasPermission to auth.go**

Add this function to `backend/middleware/auth.go` after `ValidateUserAndEnforcePasswordChangeGetUser`:

```go
// ValidateUserHasPermission authenticates the user, checks password change requirement,
// and verifies they have the specified permission.
func ValidateUserHasPermission(r *http.Request, db *gorm.DB, permissionName string) (*models.User, *HTTPError) {
	user, httpErr := ValidateUserAndEnforcePasswordChangeGetUser(r, db)
	if httpErr != nil {
		return nil, httpErr
	}

	// Load permissions for the user
	if err := db.Model(user).Association("Permissions").Find(&user.Permissions); err != nil {
		return nil, &HTTPError{StatusCode: http.StatusInternalServerError, Message: "Failed to load permissions"}
	}

	if !user.HasPermission(permissionName) {
		return nil, &HTTPError{StatusCode: http.StatusForbidden, Message: "Insufficient permissions"}
	}

	return user, nil
}
```

**Step 2: Delete authadmin.go**

Delete `backend/middleware/authadmin.go` entirely.

**Step 3: Run build**

Run: `cd backend && go build ./...`
Expected: Compilation errors in handlers that still reference `ValidateAdminToken` — expected, will fix next.

**Step 4: Commit**

```bash
git add backend/middleware/auth.go
git rm backend/middleware/authadmin.go
git commit -m "feat: add ValidateUserHasPermission, remove ValidateAdminToken"
```

---

### Task 4: Update AddUserHandler (create user)

**Files:**
- Modify: `backend/handlers/admin/adduser.go`

**Step 1: Update the handler**

Replace `backend/handlers/admin/adduser.go` with:

```go
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
```

Key changes:
- Request body now includes `permissions []string`
- Auth check: `ValidateAdminToken` → `ValidateUserHasPermission(r, db, "create_users")`
- Resolves permission names to `Permission` objects and assigns them to the new user
- Response returns `permissions` instead of `usertype`
- Removed `UserType: "REGULAR"` from user creation

**Step 2: Run build**

Run: `cd backend && go build ./...`
Expected: May still have errors in other files — continue to next tasks.

**Step 3: Commit**

```bash
git add backend/handlers/admin/adduser.go
git commit -m "feat: update AddUserHandler to use permission-based auth"
```

---

### Task 5: Update CreateMarketHandler

**Files:**
- Modify: `backend/handlers/markets/createmarket.go`

**Step 1: Update the auth check**

In `backend/handlers/markets/createmarket.go`, change line 81-85 from:

```go
user, httpErr := middleware.ValidateUserAndEnforcePasswordChangeGetUser(r, db)
```

to:

```go
user, httpErr := middleware.ValidateUserHasPermission(r, db, "create_markets")
```

The rest of the handler stays the same — `user` is still returned and used the same way.

**Step 2: Run build**

Run: `cd backend && go build ./...`

**Step 3: Commit**

```bash
git add backend/handlers/markets/createmarket.go
git commit -m "feat: require create_markets permission for market creation"
```

---

### Task 6: Update Homepage AdminUpdate handler

**Files:**
- Modify: `backend/handlers/cms/homepage/http/handler.go`

**Step 1: Update AdminUpdate method**

Replace lines 46-59 of `backend/handlers/cms/homepage/http/handler.go` (the auth section of `AdminUpdate`) with:

```go
func (h *Handler) AdminUpdate(w http.ResponseWriter, r *http.Request) {
	db := util.GetDB()

	// Validate user has edit_homepage permission
	user, httpErr := middleware.ValidateUserHasPermission(r, db, "edit_homepage")
	if httpErr != nil {
		http.Error(w, httpErr.Message, httpErr.StatusCode)
		return
	}

	var in updateReq
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	item, err := h.svc.UpdateHome(homepage.UpdateInput{
		Title:     in.Title,
		Format:    in.Format,
		Markdown:  in.Markdown,
		HTML:      in.HTML,
		Version:   in.Version,
		UpdatedBy: user.Username,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"title":   item.Title,
		"format":  item.Format,
		"html":    item.HTML,
		"version": item.Version,
	})
}
```

Also update `RequireAdmin` to use permissions (or delete it if unused outside this file):

```go
// RequirePermission middleware wrapper that can be used in routes
func RequirePermission(permissionName string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		db := util.GetDB()
		if _, httpErr := middleware.ValidateUserHasPermission(r, db, permissionName); httpErr != nil {
			http.Error(w, httpErr.Message, httpErr.StatusCode)
			return
		}
		next.ServeHTTP(w, r)
	}
}
```

Remove `UsernameFromContext` — it was a placeholder.

**Step 2: Run build**

Run: `cd backend && go build ./...`

**Step 3: Commit**

```bash
git add backend/handlers/cms/homepage/http/handler.go
git commit -m "feat: require edit_homepage permission for homepage updates"
```

---

### Task 7: Add permissions list endpoint and update login response

**Files:**
- Create: `backend/handlers/permissions/permissions.go`
- Modify: `backend/middleware/loggin.go`
- Modify: `backend/server/server.go`

**Step 1: Create permissions handler**

Create `backend/handlers/permissions/permissions.go`:

```go
package permissions

import (
	"encoding/json"
	"net/http"
	"socialpredict/middleware"
	"socialpredict/models"
	"socialpredict/util"
)

func ListPermissionsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not supported", http.StatusMethodNotAllowed)
		return
	}

	db := util.GetDB()

	// Require create_users permission to list permissions
	if _, httpErr := middleware.ValidateUserHasPermission(r, db, "create_users"); httpErr != nil {
		http.Error(w, httpErr.Message, httpErr.StatusCode)
		return
	}

	var perms []models.Permission
	if err := db.Find(&perms).Error; err != nil {
		http.Error(w, "Failed to fetch permissions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(perms)
}
```

**Step 2: Update login response**

In `backend/middleware/loggin.go`, replace lines 65-113 (from user lookup through response) with the following changes:

After the user is found and password is checked (line 77), and after the JWT token is created (line 101), update the response section (lines 103-113) to:

```go
	// Load user permissions
	if err := db.Model(&user).Association("Permissions").Find(&user.Permissions); err != nil {
		http.Error(w, "Error loading permissions", http.StatusInternalServerError)
		return
	}

	// Prepare to send JSON
	w.Header().Set("Content-Type", "application/json")

	// Send token, username, and permissions in the response
	responseData := map[string]interface{}{
		"token":              tokenString,
		"username":           user.Username,
		"permissions":        user.PermissionNames(),
		"mustChangePassword": user.MustChangePassword,
	}
	json.NewEncoder(w).Encode(responseData)
```

Note: You need to add `"socialpredict/util"` to the imports in loggin.go — but actually `util` is already imported. The `db` variable needs to come from `util.GetDB()` which is already at line 65. So `db` is already available. Just add the permission loading block before the response.

**Step 3: Update router**

In `backend/server/server.go`:

Add import:
```go
permissionshandlers "socialpredict/handlers/permissions"
```

Change line 158 (create market route) — no change needed, path stays `/v0/create`.

Change line 161 from:
```go
router.Handle("/v0/admin/createuser", securityMiddleware(http.HandlerFunc(adminhandlers.AddUserHandler(setup.EconomicsConfig)))).Methods("POST")
```
to:
```go
router.Handle("/v0/users/create", securityMiddleware(http.HandlerFunc(adminhandlers.AddUserHandler(setup.EconomicsConfig)))).Methods("POST")
```

Add new route after the users/create line:
```go
router.Handle("/v0/permissions", securityMiddleware(http.HandlerFunc(permissionshandlers.ListPermissionsHandler))).Methods("GET")
```

Change line 171 — the homepage admin route path stays the same (it's a content management route, not an admin-specific route).

**Step 4: Run build**

Run: `cd backend && go build ./...`
Expected: PASS (all compilation errors should be resolved now)

**Step 5: Commit**

```bash
git add backend/handlers/permissions/permissions.go backend/middleware/loggin.go backend/server/server.go
git commit -m "feat: add permissions endpoint, update login to return permissions"
```

---

### Task 8: Update seed to use permissions instead of UserType

**Files:**
- Modify: `backend/seed/seed.go`

**Step 1: Update SeedUsers**

Replace the `SeedUsers` function in `backend/seed/seed.go`:

```go
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
```

Also add `"socialpredict/models"` to imports if not already present (it already is).

**Step 2: Run build and tests**

Run: `cd backend && go build ./...`
Expected: PASS

**Step 3: Commit**

```bash
git add backend/seed/seed.go
git commit -m "feat: update seed to assign permissions instead of UserType"
```

---

### Task 9: Update remaining backend references to UserType

**Files:**
- Modify: `backend/handlers/users/privateuser/privateuser.go` — remove `UserType` from `CombinedUserResponse` and response mapping
- Modify: `backend/handlers/stats/statshandler.go` — remove or update the query at line 107 that counts `REGULAR` users (count all users instead, or count users without `create_users` permission)
- Modify: `backend/models/modelstesting/testhelpers.go` — remove `UserType: "regular"` from `GenerateUser`
- Modify: `backend/handlers/users/publicuser/publicuser_test.go` — remove `UserType` from test data
- Modify: `backend/handlers/users/credit/usercredit_test.go` — remove `UserType` from test data
- Modify: `backend/handlers/cms/homepage/http/handler_test.go` — replace `admin.UserType = "ADMIN"` with permission assignment
- Modify: `frontend/src/tests/TestData.js` — remove `usertype` from test data

**Step 1: Update privateuser.go**

In `backend/handlers/users/privateuser/privateuser.go`, remove the `UserType` field from `CombinedUserResponse` (line 18) and remove `UserType: publicInfo.UserType` from the response mapping (line 51).

**Step 2: Update statshandler.go**

In `backend/handlers/stats/statshandler.go`, change line 107 from:
```go
if err := db.Model(&models.User{}).Where("user_type = ?", "REGULAR").Count(&userCount).Error; err != nil {
```
to:
```go
if err := db.Model(&models.User{}).Count(&userCount).Error; err != nil {
```

(Count all users for total money calculation — or adjust the logic as needed. The simplest fix is counting all users.)

**Step 3: Update test helpers**

In `backend/models/modelstesting/testhelpers.go`, remove `UserType: "regular"` from the `GenerateUser` function (line 70).

**Step 4: Update test files**

In `backend/handlers/users/publicuser/publicuser_test.go`, remove `UserType` fields from test user structs (lines 18, 44).

In `backend/handlers/users/credit/usercredit_test.go`, remove `UserType: "REGULAR"` from the test user struct (line 33).

In `backend/handlers/cms/homepage/http/handler_test.go`, replace line 70:
```go
admin.UserType = "ADMIN"
```
with:
```go
// Grant edit_homepage permission to admin
editPerm := models.Permission{Name: "edit_homepage", Description: "Edit homepage content"}
db.FirstOrCreate(&editPerm, models.Permission{Name: "edit_homepage"})
db.Model(&admin).Association("Permissions").Append(&editPerm)
```

In `frontend/src/tests/TestData.js`, remove the `"usertype":"REGULAR"` line (line 16).

**Step 5: Run all tests**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./... -v`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove all UserType references from backend"
```

---

### Task 10: Update frontend AuthContext

**Files:**
- Modify: `frontend/src/helpers/AuthContent.jsx`

**Step 1: Replace usertype with permissions**

Replace `frontend/src/helpers/AuthContent.jsx` with:

```jsx
import { API_URL } from './../config';
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({
    username: null,
    setUsername: () => {},
    isLoggedIn: false,
    permissions: [],
    changePasswordNeeded: true,
    login: () => {},
    logout: () => {},
});

const useAuth = () => useContext(
    AuthContext
);

const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState({
        isLoggedIn: false,
        token: localStorage.getItem('token'),
        username: localStorage.getItem('username'),
        permissions: JSON.parse(localStorage.getItem('permissions') || '[]'),
        changePasswordNeeded: null
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setAuthState(prevState => ({
                ...prevState,
                isLoggedIn: true,
                token: token,
                username: localStorage.getItem('username'),
                permissions: JSON.parse(localStorage.getItem('permissions') || '[]'),
                changePasswordNeeded: localStorage.getItem('changePasswordNeeded') === 'true',
            }));
        }
    }, []);

    const login = async (username, password) => {
        try {
            const response = await fetch(`${API_URL}/v0/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const text = await response.text();
            let data = {};

            try {
                data = JSON.parse(text);
            } catch (parseError) {
                data = { error: text || 'Unknown error occurred' };
            }

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                localStorage.setItem('permissions', JSON.stringify(data.permissions || []));
                localStorage.setItem('changePasswordNeeded', data.mustChangePassword);
                setAuthState({
                    isLoggedIn: true,
                    token: data.token,
                    username: data.username,
                    permissions: data.permissions || [],
                    changePasswordNeeded: data.mustChangePassword,
                });
                return true;
            } else {
                const errorMessage = data.error || data.message || `HTTP ${response.status}: ${text}`;
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.clear();
        setAuthState({
            isLoggedIn: false,
            token: null,
            username: null,
            permissions: [],
            changePasswordNeeded: null,
        });
    };

    return (
        <AuthContext.Provider value={{ ...authState, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export { useAuth, AuthProvider, AuthContext };
```

Key changes:
- `usertype` → `permissions` (array)
- `localStorage` stores `permissions` as JSON string
- Removed the `useEffect` that checked `usertype`

**Step 2: Commit**

```bash
git add frontend/src/helpers/AuthContent.jsx
git commit -m "feat: replace usertype with permissions in frontend auth context"
```

---

### Task 11: Update frontend routes and navigation

**Files:**
- Modify: `frontend/src/helpers/AppRoutes.jsx`
- Modify: `frontend/src/components/topnav/TopNav.jsx`

**Step 1: Update AppRoutes.jsx**

Replace the route access control logic in `frontend/src/helpers/AppRoutes.jsx`. Change lines 20-25 from:

```jsx
const auth = useAuth();
const isLoggedIn = !!auth.username;
const isRegularUser = isLoggedIn && auth.usertype !== 'ADMIN';
const mustChangePassword = isLoggedIn && auth.changePasswordNeeded;
```

to:

```jsx
const auth = useAuth();
const isLoggedIn = !!auth.username;
const permissions = auth.permissions || [];
const hasPermission = (perm) => permissions.includes(perm);
const mustChangePassword = isLoggedIn && auth.changePasswordNeeded;
```

Then update the route guards:

- `/create` route (line 84): replace `isRegularUser` with `hasPermission('create_markets')`
- `/notifications` route (line 95): replace `isRegularUser` with `isLoggedIn` (notifications don't need special permissions)
- `/profile` route (line 102): replace `isRegularUser` with `isLoggedIn` (profile access for all logged-in users)
- `/admin` route (line 109): replace `auth.usertype === 'ADMIN'` with `hasPermission('create_users')`

**Step 2: Update TopNav.jsx**

In `frontend/src/components/topnav/TopNav.jsx`:

Update `UserMenu` component (line 7) — change props from `{ username, usertype, userCredit, onLogout }` to `{ username, permissions, userCredit, onLogout }`.

Change line 42 from:
```jsx
{usertype === 'ADMIN' && (
```
to:
```jsx
{permissions.includes('create_users') && (
```

Change line 59-64 — wrap "Create Market" link in permission check:
```jsx
{permissions.includes('create_markets') && (
  <Link
    to="/create"
    className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
    onClick={() => setIsOpen(false)}
  >
    Create Market
  </Link>
)}
```

Update line 78 from:
```jsx
const { isLoggedIn, username, usertype, logout, changePasswordNeeded } = useAuth();
```
to:
```jsx
const { isLoggedIn, username, permissions, logout, changePasswordNeeded } = useAuth();
```

Update line 127 from:
```jsx
usertype={usertype}
```
to:
```jsx
permissions={permissions || []}
```

**Step 3: Commit**

```bash
git add frontend/src/helpers/AppRoutes.jsx frontend/src/components/topnav/TopNav.jsx
git commit -m "feat: update frontend routes and nav to use permissions"
```

---

### Task 12: Update create user form with permission selection

**Files:**
- Modify: `frontend/src/components/layouts/admin/AddUser.jsx`

**Step 1: Update AddUser component**

Replace `frontend/src/components/layouts/admin/AddUser.jsx` with:

```jsx
import { API_URL, DOMAIN_URL } from '../../../config';
import React, { useState, useEffect } from 'react';
import SiteButton from '../../buttons/SiteButtons';
import { RegularInput } from '../../inputs/InputBar'

function AdminAddUser() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState([]);

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/v0/permissions`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setAvailablePermissions(data);
                }
            } catch (err) {
                console.error('Failed to fetch permissions:', err);
            }
        };
        fetchPermissions();
    }, []);

    const handleUsernameChange = (event) => {
        setUsername(event.target.value);
    };

    const togglePermission = (permName) => {
        setSelectedPermissions(prev =>
            prev.includes(permName)
                ? prev.filter(p => p !== permName)
                : [...prev, permName]
        );
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/v0/users/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ username, permissions: selectedPermissions })
            });
            if (!response.ok) {
                const errMessage = await response.text()
                throw new Error(`HTTP error! Status: ${response.status} Reason: ${errMessage}`);
            }
            const data = await response.json();
            setPassword(data.password);
        } catch (err) {
            console.error('Failed to create user:', err);
            setError(err.message || 'Failed to create user');
        }
    };

    const handleCopyCredentials = () => {
        const credentials = `${DOMAIN_URL} \n Username: ${username}\nPassword: ${password}`;
        navigator.clipboard.writeText(credentials).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleReset = () => {
        setUsername('');
        setPassword('');
        setError('');
        setCopied(false);
        setSelectedPermissions([]);
    };

    return (
        <div className="p-6 bg-primary-background shadow-md rounded-lg text-white">
            <h1 className="text-2xl font-bold mb-4">Create User</h1>
                <div className='Center-content-table'>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <RegularInput
                            type="text"
                            value={username}
                            onChange={handleUsernameChange}
                            placeholder="All lowercase letters and numbers"
                            required
                        />
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">Permissions</label>
                            {availablePermissions.map(perm => (
                                <label key={perm.name} className="flex items-center gap-2 text-sm text-gray-300">
                                    <input
                                        type="checkbox"
                                        checked={selectedPermissions.includes(perm.name)}
                                        onChange={() => togglePermission(perm.name)}
                                        className="rounded border-gray-600"
                                    />
                                    {perm.description || perm.name}
                                </label>
                            ))}
                        </div>
                        <SiteButton type="submit">
                            Add User
                        </SiteButton>
                    </form>
                    {password && (
                        <>
                            <div onClick={handleCopyCredentials} className="mt-4 p-4 bg-blue-500 text-white font-bold text-lg rounded-lg shadow-lg cursor-pointer flex justify-between items-center">
                                <div>
                                    <p>Username: {username}</p>
                                    <p>Password: {password}</p>
                                </div>
                                <div className="text-lg">
                                    📋
                                </div>
                                {copied && <p className="text-green-500">COPIED!</p>}
                            </div>
                            <div className="mt-24">
                                <SiteButton onClick={handleReset} className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                                    Add Another User
                                </SiteButton>
                            </div>
                        </>
                    )}

                    {error && <p className="error">{error}</p>}
                </div>
            </div>
    );
}

export default AdminAddUser;
```

Key changes:
- Fetches available permissions from `GET /v0/permissions` on mount
- Adds checkbox list for permission selection
- Sends selected permissions in the request body
- API URL changed from `/v0/admin/createuser` to `/v0/users/create`

**Step 2: Commit**

```bash
git add frontend/src/components/layouts/admin/AddUser.jsx
git commit -m "feat: add permission selection to create user form"
```

---

### Task 13: Run full test suite and verify

**Step 1: Run backend tests**

Run: `cd backend && JWT_SIGNING_KEY="test-key" go test ./... -v`
Expected: All tests PASS

**Step 2: Run frontend build**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors

**Step 3: Fix any remaining issues**

Address any test failures or build errors found.

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve test and build issues from permissions migration"
```
