import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useMarketLabels } from '../../hooks/useMarketLabels';
import { submitBet, fetchUserShares, submitSale } from '../layouts/trade/TradeUtils';
import useUserCredit from '../utils/userFinanceTools/FetchUserCredit';
import { useAuth } from '../../helpers/AuthContent';

const TradeSidebar = ({ market, marketId, currentProbability, token, isLoggedIn, onTransactionSuccess }) => {
  const location = useLocation();
  const history = useHistory();
  const sideParam = location.state?.side;
  const initialOutcome = sideParam === 'yes' ? 'YES' : sideParam === 'no' ? 'NO' : null;

  const [mode, setMode] = useState('buy'); // 'buy' or 'sell'
  const [selectedOutcome, setSelectedOutcome] = useState(initialOutcome);
  const [amount, setAmount] = useState(0);
  const amountRef = useRef(null);
  const [shares, setShares] = useState({ noSharesOwned: 0, yesSharesOwned: 0 });
  const { yesLabel, noLabel } = useMarketLabels(market);
  const { username } = useAuth();
  const { userCredit } = useUserCredit(username);

  useEffect(() => {
    if (mode === 'sell' && token) {
      fetchUserShares(marketId, token)
        .then((data) => {
          const sharesObj = Array.isArray(data)
            ? data[0] || { noSharesOwned: 0, yesSharesOwned: 0 }
            : data || { noSharesOwned: 0, yesSharesOwned: 0 };
          setShares(sharesObj);
        })
        .catch(() => setShares({ noSharesOwned: 0, yesSharesOwned: 0 }));
    }
  }, [mode, marketId, token]);

  useEffect(() => {
    if (sideParam) {
      const key = `side-used-${marketId}`;
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
        history.replace({ pathname: location.pathname, state: {} });
      } else {
        sessionStorage.setItem(key, '1');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialOutcome && amountRef.current) {
      amountRef.current.focus();
    }
  }, [initialOutcome]);

  const yesPrice = Math.round(currentProbability * 100);
  const noPrice = 100 - yesPrice;

  const handleQuickAdd = (value) => {
    if (value === 'max') {
      if (mode === 'sell') {
        const maxShares = selectedOutcome === 'YES' ? shares.yesSharesOwned : shares.noSharesOwned;
        setAmount(maxShares || 0);
      } else {
        setAmount(userCredit || 0);
      }
    } else {
      setAmount((prev) => prev + value);
    }
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setAmount(0);
      return;
    }
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setAmount(parsed);
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
          window.location.reload();
        },
        (error) => alert(`Trade failed: ${error.message}`)
      );
    }

    if (mode === 'sell') {
      submitSale(
        { marketId, amount, outcome: selectedOutcome },
        token,
        (data) => {
          alert(`Sale complete! ID: ${data.id}`);
          window.location.reload();
        },
        (error) => alert(`Sale failed: ${error.message}`)
      );
    }
  };

  const isResolved = market.isResolved;
  const isExpired = new Date(market.resolutionDateTime) <= new Date();
  const canTrade = isLoggedIn && !isResolved && !isExpired;

  const outcomeLabel = selectedOutcome === 'YES' ? yesLabel : selectedOutcome === 'NO' ? noLabel : '';
  const buttonText = selectedOutcome
    ? `${mode === 'buy' ? 'Buy' : 'Sell'} ${outcomeLabel}`
    : mode === 'buy' ? 'Buy' : 'Sell';

  return (
    <div className="bg-pm-card rounded-xl border border-pm-card-border p-5">
      {/* Buy/Sell toggle */}
      {canTrade && (
        <div className="flex gap-6 mb-4 border-b border-pm-card-border">
          <button
            className={`pb-2 text-sm font-semibold transition-colors ${
              mode === 'buy'
                ? 'text-white border-b-2 border-white'
                : 'text-pm-muted hover:text-white'
            }`}
            onClick={() => setMode('buy')}
          >
            Buy
          </button>
          <button
            className={`pb-2 text-sm font-semibold transition-colors ${
              mode === 'sell'
                ? 'text-white border-b-2 border-white'
                : 'text-pm-muted hover:text-white'
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
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-pm-muted">Amount</span>
                <div className="text-xs text-pm-muted">
                  Balance {mode === 'sell'
                    ? (selectedOutcome === 'YES' ? shares.yesSharesOwned : selectedOutcome === 'NO' ? shares.noSharesOwned : 0)
                    : (userCredit || 0)}
                </div>
              </div>
              <input
                ref={amountRef}
                type="text"
                inputMode="numeric"
                value={amount === 0 ? '' : amount}
                onChange={handleAmountChange}
                placeholder="0"
                className="text-2xl font-bold text-right bg-transparent text-white outline-none w-24 placeholder-pm-muted"
              />
            </div>
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
            className="w-full py-3 rounded-xl text-base font-bold bg-pm-blue text-white hover:bg-pm-blue-hover transition-colors disabled:opacity-50"
            onClick={handleTrade}
            disabled={!selectedOutcome || amount < 1}
          >
            {buttonText}
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
