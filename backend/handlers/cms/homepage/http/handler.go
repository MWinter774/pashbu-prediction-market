package http

import (
	"encoding/json"
	"net/http"
	"socialpredict/handlers/cms/homepage"
	"socialpredict/middleware"
	"socialpredict/util"
)

type Handler struct {
	svc *homepage.Service
}

func NewHandler(svc *homepage.Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) PublicGet(w http.ResponseWriter, r *http.Request) {
	item, err := h.svc.GetHome()
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"title":     item.Title,
		"format":    item.Format,
		"html":      item.HTML,
		"markdown":  item.Markdown,
		"version":   item.Version,
		"updatedAt": item.UpdatedAt,
	})
}

type updateReq struct {
	Title    string `json:"title"`
	Format   string `json:"format"`
	Markdown string `json:"markdown"`
	HTML     string `json:"html"`
	Version  uint   `json:"version"`
}

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
