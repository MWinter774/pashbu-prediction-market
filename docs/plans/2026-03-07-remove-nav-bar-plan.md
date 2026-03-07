# Remove Polls/Stats/About Nav Bar — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the secondary nav bar (Polls/Stats/About), delete all Polls resources, and move Stats & About links into the user dropdown (logged-in) and a new hamburger menu (logged-out).

**Architecture:** The nav links row in TopNav is replaced by adding items to the existing UserMenu dropdown and a new GuestMenu hamburger dropdown that mirrors UserMenu's pattern (click-outside-to-close, same styling). All Polls frontend resources are deleted. Backend stats endpoint and frontend Stats/About pages remain.

**Tech Stack:** React, React Router v5, Tailwind CSS

---

### Task 1: Delete Polls page and route

**Files:**
- Delete: `frontend/src/pages/polls/Polls.jsx`
- Modify: `frontend/src/helpers/AppRoutes.jsx`

**Step 1: Delete the Polls page file**

```bash
rm frontend/src/pages/polls/Polls.jsx
rmdir frontend/src/pages/polls
```

**Step 2: Remove Polls import and route from AppRoutes.jsx**

In `frontend/src/helpers/AppRoutes.jsx`, remove:
- Line 7: `import Polls from '../pages/polls/Polls';`
- Lines 46-52: The `/polls` route block

**Step 3: Verify the app still builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no Polls references

**Step 4: Commit**

```bash
git add -A frontend/src/pages/polls frontend/src/helpers/AppRoutes.jsx
git commit -m "feat: remove Polls page and route"
```

---

### Task 2: Clean up Polls SVG icons and Header references

**Files:**
- Modify: `frontend/src/assets/components/SvgIcons.jsx`
- Modify: `frontend/src/components/header/Header.jsx`

**Step 1: Remove PollsSVG from SvgIcons.jsx**

In `frontend/src/assets/components/SvgIcons.jsx`:
- Remove the `PollsSVG` component definition (lines 53-55)
- Remove `PollsSVG` from the export block

**Step 2: Remove Polls link from Header.jsx**

In `frontend/src/components/header/Header.jsx`, remove:
```jsx
<li>
    <Link to="/polls" className="header-link">Polls</Link>
</li>
```

**Step 3: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add frontend/src/assets/components/SvgIcons.jsx frontend/src/components/header/Header.jsx
git commit -m "feat: remove Polls SVG icon and Header link"
```

---

### Task 3: Remove nav links row from TopNav

**Files:**
- Modify: `frontend/src/components/topnav/TopNav.jsx`

**Step 1: Remove the nav links row**

In `frontend/src/components/topnav/TopNav.jsx`, delete lines 138-151 (the entire `{/* Nav links row */}` div).

**Step 2: Verify build and visually confirm**

Run: `cd frontend && npm run build`
Open `http://localhost:5174/` — the Polls/Stats/About row should be gone.

**Step 3: Commit**

```bash
git add frontend/src/components/topnav/TopNav.jsx
git commit -m "feat: remove Polls/Stats/About nav links row from TopNav"
```

---

### Task 4: Add Stats and About to UserMenu dropdown

**Files:**
- Modify: `frontend/src/components/topnav/TopNav.jsx`

**Step 1: Add Stats and About links to the UserMenu dropdown**

In the `UserMenu` component, after the Logout button (before the closing `</div>` of the dropdown), add a separator and the two links:

```jsx
          <div className="border-t border-pm-card-border my-1" />
          <Link
            to="/stats"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            Stats
          </Link>
          <Link
            to="/about"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
```

Insert these BEFORE the Logout button, after the last Link (Create Market or Alerts depending on permissions).

**Step 2: Verify build and visually confirm**

Run: `cd frontend && npm run build`
Log in at `http://localhost:5174/`, click the user dropdown — Stats and About should appear.

**Step 3: Commit**

```bash
git add frontend/src/components/topnav/TopNav.jsx
git commit -m "feat: add Stats and About links to UserMenu dropdown"
```

---

### Task 5: Add GuestMenu hamburger for logged-out users

**Files:**
- Modify: `frontend/src/components/topnav/TopNav.jsx`

**Step 1: Add a GuestMenu component**

Add this component above the `TopNav` component in `TopNav.jsx`:

```jsx
const GuestMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-2 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-pm-hover transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-pm-card border border-pm-card-border rounded-lg shadow-lg py-1 z-50">
          <Link
            to="/stats"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            Stats
          </Link>
          <Link
            to="/about"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
        </div>
      )}
    </div>
  );
};
```

**Step 2: Add GuestMenu next to LoginModalButton**

In the TopNav component, change the logged-out section from:

```jsx
{!isLoggedIn ? (
  <div className="flex items-center gap-2">
    <LoginModalButton />
  </div>
```

To:

```jsx
{!isLoggedIn ? (
  <div className="flex items-center gap-2">
    <LoginModalButton />
    <GuestMenu />
  </div>
```

**Step 3: Verify build and visually confirm**

Run: `cd frontend && npm run build`
Log out at `http://localhost:5174/` — a hamburger icon should appear next to the Log In button. Clicking it shows Stats and About.

**Step 4: Commit**

```bash
git add frontend/src/components/topnav/TopNav.jsx
git commit -m "feat: add hamburger menu with Stats/About for logged-out users"
```

---

### Task 6: Remove unused mobileMenuOpen state

**Files:**
- Modify: `frontend/src/components/topnav/TopNav.jsx`

**Step 1: Remove unused state**

In the `TopNav` component, remove:
```jsx
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
```

This was only used for the nav links row which is now gone.

**Step 2: Verify build**

Run: `cd frontend && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add frontend/src/components/topnav/TopNav.jsx
git commit -m "refactor: remove unused mobileMenuOpen state from TopNav"
```
