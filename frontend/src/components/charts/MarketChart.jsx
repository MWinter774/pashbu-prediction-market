import React, { useState } from 'react';
import CanvasJSReact from '@canvasjs/react-charts';

const CanvasJSChart = CanvasJSReact.CanvasJSChart;

const MarketChart = ({ data, currentProbability, title, className, closeDateTime, yesLabel, noLabel }) => {
  const [showInverseProbability, setShowInverseProbability] = useState(false);

  const generateDataPoints = (data, isInverse = false) => {
    let dataPoints = [];
    const now = new Date();
    const closeDate = closeDateTime ? new Date(closeDateTime) : null;
    const isMarketClosed = closeDate && closeDate < now;

    if (data && Array.isArray(data)) {
      // Filter out any probability changes that occurred after the close date for closed markets
      const filteredData = isMarketClosed 
        ? data.filter(item => new Date(item.timestamp) <= closeDate)
        : data;
      
      dataPoints = filteredData.map((item) => ({
        x: new Date(item.timestamp),
        y: isInverse ? 1 - item.probability : item.probability,
      }));
    }

    // For active markets: append current probability with current timestamp
    // For closed markets: don't extend beyond close date
    if (currentProbability !== undefined && currentProbability !== null && !isMarketClosed) {
      dataPoints.push({
        x: now,
        y: isInverse ? 1 - currentProbability : currentProbability,
      });
    }
    
    return dataPoints;
  };

  const generateChartData = () => {
    const chartData = [
      {
        type: 'line',
        name: yesLabel,
        showInLegend: false,
        color: '#22c55e',
        lineThickness: 2,
        markerSize: 0,
        dataPoints: generateDataPoints(data, false),
      },
    ];

    if (showInverseProbability) {
      chartData.push({
        type: 'line',
        name: noLabel,
        showInLegend: false,
        color: '#ef4444',
        lineThickness: 2,
        markerSize: 0,
        dataPoints: generateDataPoints(data, true),
      });
    }

    return chartData;
  };

  const options = {
    animationEnabled: true,
    backgroundColor: 'transparent',
    zoomEnabled: true,
    axisX: {
      valueFormatString: 'DD MMM YY HH:mm',
      labelFontColor: '#8b8fa3',
    },
    axisY: {
      includeZero: true,
      minimum: 0,
      maximum: 1,
      labelFontColor: '#8b8fa3',
      valueFormatString: ' ',
      labelFormatter: function(e) {
        return Math.round(e.value * 100) + '%';
      },
    },
    data: generateChartData(),
  };

  return (
    <div className={`rounded-lg ${className} overflow-hidden`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className='text-lg font-medium'>{title}</h3>
          <button
            onClick={() => setShowInverseProbability(!showInverseProbability)}
            className={`px-3 py-1 text-sm rounded-lg transition-colors duration-200 ${showInverseProbability
              ? 'bg-pm-no hover:bg-pm-no/80 text-white'
              : 'bg-pm-card-border hover:bg-pm-hover text-gray-300'}`}
          >
            {showInverseProbability
              ? `Show ${yesLabel} Probability`
              : `Show ${noLabel} Probability`}
          </button>
      </div>
      <CanvasJSChart options={options} />
    </div>
  );
};

export default MarketChart;
