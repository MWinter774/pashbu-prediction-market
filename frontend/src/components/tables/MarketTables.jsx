import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import LoadingSpinner from '../../components/loaders/LoadingSpinner';
import MarketCardGrid from '../cards/MarketCardGrid';

function MarketsTable() {
  const [marketsData, setMarketsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch(`${API_URL}/v0/markets`);
        if (!response.ok) throw new Error('Failed to fetch markets');
        const data = await response.json();
        setMarketsData(data.markets || []);
      } catch (error) {
        console.error('Error fetching market data:', error);
        setError(error.toString());
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };

    fetchMarkets();
  }, []);

  if (loading)
    return (
      <div className='p-4 text-center'>
        <LoadingSpinner />
        Loading markets...
      </div>
    );
  if (error)
    return <div className='p-4 text-center text-red-500'>Error: {error}</div>;

  return (
    <div className='w-full md:w-full h-[calc(100vh-40px)] sm:h-full overflow-y-auto px-4 md:px-6 lg:px-8'>
      <h1 className='text-2xl font-semibold text-gray-300 mb-6'>Markets</h1>
      {marketsData.length === 0 ? (
        <div className='p-4 text-center text-gray-400'>No markets found.</div>
      ) : (
        <MarketCardGrid markets={marketsData} />
      )}
    </div>
  );
}

export default MarketsTable;
