import React, { useState } from 'react';
import CategoryTabs from '../../components/tabs/CategoryTabs';
import MarketsByStatusTable from '../../components/tables/MarketsByStatusTable';
import { TAB_TO_STATUS } from '../../utils/statusMap';

function Markets() {
  const [activeCategory, setActiveCategory] = useState('General');
  const [activeStatus, setActiveStatus] = useState('Active');

  return (
    <div>
      {/* "All markets" header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">All markets</h1>
      </div>

      <CategoryTabs
        activeCategory={activeCategory}
        activeStatus={activeStatus}
        onCategoryChange={setActiveCategory}
        onStatusChange={setActiveStatus}
      />

      <div className="mt-6">
        <MarketsByStatusTable status={TAB_TO_STATUS[activeStatus]} />
      </div>
    </div>
  );
}

export default Markets;
