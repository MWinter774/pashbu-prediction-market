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
