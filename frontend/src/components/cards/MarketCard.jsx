import React from 'react';
import { Link, useHistory } from 'react-router-dom';

const MarketCard = ({ marketData }) => {
  const history = useHistory();
  const { market, lastProbability, totalVolume } = marketData;
  const yesLabel = market.yesLabel || 'YES';
  const noLabel = market.noLabel || 'NO';
  const yesPct = (lastProbability * 100).toFixed(0);

  const handleBetClick = (e, side) => {
    e.preventDefault();
    e.stopPropagation();
    history.push(`/markets/${market.id}?side=${side}`);
  };

  return (
    <Link
      to={`/markets/${market.id}`}
      className="block bg-pm-card border border-pm-card-border rounded-xl p-4 hover:border-gray-500 transition-colors"
    >
      {/* Header: Icon + Title */}
      <div className="flex items-start gap-3 mb-4">
        {market.imageUrl ? (
          <img
            src={market.imageUrl}
            alt=""
            className="w-10 h-10 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-pm-hover shrink-0 flex items-center justify-center text-pm-muted text-lg">
            ?
          </div>
        )}
        <h3 className="text-white font-semibold text-sm line-clamp-2">
          {market.questionTitle}
        </h3>
      </div>

      {/* Probability */}
      <div className="mb-4">
        <span className="text-2xl font-bold text-white">{yesPct}%</span>
        <span className="text-sm text-pm-muted ml-1">chance</span>
      </div>

      {/* Yes / No Buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={(e) => handleBetClick(e, 'yes')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold bg-pm-yes/15 text-pm-yes border border-pm-yes/30 hover:bg-pm-yes/25 transition-colors"
        >
          {yesLabel}
        </button>
        <button
          onClick={(e) => handleBetClick(e, 'no')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold bg-pm-no/15 text-pm-no border border-pm-no/30 hover:bg-pm-no/25 transition-colors"
        >
          {noLabel}
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-pm-muted pt-2 border-t border-pm-card-border">
        <span>Vol: {totalVolume}</span>
      </div>
    </Link>
  );
};

export default MarketCard;
