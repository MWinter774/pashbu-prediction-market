import React from 'react';

const categories = ['General'];

const statusFilters = ['Active', 'Closed', 'Resolved', 'All'];

const TabButton = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm whitespace-nowrap transition-colors border-b-2 ${
      isActive
        ? 'text-white border-white font-semibold'
        : 'text-pm-muted border-transparent hover:text-gray-300'
    }`}
  >
    {label}
  </button>
);

const CategoryTabs = ({ activeCategory, activeStatus, onCategoryChange, onStatusChange }) => {
  return (
    <div className="border-b border-pm-card-border bg-pm-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto">
          {categories.map((cat) => (
            <TabButton
              key={cat}
              label={cat}
              isActive={activeCategory === cat}
              onClick={() => onCategoryChange(cat)}
            />
          ))}

          <div className="w-px h-5 bg-pm-card-border mx-2 shrink-0" />

          {statusFilters.map((status) => (
            <TabButton
              key={status}
              label={status}
              isActive={activeStatus === status}
              onClick={() => onStatusChange(status)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryTabs;
