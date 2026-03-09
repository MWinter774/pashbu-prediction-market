# Polymarket-Style Login Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restyle the login modal and shared input components to match Polymarket's dark, cohesive aesthetic.

**Architecture:** Update shared `InputBar.jsx` components first (dark theme colors, remove emoji icons), then restyle `LoginModal.jsx` (dark card, "Welcome to SocialPredict" heading, backdrop click-to-close, Escape key). Two tasks, frontend-only changes.

**Tech Stack:** React 18, Tailwind CSS, existing pm-* color tokens

---

### Task 1: Update shared input components to dark theme

**Files:**
- Modify: `frontend/src/components/inputs/InputBar.jsx`

**Step 1: Update RegularInput styling**

Change `RegularInput` className from:
```
"w-full px-4 py-2 border-2 border-blue-500 rounded-md text-white bg-transparent focus:outline-none"
```
to:
```
"w-full px-4 py-2 border border-pm-card-border bg-pm-page rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
```

**Step 2: Update NumberInput styling**

Change `NumberInput` className from:
```
"w-full px-4 py-2 border-2 border-blue-500 rounded-md text-white bg-transparent focus:outline-none"
```
to:
```
"w-full px-4 py-2 border border-pm-card-border bg-pm-page rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
```

**Step 3: Update SuccessInput styling**

Change the outer div className from:
```
"flex items-center border-2 border-green-500 bg-transparent rounded-md"
```
to:
```
"flex items-center border border-green-500 bg-pm-page rounded-lg"
```

Change the inner input className from:
```
"flex-1 px-4 py-2 rounded-md text-white bg-transparent focus:outline-none"
```
to:
```
"flex-1 px-4 py-2 rounded-lg text-white bg-transparent focus:outline-none"
```

**Step 4: Update ErrorInput styling**

Change the outer div className from:
```
"flex items-center border-2 border-red-500 bg-transparent rounded-md"
```
to:
```
"flex items-center border border-red-500 bg-pm-page rounded-lg"
```

Change the inner input className from:
```
"flex-1 px-4 py-2 rounded-md text-white bg-transparent focus:outline-none"
```
to:
```
"flex-1 px-4 py-2 rounded-lg text-white bg-transparent focus:outline-none"
```

**Step 5: Simplify PersonInput — remove emoji, use placeholder only**

Replace the entire `PersonInput` component with:
```jsx
const PersonInput = ({ value, onChange }) => {
    return (
        <input
            type="text"
            placeholder="Username"
            value={value}
            onChange={onChange}
            className="w-full px-4 py-2 border border-pm-card-border bg-pm-page rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
    );
};
```

**Step 6: Simplify LockInput — remove emoji, use placeholder only**

Replace the entire `LockInput` component with:
```jsx
const LockInput = ({ value, onChange }) => {
    return (
        <input
            type="password"
            placeholder="Password"
            value={value}
            onChange={onChange}
            className="w-full px-4 py-2 border border-pm-card-border bg-pm-page rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
        />
    );
};
```

**Step 7: Verify visually**

Run: dev server should already be running at `http://localhost:5174`

Check these pages to confirm inputs look correct with the new dark styling:
- `http://localhost:5174/?showLogin=true` — PersonInput and LockInput in login modal
- Create market page — RegularInput
- Style guide page — all input variants

**Step 8: Commit**

```bash
git add frontend/src/components/inputs/InputBar.jsx
git commit -m "feat: update input components to dark Polymarket theme"
```

---

### Task 2: Restyle LoginModal to Polymarket aesthetic

**Files:**
- Modify: `frontend/src/components/modals/login/LoginModal.jsx`

**Step 1: Restyle the modal**

Replace the entire `LoginModal` component with:

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useHistory } from 'react-router-dom';
import { PersonInput, LockInput } from '../../inputs/InputBar';
import { useAuth } from '../../../helpers/AuthContent';

const LoginModal = ({ isOpen, onClose, onLogin, redirectAfterLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const history = useHistory();
    const { login, changePasswordNeeded } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const loginSuccess = await onLogin(username, password);
            if (loginSuccess) {
                onClose();
                history.push(redirectAfterLogin);
            } else {
                console.error('Login failed:', response.status, await response.text());
                setError('Error logging in.');
            }
        } catch (loginError) {
            console.error('Login error:', loginError);
            setError('An error occurred during login. Please try again.');
        }
    };

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-pm-card border border-pm-card-border rounded-xl p-8 max-w-sm w-full mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-white text-center mb-6">
                    Welcome to SocialPredict
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <PersonInput value={username} onChange={(e) => {
                        setUsername(e.target.value);
                    }} />
                    <LockInput value={password} onChange={(e) => {
                        setPassword(e.target.value);
                    }} />
                    {error && <div className="text-red-400 text-sm text-center">{error}</div>}
                    <button
                        type="submit"
                        className="w-full py-3 text-white font-semibold bg-pm-blue hover:bg-pm-blue-hover rounded-lg focus:outline-none transition-colors"
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>,
        document.getElementById('modal-root')
    );
};

export default LoginModal;
```

Key changes:
- Backdrop: `bg-black/50` with `onClick={onClose}` for click-outside-to-close
- Inner card: `onClick={(e) => e.stopPropagation()}` to prevent closing when clicking the form
- Card: `bg-pm-card border border-pm-card-border rounded-xl p-8`
- Heading: "Welcome to SocialPredict", bold, centered
- Escape key listener via `useEffect`/`useCallback`
- Removed X close button
- Error message styled with `text-red-400 text-sm text-center`
- Login button: `py-3 font-semibold` with `transition-colors`

**Step 2: Verify visually**

Open `http://localhost:5174/?showLogin=true` and confirm:
1. Dark card with subtle border appears centered
2. "Welcome to SocialPredict" heading is visible and centered
3. Username and password fields have dark styling with placeholder text (no emojis)
4. Login button is blue, full-width
5. Clicking outside the modal closes it
6. Pressing Escape closes the modal
7. Login still works (enter credentials and submit)

**Step 3: Commit**

```bash
git add frontend/src/components/modals/login/LoginModal.jsx
git commit -m "feat: restyle login modal to Polymarket dark aesthetic"
```
