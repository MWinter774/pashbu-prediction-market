import React from 'react';

export default function TradeCTA({ onClick, disabled }) {
  return (
    <div
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-pm-page/90 backdrop-blur p-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full py-3 rounded-xl text-base font-bold bg-pm-yes text-white hover:bg-pm-yes/90 transition-colors disabled:opacity-50"
      >
        Trade
      </button>
    </div>
  );
}
