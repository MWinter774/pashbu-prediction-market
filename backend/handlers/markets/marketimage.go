package marketshandlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"socialpredict/middleware"
	"socialpredict/models"
	"socialpredict/util"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

const maxImageSize = 2 << 20 // 2MB

var allowedContentTypes = map[string]string{
	"image/png":  ".png",
	"image/jpeg": ".jpg",
	"image/webp": ".webp",
}

func UploadMarketImageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method is not supported.", http.StatusMethodNotAllowed)
		return
	}

	db := util.GetDB()

	// Authenticate user
	user, httperr := middleware.ValidateTokenAndGetUser(r, db)
	if httperr != nil {
		http.Error(w, httperr.Error(), httperr.StatusCode)
		return
	}

	// Get market ID from URL
	vars := mux.Vars(r)
	marketIdStr := vars["marketId"]
	marketId, err := strconv.ParseUint(marketIdStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid market ID", http.StatusBadRequest)
		return
	}

	// Find the market
	var market models.Market
	result := db.First(&market, marketId)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			http.Error(w, "Market not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Error accessing database", http.StatusInternalServerError)
		return
	}

	// Check permissions: market creator OR admin (user with create_users permission)
	if market.CreatorUsername != user.Username {
		// Load permissions to check for admin
		if err := db.Model(user).Association("Permissions").Find(&user.Permissions); err != nil {
			http.Error(w, "Failed to load permissions", http.StatusInternalServerError)
			return
		}
		if !user.HasPermission("create_users") {
			http.Error(w, "You do not have permission to upload an image for this market", http.StatusForbidden)
			return
		}
	}

	// Parse multipart form with max 2MB
	if err := r.ParseMultipartForm(maxImageSize); err != nil {
		http.Error(w, "File too large or invalid form data", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "Image file is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file size
	if header.Size > maxImageSize {
		http.Error(w, "File size exceeds 2MB limit", http.StatusBadRequest)
		return
	}

	// Validate content type
	contentType := header.Header.Get("Content-Type")
	ext, ok := allowedContentTypes[contentType]
	if !ok {
		http.Error(w, fmt.Sprintf("Invalid content type: %s. Allowed: image/png, image/jpeg, image/webp", contentType), http.StatusBadRequest)
		return
	}

	// Ensure upload directory exists
	uploadDir := "./uploads/markets"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		http.Error(w, "Failed to create upload directory", http.StatusInternalServerError)
		return
	}

	// Generate UUID filename
	filename := uuid.New().String() + ext
	filePath := filepath.Join(uploadDir, filename)

	// Delete old image if one exists
	if market.ImageURL != "" {
		oldFilename := filepath.Base(market.ImageURL)
		oldPath := filepath.Join(uploadDir, oldFilename)
		// Best effort delete; ignore errors if file doesn't exist
		os.Remove(oldPath)
	}

	// Save the new file
	dst, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Failed to save image", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	// Copy file content to destination
	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "Failed to write image file", http.StatusInternalServerError)
		return
	}

	// Update market ImageURL
	imageURL := "/v0/uploads/markets/" + filename
	market.ImageURL = imageURL
	if err := db.Save(&market).Error; err != nil {
		// Clean up the file we just wrote
		os.Remove(filePath)
		http.Error(w, "Failed to update market", http.StatusInternalServerError)
		return
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"imageUrl": imageURL})
}

// ServeMarketImages returns an http.Handler that serves uploaded market images.
func ServeMarketImages() http.Handler {
	// Strip the URL prefix and serve from the uploads directory
	fs := http.FileServer(http.Dir("./uploads/markets"))
	return http.StripPrefix("/v0/uploads/markets/", fs)
}

