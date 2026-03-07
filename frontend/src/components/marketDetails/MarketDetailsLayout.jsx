import React, { useState } from 'react';
import ResolutionAlert from '../resolutions/ResolutionAlert';
import MarketChart from '../charts/MarketChart';
import ActivityTabs from '../tabs/ActivityTabs';
import ResolveModalButton from '../modals/resolution/ResolveModal';
import TradeSidebar from '../trade/TradeSidebar';
import TradeCTA from '../TradeCTA';
import formatResolutionDate from '../../helpers/formatResolutionDate';
import { API_URL } from '../../config';

function MarketDetailsLayout({
  market,
  creator,
  numUsers,
  totalVolume,
  marketDust,
  currentProbability,
  probabilityChanges,
  marketId,
  username,
  isLoggedIn,
  token,
  refetchData,
}) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTransactionSuccess = () => {
    setShowTradeModal(false);
    if (refetchData) refetchData();
    setRefreshTrigger((prev) => prev + 1);
  };

  const shouldShowTradeButtons =
    !market.isResolved && isLoggedIn && new Date(market.resolutionDateTime) > new Date();

  const imageUrl = market.imageUrl
    ? `${API_URL}/v0/uploads/markets/${market.imageUrl}`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <ResolutionAlert
        isResolved={market.isResolved}
        resolutionResult={market.resolutionResult}
        market={market}
      />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-6">
        {/* Left column */}
        <div className="min-w-0">
          {/* Market header */}
          <div className="flex items-start gap-4 mb-6">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={market.questionTitle}
                className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">
                {market.questionTitle}
              </h1>
            </div>
          </div>

          {/* Probability display */}
          <div className="mb-2">
            <span className="text-3xl font-bold text-pm-yes">
              {Math.round(currentProbability * 100)}% chance
            </span>
          </div>

          {/* Chart */}
          <div className="mb-4">
            <MarketChart
              data={probabilityChanges}
              currentProbability={currentProbability}
              title=""
              className="w-full"
              closeDateTime={market.resolutionDateTime}
              yesLabel={market.yesLabel}
              noLabel={market.noLabel}
            />
          </div>

          {/* Inline stats */}
          <div className="flex items-center gap-4 text-sm text-pm-muted mb-6">
            <span>{Math.round(totalVolume)} Vol.</span>
            <span>|</span>
            <span>
              {market.isResolved
                ? 'Closed'
                : formatResolutionDate(market.resolutionDateTime)}
            </span>
          </div>

          {/* Resolve button (creator only) */}
          {username === market.creatorUsername && !market.isResolved && (
            <div className="mb-6">
              <ResolveModalButton
                marketId={marketId}
                token={token}
                market={market}
                disabled={!token}
                className="text-xs px-4 py-2"
              />
            </div>
          )}

          {/* Rules section */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-white mb-2">Rules</h2>
            <p
              className={`text-sm text-gray-300 whitespace-pre-wrap break-words ${
                showFullDescription ? '' : 'line-clamp-3'
              }`}
            >
              {market.description}
            </p>
            {market.description && market.description.length > 200 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-sm text-blue-400 hover:text-blue-300 mt-1"
              >
                {showFullDescription ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {/* Activity tabs */}
          <div className="mb-4">
            <ActivityTabs
              marketId={marketId}
              market={market}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>

        {/* Right column - Trade sidebar (desktop only) */}
        <div className="hidden md:block">
          <div className="sticky top-6">
            <TradeSidebar
              market={market}
              marketId={marketId}
              currentProbability={currentProbability}
              token={token}
              isLoggedIn={isLoggedIn}
              onTransactionSuccess={handleTransactionSuccess}
            />
          </div>
        </div>
      </div>

      {/* Mobile floating CTA */}
      {shouldShowTradeButtons && (
        <TradeCTA onClick={() => setShowTradeModal(true)} disabled={!token} />
      )}

      {/* Mobile trade modal */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end md:hidden z-50">
          <div className="w-full bg-pm-card rounded-t-2xl p-5 pb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Trade</h3>
              <button
                onClick={() => setShowTradeModal(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <TradeSidebar
              market={market}
              marketId={marketId}
              currentProbability={currentProbability}
              token={token}
              isLoggedIn={isLoggedIn}
              onTransactionSuccess={handleTransactionSuccess}
            />
          </div>
        </div>
      )}

      {/* Mobile spacer */}
      <div className="h-24 md:hidden" />
    </div>
  );
}

export default MarketDetailsLayout;
