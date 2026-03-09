import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../helpers/AuthContent';
import useUserCredit from '../utils/userFinanceTools/FetchUserCredit';
import LoginModalButton from '../modals/login/LoginModalClick';
import NavSearchDropdown from '../search/NavSearchDropdown';
import FilterBar from './FilterBar';

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
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-pm-card border border-pm-card-border rounded-lg shadow-lg py-1 z-50">
          <div className="px-4 py-2 text-sm text-white border-b border-pm-card-border font-medium">
            @{username}
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
            to="/about"
            className="block md:hidden px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            About
          </Link>
          <Link
            to="/stats"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            Stats
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
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-lg shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pm-blue">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            <span className="hidden sm:inline">SocialPredict</span>
          </Link>

          {/* Search + About grouped together */}
          <div className="hidden md:flex items-center gap-4 ml-4">
            <div className="w-[500px]">
              <NavSearchDropdown />
            </div>
            <Link
              to="/about"
              className="flex items-center gap-1.5 text-sm font-medium text-pm-blue hover:text-pm-blue-hover transition-colors shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
              About
            </Link>
          </div>

          {/* Spacer pushes auth to the right */}
          <div className="flex-1" />

          {/* Right: Auth */}
          <div className="flex items-center gap-3">
            {!isLoggedIn ? (
              <>
                <LoginModalButton />
                <button
                  className="px-5 py-1.5 bg-pm-blue hover:bg-pm-blue-hover text-white text-sm font-bold rounded-full transition-colors"
                  onClick={() => {}}
                >
                  Sign Up
                </button>
                <GuestMenu />
              </>
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
              <div className="flex items-center gap-3">
                <span className="text-sm text-pm-muted">
                  🪙 {userCredit ?? '...'}
                </span>
                <UserMenu
                  username={username}
                  permissions={permissions || []}
                  userCredit={userCredit}
                  onLogout={logout}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <FilterBar />
    </nav>
  );
};

export default TopNav;
