# User Permissions System Design

## Overview

Replace the existing role-based system (`UserType: ADMIN/REGULAR`) with a granular permission-based system. Users no longer have types — instead, each user has a set of permissions that control what actions they can perform.

## Data Model

### New Tables

**Permission**
| Column | Type | Constraints |
|--------|------|-------------|
| ID | int64 | primary key |
| Name | string | unique, not null |
| Description | string | |

**UserPermission (join table)**
| Column | Type | Constraints |
|--------|------|-------------|
| UserID | int64 | foreign key → User.ID |
| PermissionID | int64 | foreign key → Permission.ID |
| | | composite unique index on (UserID, PermissionID) |

### Seeded Permissions

| Name | Description |
|------|-------------|
| `create_markets` | Create prediction markets |
| `create_users` | Create new user accounts |
| `edit_homepage` | Edit homepage content |

### User Model Changes

- Remove `UserType` field from `PublicUser`
- Add `Permissions []Permission` GORM many-to-many relationship via `user_permissions` join table

### Migration

1. Create `permissions` and `user_permissions` tables
2. Seed the three permissions
3. Migrate existing `ADMIN` users: grant all permissions
4. Migrate existing `REGULAR` users: grant no permissions
5. Drop `user_type` column from `users`

## Backend Authorization

### New Middleware Function

```
ValidateUserHasPermission(r *http.Request, db *gorm.DB, permissionName string) (*models.User, *HTTPError)
```

- Authenticates user via existing JWT validation
- Checks `MustChangePassword` flag
- Queries `user_permissions` join table to verify the user has the required permission
- Returns 403 Forbidden if permission is missing

### Handler Changes

| Handler | Current Auth | New Auth |
|---------|-------------|----------|
| `CreateMarketHandler` | `ValidateUserAndEnforcePasswordChangeGetUser` | `ValidateUserHasPermission(r, db, "create_markets")` |
| `AddUserHandler` | `ValidateAdminToken` | `ValidateUserHasPermission(r, db, "create_users")` |
| `UpdateHomepageContent` | `ValidateAdminToken` | `ValidateUserHasPermission(r, db, "edit_homepage")` |

### Removed

- `ValidateAdminToken` function
- All `UserType` references throughout backend

## API Changes

### New Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/v0/permissions` | `create_users` permission | Returns list of all available permissions |

### Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/v0/login` | Response replaces `usertype` with `permissions` array of strings |
| `POST` | `/v0/users/create` | Replaces `/v0/admin/createuser`. Request body gains `permissions` string array. Requires `create_users` permission. |

## Frontend Changes

### Auth Context

- Replace `usertype` (string) with `permissions` (array of strings) in auth state and localStorage
- Login response parsing updated accordingly

### Route Access Control

- `/create` — requires `create_markets` permission
- `/admin` — requires `create_users` permission
- Remove all `isRegularUser` / `usertype === 'ADMIN'` checks

### Create User Form

- Add multi-select/checkbox list for permissions
- Fetch available permissions from `GET /v0/permissions`
- Send selected permissions in the create user request body

### UI Visibility

- Navigation items ("Create Market", "Admin") shown/hidden based on user's permissions array
- Users without relevant permissions don't see those options

## Seeded Admin User

The existing seeded admin user (from `ADMIN_PASSWORD` env) receives all three permissions on startup. There is no longer a special "admin" concept — the seeded user is simply a user with all permissions.

## Default Permissions for New Users

Configurable at creation time — the user with `create_users` permission chooses which permissions to grant. No default permissions are assigned automatically.
