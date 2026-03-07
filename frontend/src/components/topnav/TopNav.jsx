import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../helpers/AuthContent';
import useUserCredit from '../utils/userFinanceTools/FetchUserCredit';
import LoginModalButton from '../modals/login/LoginModalClick';

const UserMenu = ({ username, usertype, userCredit, onLogout }) => {
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
          {usertype === 'ADMIN' && (
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
          <Link
            to="/create"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-pm-hover"
            onClick={() => setIsOpen(false)}
          >
            Create Market
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

const TopNav = () => {
  const { isLoggedIn, username, usertype, logout, changePasswordNeeded } = useAuth();
  const { userCredit } = useUserCredit(username);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              to="/markets"
              className="w-full px-4 py-2 bg-pm-card border border-pm-card-border rounded-full text-sm text-pm-muted hover:border-gray-500 transition-colors text-left"
            >
              Search markets...
            </Link>
          </div>

          {/* Right: Auth */}
          <div className="flex items-center gap-2">
            {/* Mobile search icon */}
            <Link
              to="/markets"
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              🔍
            </Link>

            {!isLoggedIn ? (
              <div className="flex items-center gap-2">
                <LoginModalButton />
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
                usertype={usertype}
                userCredit={userCredit}
                onLogout={logout}
              />
            )}
          </div>
        </div>
      </div>

      {/* Nav links row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-6 h-10 overflow-x-auto text-sm">
          <Link to="/" className="text-gray-400 hover:text-white whitespace-nowrap transition-colors">
            Home
          </Link>
          <Link to="/markets" className="text-gray-400 hover:text-white whitespace-nowrap transition-colors">
            Markets
          </Link>
          <Link to="/polls" className="text-gray-400 hover:text-white whitespace-nowrap transition-colors">
            Polls
          </Link>
          <Link to="/stats" className="text-gray-400 hover:text-white whitespace-nowrap transition-colors">
            Stats
          </Link>
          <Link to="/about" className="text-gray-400 hover:text-white whitespace-nowrap transition-colors">
            About
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
