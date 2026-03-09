# Polymarket-Style Login Modal Redesign

## Goal

Restyle the login modal and shared input components to match Polymarket's dark, cohesive aesthetic.

## Current State

- Login modal: bright blue (`bg-blue-900`) card, emoji icons on inputs, X close button
- Input components: `border-2 border-blue-500`, emoji prefixes on PersonInput/LockInput
- Visually inconsistent with the dark Polymarket-inspired theme used elsewhere

## Design

### Login Modal (`LoginModal.jsx`)

- **Backdrop**: `bg-black/50`, click-to-close, Escape key to close
- **Card**: `bg-pm-card`, `border border-pm-card-border`, `rounded-xl`, `max-w-sm`, centered
- **Heading**: "Welcome to SocialPredict" — bold, white, text-xl, centered
- **Form**: Username and password fields stacked with gap-4, Login button below
- **Login button**: Full-width, `bg-pm-blue hover:bg-pm-blue-hover`, `rounded-lg`, `py-3`
- **No X button** — close by clicking outside or pressing Escape

### Input Components (`InputBar.jsx`)

All inputs updated to dark theme:

- **Border**: `border border-pm-card-border` (subtle gray)
- **Background**: `bg-pm-page` (dark, matches page)
- **Border radius**: `rounded-lg`
- **Focus**: `focus:border-gray-500` (subtle brightening)
- **Text**: white, placeholder `text-gray-400`

PersonInput/LockInput: drop emoji icons, use placeholder text only ("Username", "Password").

### Affected Components

These use shared inputs and will automatically adopt the new styling:
- AddUser form (`RegularInput`)
- ChangePassword form (`RegularInput`)
- Create market form (`RegularInput`)
- Trade buttons (`NumberInput`)
- Style guide page (all inputs)

## Approach

Update shared input components + LoginModal together (Approach B) for consistency across the entire app.
