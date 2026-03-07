import React from 'react';
import MarketCard from './MarketCard';

const MarketCardGrid = ({ markets }) => {
  if (!markets || markets.length === 0) {
    return (
      <div className="p-8 text-center text-pm-muted">No markets found.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {markets.map((marketData, index) => (
        <MarketCard key={marketData.market?.id ?? index} marketData={marketData} />
      ))}
    </div>
  );
};

export default MarketCardGrid;
