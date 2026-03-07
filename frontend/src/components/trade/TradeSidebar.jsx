import React, { useState } from 'react';
import { useMarketLabels } from '../../hooks/useMarketLabels';
import { submitBet } from '../layouts/trade/TradeUtils';
import useUserCredit from '../utils/userFinanceTools/FetchUserCredit';
import { useAuth } from '../../helpers/AuthContent';

const TradeSidebar = ({ market, marketId, currentProbability, token, isLoggedIn, onTransactionSuccess }) => {
  const [mode, setMode] = useState('buy'); // 'buy' or 'sell'
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [amount, setAmount] = useState(0);
  const { yesLabel, noLabel } = useMarketLabels(market);
  const { username } = useAuth();
  const { userCredit } = useUserCredit(username);

  const yesPrice = Math.round(currentProbability * 100);
  const noPrice = 100 - yesPrice;

  const handleQuickAdd = (value) => {
    if (value === 'max') {
      setAmount(userCredit || 0);
    } else {
      setAmount((prev) => prev + value);
    }
  };

  const handleTrade = () => {
    if (!token) {
      alert('Please log in to trade.');
      return;
    }
    if (!selectedOutcome || amount < 1) {
      alert('Select an outcome and enter an amount.');
      return;
    }

    if (mode === 'buy') {
      submitBet(
        { marketId, amount, outcome: selectedOutcome },
        token,
        (data) => {
          alert(`Trade placed! ID: ${data.id}`);
          setAmount(0);
          setSelectedOutcome(null);
          onTransactionSuccess();
        },
        (error) => alert(`Trade failed: ${error.message}`)
      );
    }
    // Sell flow will be added in Task 2
  };

  const isResolved = market.isResolved;
  const isExpired = new Date(market.resolutionDateTime) <= new Date();
  const canTrade = isLoggedIn && !isResolved && !isExpired;

  return (
    <div className="bg-pm-card rounded-xl border border-pm-card-border p-5">
      {/* Buy/Sell toggle */}
      {canTrade && (
        <div className="flex mb-4">
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-l-lg transition-colors ${
              mode === 'buy'
                ? 'bg-white text-black'
                : 'bg-transparent text-pm-muted hover:text-white'
            }`}
            onClick={() => setMode('buy')}
          >
            Buy
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold rounded-r-lg transition-colors ${
              mode === 'sell'
                ? 'bg-white text-black'
                : 'bg-transparent text-pm-muted hover:text-white'
            }`}
            onClick={() => setMode('sell')}
          >
            Sell
          </button>
        </div>
      )}

      {/* Outcome buttons */}
      <div className="flex gap-3 mb-5">
        <button
          className={`flex-1 py-3 rounded-xl text-base font-bold transition-colors ${
            selectedOutcome === 'YES'
              ? 'bg-pm-yes text-white'
              : 'bg-pm-yes/15 text-pm-yes hover:bg-pm-yes/25'
          }`}
          onClick={() => canTrade && setSelectedOutcome('YES')}
          disabled={!canTrade}
        >
          {yesLabel} {yesPrice}¢
        </button>
        <button
          className={`flex-1 py-3 rounded-xl text-base font-bold transition-colors ${
            selectedOutcome === 'NO'
              ? 'bg-pm-no text-white'
              : 'bg-pm-no/15 text-pm-no hover:bg-pm-no/25'
          }`}
          onClick={() => canTrade && setSelectedOutcome('NO')}
          disabled={!canTrade}
        >
          {noLabel} {noPrice}¢
        </button>
      </div>

      {/* Amount section */}
      {canTrade && (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-pm-muted">Amount</span>
            <span className="text-2xl font-bold text-white">{amount}</span>
          </div>

          <div className="flex gap-2 mb-5">
            {[1, 5, 10, 100].map((val) => (
              <button
                key={val}
                className="flex-1 py-2 text-sm font-medium bg-pm-card-border rounded-lg text-white hover:bg-pm-hover transition-colors"
                onClick={() => handleQuickAdd(val)}
              >
                +{val}
              </button>
            ))}
            <button
              className="flex-1 py-2 text-sm font-medium bg-pm-card-border rounded-lg text-white hover:bg-pm-hover transition-colors"
              onClick={() => handleQuickAdd('max')}
            >
              Max
            </button>
          </div>

          <button
            className="w-full py-3 rounded-xl text-base font-bold bg-pm-yes text-white hover:bg-pm-yes/90 transition-colors disabled:opacity-50"
            onClick={handleTrade}
            disabled={!selectedOutcome || amount < 1}
          >
            Trade
          </button>
        </>
      )}

      {/* Logged out state */}
      {!isLoggedIn && !isResolved && (
        <p className="text-center text-pm-muted text-sm mt-2">Log in to trade</p>
      )}
    </div>
  );
};

export default TradeSidebar;
