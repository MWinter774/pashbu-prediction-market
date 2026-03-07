import React from 'react';
import { Link } from 'react-router-dom';
import formatResolutionDate from '../../helpers/formatResolutionDate';
import { getResolvedText, getResultCssClass } from '../../utils/labelMapping';

const MarketCard = ({ marketData }) => {
  const { market, creator, lastProbability, numUsers, totalVolume } = marketData;
  const yesLabel = market.yesLabel || 'YES';
  const noLabel = market.noLabel || 'NO';
  const yesPct = (lastProbability * 100).toFixed(0);
  const noPct = (100 - lastProbability * 100).toFixed(0);

  return (
    <Link
      to={`/markets/${market.id}`}
      className="block bg-pm-card border border-pm-card-border rounded-xl p-4 hover:border-gray-500 transition-colors"
    >
      <h3 className="text-white font-semibold text-sm mb-3 line-clamp-2">
        {market.questionTitle}
      </h3>

      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">{yesLabel}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{yesPct}%</span>
            <span className="px-2 py-0.5 text-xs font-medium rounded border border-pm-yes text-pm-yes">
              Yes
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded border border-pm-no text-pm-no">
              No
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">{noLabel}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{noPct}%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-pm-muted pt-2 border-t border-pm-card-border">
        <span>Vol: {totalVolume}</span>
        <span>{numUsers}</span>
        <span>
          {market.isResolved ? (
            <span className={getResultCssClass(market.resolutionResult)}>
              {getResolvedText(market.resolutionResult, market)}
            </span>
          ) : (
            formatResolutionDate(market.resolutionDateTime)
          )}
        </span>
      </div>
    </Link>
  );
};

export default MarketCard;
