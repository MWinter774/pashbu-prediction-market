import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import LoadingSpinner from '../loaders/LoadingSpinner';
import MarketCardGrid from '../cards/MarketCardGrid';

function MarketsByStatusTable({ status, category }) {
  const [marketsData, setMarketsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMarkets = async () => {
      setLoading(true);
      setError('');

      try {
        const endpoint = status === 'all'
          ? `${API_URL}/v0/markets`
          : `${API_URL}/v0/markets/${status}`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`Failed to fetch ${status} markets`);

        const data = await response.json();

        // Handle different response structures
        if (status === 'all') {
          setMarketsData(data.markets || []);
        } else {
          setMarketsData(data.markets || []);
        }
      } catch (error) {
        console.error(`Error fetching ${status} market data:`, error);
        setError(error.toString());
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };

    fetchMarkets();
  }, [status]);

  if (loading)
    return (
      <div className='p-4 text-center'>
        <LoadingSpinner />
        Loading {status} markets...
      </div>
    );

  if (error)
    return <div className='p-4 text-center text-red-500'>Error: {error}</div>;

  return (
    <div className='w-full'>
      {marketsData.length === 0 ? (
        <div className='p-4 text-center text-gray-400'>
          No {status} markets found.
        </div>
      ) : (
        <MarketCardGrid markets={marketsData} />
      )}
    </div>
  );
}

export default MarketsByStatusTable;
