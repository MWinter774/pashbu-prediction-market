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

  return (
    <div>
      <CategoryTabs
        activeCategory={activeCategory}
        activeStatus={activeStatus}
        onCategoryChange={setActiveCategory}
        onStatusChange={setActiveStatus}
      />

      <div className="mt-6">
        <GlobalSearchBar
          onSearchResults={setSearchResults}
          currentStatus={TAB_TO_STATUS[activeStatus]}
          isSearching={isSearching}
          setIsSearching={setIsSearching}
        />

        {isSearching ? (
          <SearchResultsTable searchResults={searchResults} />
        ) : (
          <MarketsByStatusTable status={TAB_TO_STATUS[activeStatus]} useCardGrid={true} />
        )}
      </div>
    </div>
  );
}

export default Markets;
