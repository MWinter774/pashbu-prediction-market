import React, { useState } from 'react';
import CategoryTabs from '../../components/tabs/CategoryTabs';
import MarketsByStatusTable from '../../components/tables/MarketsByStatusTable';
import GlobalSearchBar from '../../components/search/GlobalSearchBar';
import SearchResultsTable from '../../components/tables/SearchResultsTable';
import { TAB_TO_STATUS } from '../../utils/statusMap';

function Markets() {
  const [activeCategory, setActiveCategory] = useState('General');
  const [activeStatus, setActiveStatus] = useState('Active');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div>
      {/* "All markets" header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">All markets</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 text-pm-muted hover:text-white transition-colors"
            aria-label="Search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Inline search bar (toggled) */}
      {showSearch && (
        <div className="mb-4">
          <GlobalSearchBar
            onSearchResults={setSearchResults}
            currentStatus={TAB_TO_STATUS[activeStatus]}
            isSearching={isSearching}
            setIsSearching={setIsSearching}
          />
        </div>
      )}

      <CategoryTabs
        activeCategory={activeCategory}
        activeStatus={activeStatus}
        onCategoryChange={setActiveCategory}
        onStatusChange={setActiveStatus}
      />

      <div className="mt-6">
        {isSearching ? (
          <SearchResultsTable searchResults={searchResults} />
        ) : (
          <MarketsByStatusTable status={TAB_TO_STATUS[activeStatus]} />
        )}
      </div>
    </div>
  );
}

export default Markets;
