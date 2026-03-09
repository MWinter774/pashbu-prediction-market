# Polymarket-style Top Bar Design

## Overview

Redesign the top navigation bar to match Polymarket's two-row layout: a main bar (logo, search, auth) and a category/status filter bar below it.

## Current State

Single-row TopNav with: "SocialPredict" text logo | centered search bar | Login + hamburger (guest) or user dropdown (logged in). Category/status filters live on the Markets page itself.

## Design

### Row 1 — Main Bar

Left to right:

- **Logo:** Placeholder SVG icon + "SocialPredict" wordmark. Icon-only on mobile.
- **Search bar:** Wider than current, `pm-card` background, rounded. `/` keyboard hint badge on the right side. Pressing `/` focuses the search from anywhere. Escape blurs. Existing dropdown behavior unchanged.
- **Right side (guest):** "About" text link | "Log In" text button | "Sign Up" accent button (Polymarket red style, no-op for now) | Hamburger menu (Stats inside).
- **Right side (logged in):** "About" text link | Credit balance (coin + amount) | Profile icon that opens existing dropdown (Profile, Dashboard, Create Market, Alerts, Stats, Logout). No hamburger for logged-in users.

### Row 2 — Filter Bar

Horizontal bar below Row 1, smaller text:

- **Layout:** "General" | vertical separator | "Active" | "Closed" | "Resolved" | "All"
- **Default:** "Active" selected
- **Styling:** Selected item bold/white with bottom border highlight. Inactive items muted.
- **Behavior:** Clicking a filter updates URL search params (`?status=active`). If not on homepage, navigates to `/?status=closed` etc.
- **Visibility:** Shows on every page, always.
- **Both rows sticky together** at top of viewport.

### Filter State via URL Params

- TopNav renders filter tabs as links updating `?category=` and `?status=` search params
- Markets page reads filters from URL search params instead of local state
- Existing filter tabs removed from Markets page
- Browser back/forward works naturally

### Responsive / Mobile

- **Row 1:** Search bar hidden on small screens (existing). Logo icon-only. "About" moves into hamburger. Login/SignUp stay visible but compact.
- **Row 2:** Horizontal scroll on overflow, no wrapping.

## Changes Summary

| Element | Before | After |
|---|---|---|
| Logo | Text only | Placeholder icon + text |
| Search | Narrow, centered | Wider, `/` shortcut, darker bg |
| Right (guest) | Login + hamburger | About + Log In + Sign Up + hamburger |
| Right (logged in) | Dropdown + hamburger | About + credit + profile dropdown |
| Row 2 | N/A | Category/status filter bar on all pages |
| Markets page filters | Own filter tabs | Removed, reads URL params |
| Sticky | Row 1 only | Both rows sticky |
