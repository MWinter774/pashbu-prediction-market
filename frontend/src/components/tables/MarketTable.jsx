import React from 'react';
import MarketCardGrid from '../cards/MarketCardGrid';

// Pure table component that renders markets from props
const MarketTable = ({ markets }) => {
  // Handle empty or invalid markets data
  if (!markets || markets.length === 0) {
    return (
      <div className='p-4 text-center text-gray-400'>No markets found.</div>
    );
  }

  return <MarketCardGrid markets={markets} />;
};

export default MarketTable;
