import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const categories = ['General'];
const statusFilters = ['Active', 'Closed', 'Resolved', 'All'];

const FilterBar = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  // Default to 'Active' if no status param
  const activeStatus = params.get('status') || 'Active';
  const activeCategory = params.get('category') || 'General';

  const buildLink = (overrides) => {
    const newParams = new URLSearchParams();
    const cat = overrides.category || activeCategory;
    const stat = overrides.status || activeStatus;
    if (cat !== 'General') newParams.set('category', cat);
    if (stat !== 'Active') newParams.set('status', stat);
    const qs = newParams.toString();
    return qs ? `/?${qs}` : '/';
  };

  return (
    <div className="border-b border-pm-card-border bg-pm-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <Link
              key={cat}
              to={buildLink({ category: cat })}
              className={`px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2 ${
                activeCategory === cat
                  ? 'text-white border-white font-semibold'
                  : 'text-pm-muted border-transparent hover:text-gray-300'
              }`}
            >
              {cat}
            </Link>
          ))}

          <div className="w-px h-5 bg-pm-card-border mx-2 shrink-0" />

          {statusFilters.map((status) => (
            <Link
              key={status}
              to={buildLink({ status })}
              className={`px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2 ${
                activeStatus === status
                  ? 'text-white border-white font-semibold'
                  : 'text-pm-muted border-transparent hover:text-gray-300'
              }`}
            >
              {status}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
