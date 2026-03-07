import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../helpers/AuthContent';
import useUserCredit from '../utils/userFinanceTools/FetchUserCredit';
import LoginModalButton from '../modals/login/LoginModalClick';

const UserMenu = ({ username, permissions, userCredit, onLogout }) => {
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-pm-hover transition-colors"
      >
        <span>@{username}</span>
        <span className="text-pm-muted">▾</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-pm-card border border-pm-card-border rounded-lg shadow-lg py-1 z-50">
          <div className="px-4 py-2 text-sm text-pm-muted border-b border-pm-card-border">
            🪙 {userCredit ?? '...'}
          </div>
          <Link
            to="/profile"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            Profile
          </Link>
          {permissions.includes('create_users') && (
            <Link
              to="/admin"
              className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
          )}
          <Link
            to="/notifications"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            Alerts
          </Link>
          {permissions.includes('create_markets') && (
            <Link
              to="/create"
              className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
              onClick={() => setIsOpen(false)}
            >
              Create Market
            </Link>
          )}
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
          <button
            onClick={() => { onLogout(); setIsOpen(false); }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

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

const TopNav = () => {
  const { isLoggedIn, username, permissions, logout, changePasswordNeeded } = useAuth();
  const { userCredit } = useUserCredit(username);

  return (
    <nav className="sticky top-0 z-40 bg-pm-page border-b border-pm-card-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo */}
          <Link to="/" className="text-white font-bold text-lg shrink-0">
            SocialPredict
          </Link>

          {/* Center: Search (hidden on mobile, shown md+) */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <Link
              to="/"
              className="w-full px-4 py-2 bg-pm-card border border-pm-card-border rounded-full text-sm text-pm-muted hover:border-gray-500 transition-colors text-left"
            >
              Search markets...
            </Link>
          </div>

          {/* Right: Auth */}
          <div className="flex items-center gap-2">
            {/* Mobile search icon */}
            <Link
              to="/"
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              🔍
            </Link>

            {!isLoggedIn ? (
              <div className="flex items-center gap-2">
                <LoginModalButton />
                <GuestMenu />
              </div>
            ) : changePasswordNeeded ? (
              <div className="flex items-center gap-2">
                <Link to="/changepassword" className="text-sm text-gray-300 hover:text-white">
                  Change Password
                </Link>
                <button onClick={logout} className="text-sm text-gray-300 hover:text-white">
                  Logout
                </button>
              </div>
            ) : (
              <UserMenu
                username={username}
                permissions={permissions || []}
                userCredit={userCredit}
                onLogout={logout}
              />
            )}
          </div>
        </div>
      </div>

    </nav>
  );
};

export default TopNav;
