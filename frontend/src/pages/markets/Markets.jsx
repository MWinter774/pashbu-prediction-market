import React from 'react';
import { useLocation } from 'react-router-dom';
import MarketsByStatusTable from '../../components/tables/MarketsByStatusTable';
import { TAB_TO_STATUS } from '../../utils/statusMap';

function Markets() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const activeStatus = params.get('status') || 'Active';

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">All markets</h1>
      </div>

      <div className="mt-6">
        <MarketsByStatusTable status={TAB_TO_STATUS[activeStatus] || 'active'} />
      </div>
    </div>
  );
}

export default Markets;
