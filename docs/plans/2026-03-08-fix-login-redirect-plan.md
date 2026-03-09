# Fix /login Redirect After Password Change — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** After changing password, redirect to home page with the login modal auto-opened instead of navigating to nonexistent `/login` route.

**Architecture:** URL query parameter `?showLogin=true` signals LoginModalButton to auto-open. ChangePasswordLayout redirects to `/?showLogin=true` instead of `/login`.

**Tech Stack:** React, react-router-dom v5 (useHistory, useLocation)

---

### Task 1: Fix the redirect in ChangePasswordLayout

**Files:**
- Modify: `frontend/src/components/layouts/changepassword/ChangePasswordLayout.jsx:57-62`

**Step 1: Update the redirect and success message**

In `frontend/src/components/layouts/changepassword/ChangePasswordLayout.jsx`, make two changes:

1. Line 57 — update the success message:
```jsx
// OLD:
setSuccess("Password changed successfully! Logging out. Please log in with your new password.");
// NEW:
setSuccess("Password changed successfully! Please log in with your new password.");
```

2. Line 62 — change the redirect target:
```jsx
// OLD:
history.push('/login'); // Redirect to login page
// NEW:
history.push('/?showLogin=true');
```

**Step 2: Manually test (if dev server running)**

1. Log in as admin (default: `admin` / `password`)
2. Navigate to `/changepassword`
3. Change password
4. Verify you land on `/?showLogin=true` (not `/login`)

**Step 3: Commit**

```bash
git add frontend/src/components/layouts/changepassword/ChangePasswordLayout.jsx
git commit -m "fix: redirect to /?showLogin=true instead of /login after password change"
```

---

### Task 2: Auto-open login modal from query parameter

**Files:**
- Modify: `frontend/src/components/modals/login/LoginModalClick.jsx`

**Step 1: Add useEffect to detect showLogin query param**

In `frontend/src/components/modals/login/LoginModalClick.jsx`, add `useEffect` and `useLocation` imports and a useEffect that checks for the query param on mount:

```jsx
import React, { useState, useEffect } from 'react';
import LoginModal from './LoginModal';
import { useAuth } from '../../../helpers/AuthContent';
import { useHistory, useLocation } from 'react-router-dom';
import { LoginSVG } from '../../../assets/components/SvgIcons';

const LoginModalButton = ({ iconOnly = false }) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { login } = useAuth();
  const [redirectAfterLogin, setRedirectAfterLogin] = useState('/');
  const history = useHistory();
  const location = useLocation();

  // Auto-open login modal when ?showLogin=true is in the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('showLogin') === 'true') {
      setIsLoginModalOpen(true);
      setRedirectAfterLogin('/');
      // Strip the query param from the URL so it doesn't persist
      history.replace('/');
    }
  }, [location.search, history]);

  const handleOpenModal = () => {
    setRedirectAfterLogin(history.location.pathname);
    setIsLoginModalOpen(true);
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className={`flex gap-3 items-center p-2 text-gray-300 rounded-lg hover:bg-gray-700 group transition-colors duration-200 ${
          iconOnly ? 'justify-center' : ''
        }`}
      >
        <LoginSVG
          className={`w-5 h-5 text-gray-400 group-hover:text-white transition-colors duration-200 ${
            iconOnly ? '' : 'mr-3'
          }`}
        />
        {!iconOnly && <span className='text-sm'>Login</span>}
      </button>
      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={login}
          redirectAfterLogin={redirectAfterLogin}
        />
      )}
    </>
  );
};

export default LoginModalButton;
```

Key changes from original:
- Added `useEffect` import
- Changed `useHistory` import to also include `useLocation`
- Added `const location = useLocation();`
- Added `useEffect` block that checks for `showLogin=true`, opens modal, and strips param

**Step 2: Manually test the full flow**

1. Navigate to `http://localhost:5173/?showLogin=true` while logged out
2. Verify the login modal opens automatically
3. Verify the URL changes to `http://localhost:5173/` (param stripped)
4. Close the modal, verify no re-opening
5. Test full flow: log in → change password → verify redirect opens login modal

**Step 3: Commit**

```bash
git add frontend/src/components/modals/login/LoginModalClick.jsx
git commit -m "feat: auto-open login modal when ?showLogin=true query param is present"
```
