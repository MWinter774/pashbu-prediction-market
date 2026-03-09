import React, { useState, useRef, useEffect } from 'react';
import { useHistory, Link } from 'react-router-dom';
import { searchMarkets } from '../../api/marketsApi';
import { CATEGORIES } from '../../constants/categories';

const NavSearchDropdown = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const history = useHistory();

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global `/` shortcut to focus search
  useEffect(() => {
    const handleSlash = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleSlash);
    return () => document.removeEventListener('keydown', handleSlash);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchMarkets(query.trim(), 'all', 8);
        setResults(data);
      } catch (error) {
        console.error('Search error:', error);
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleFocus = () => {
    setIsOpen(true);
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleResultClick = (marketId) => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
    history.push(`/markets/${marketId}`);
  };

  const handleCategoryClick = () => {
    setIsOpen(false);
    setQuery('');
  };

  const hasQuery = query.trim().length > 0;
  const allResults = [
    ...(results?.primaryResults || []),
    ...(results?.fallbackResults || []),
  ];

  return (
    <div className="relative flex-1 max-w-lg" ref={containerRef}>
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pm-muted pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search markets..."
          className="w-full pl-9 pr-8 py-2 bg-pm-card border border-pm-card-border rounded-full text-sm text-white placeholder-pm-muted hover:border-gray-500 focus:border-gray-400 focus:outline-none transition-colors"
        />
        {query ? (
          <button
            onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-pm-muted hover:text-white text-xs"
          >
            ✕
          </button>
        ) : !isFocused ? (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-pm-muted bg-pm-page border border-pm-card-border rounded">
            /
          </kbd>
        ) : null}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-2 bg-pm-card border border-pm-card-border rounded-lg shadow-lg overflow-hidden z-50"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Browse mode: categories */}
          {!hasQuery && (
            <div className="p-2">
              <div className="px-2 py-1.5 text-xs font-medium text-pm-muted uppercase tracking-wider">
                Categories
              </div>
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat}
                  to={cat === 'General' ? '/' : `/?category=${cat}`}
                  onClick={handleCategoryClick}
                  className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-pm-hover transition-colors"
                >
                  <span className="text-sm text-white">{cat}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Search mode: live results */}
          {hasQuery && (
            <div>
              {loading && (
                <div className="px-4 py-3 text-sm text-pm-muted">Searching...</div>
              )}
              {!loading && allResults.length === 0 && results && (
                <div className="px-4 py-3 text-sm text-pm-muted">
                  No markets found for "{query}"
                </div>
              )}
              {allResults.map((item) => (
                <button
                  key={item.market.id}
                  onClick={() => handleResultClick(item.market.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pm-hover transition-colors text-left"
                >
                  {item.market.imageUrl ? (
                    <img
                      src={item.market.imageUrl}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-pm-hover shrink-0 flex items-center justify-center text-pm-muted text-sm">
                      ?
                    </div>
                  )}
                  <span className="text-sm text-white truncate flex-1">
                    {item.market.questionTitle}
                  </span>
                  <span className="text-sm font-semibold text-white shrink-0">
                    {(item.lastProbability * 100).toFixed(0)}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NavSearchDropdown;
