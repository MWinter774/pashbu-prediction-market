/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary-background': {
          DEFAULT: '#0e121d',
        },
        'custom-gray-verylight': {
          DEFAULT: '#DBD4D3',
        },
        'custom-gray-light': {
          DEFAULT: '#67697C',
        },
        'custom-gray-dark': {
          DEFAULT: '#303030',
        },
        'beige': {
          DEFAULT: '#F9D3A5',
          hover: '#F9D3A5',
          active: '#F9D3A5'
        },
        'green-btn': {
          DEFAULT: '#054A29',
          hover: '#00cca4',
          'border-default': '#054A29',
          'border-hover': '#00cca4',
        },
        'red-btn': {
          DEFAULT: '#D00000',
          hover: '#FF8484',
          'border-default': '#D00000',
          'border-hover': '#FF8484',
        },
        'gold-btn': {
          DEFAULT: '#FFC107',
          hover: '#FFC107',
          active: '#FFC107',
        },
        'neutral-btn': {
          DEFAULT: '#8A1C7C',
          hover: '#8A1C7C',
          active: '#8A1C7C',
        },
        'primary-pink': {
          DEFAULT: '#F72585',
        },
        'info-blue': {
          DEFAULT: '#17a2b8',
        },
        'warning-orange': {
          DEFAULT: '#ffc107',
        },
        'pm-page': '#171923',
        'pm-card': '#1e2231',
        'pm-card-border': '#2d3348',
        'pm-muted': '#8b8fa3',
        'pm-yes': '#22c55e',
        'pm-no': '#ef4444',
        'pm-hover': '#252a3a',
      },
      borderRadius: {
        'badge': '12px'
      },
    },
  },
  plugins: [],
};
