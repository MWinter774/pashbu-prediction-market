# Polymarket-Style Blue Default Buttons

## Problem

Action buttons across the app start gray (`bg-custom-gray-light`) and only change color after clicking (toggle pattern). This makes them look disabled/inactive. The Login and RESOLVE buttons are the most visible examples.

## Design

Restyle all action buttons to match Polymarket's "Deposit" button: solid blue, rounded, always actionable-looking.

### New default button style

- Color: `pm-blue` (#2d7cf6), hover: `pm-blue-hover` (#2563eb)
- Shape: `rounded-lg` (more rounded than current `rounded`)
- Always visible — no gray default state, no toggle pattern

### Changes by component

| Component | Current | New |
|---|---|---|
| `BaseButton.buttonBaseStyle` | gray border, basic rounded | blue bg, rounded-lg, no border |
| `SiteButton` | gray → pink toggle | always blue, no toggle state |
| `ResolveButton` | gray → neutral toggle | always blue |
| `DescriptionButton` | gray → pink toggle | always blue |
| `ProfileEditButton` | gray → pink toggle | always blue |
| `LoginModal` button | hardcoded pink | use new blue style |
| `BetButtons` | gray default | blue default |
| `SiteTabs` active | pink active | blue active |
| `MarketSearch` submit | pink | blue |

### Unchanged

- YES/NO resolution buttons (green/red convey semantic meaning)
- Trade confirm buttons (green/red based on direction)
- Form inputs (gray backgrounds are appropriate for inputs)
- `DatetimeSelector` container (input, not a button)
