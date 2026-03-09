# Fix /login Redirect After Password Change

## Problem

`ChangePasswordLayout.jsx` redirects to `/login` after a successful password change, but `/login` is not a route. Login is handled via a modal popup. Users land on a 404 page.

## Solution

Use a URL query parameter (`?showLogin=true`) to signal the login modal should auto-open.

## Changes

### 1. ChangePasswordLayout.jsx
- Change `history.push('/login')` to `history.push('/?showLogin=true')`
- Update success message (remove "Logging out" phrasing)

### 2. LoginModalButton.jsx
- On mount, check `window.location.search` for `showLogin=true`
- If present, auto-open the login modal
- Strip the query param from the URL via `history.replace` so it doesn't persist

### 3. No other files change
LoginModalButton is used in both TopNav and Header, covering all layouts.

## Edge Cases

- Logged-in users navigating to `/?showLogin=true`: modal won't show since LoginModalButton isn't rendered for authenticated users
- Page refresh with `?showLogin=true`: still works, param triggers modal on mount
