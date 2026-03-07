import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { AuthProvider } from './helpers/AuthContent';
import AppRoutes from './helpers/AppRoutes';
import TopNav from './components/topnav/TopNav';
import '../index.css';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-pm-page text-white'>
      <h1 className='text-4xl font-bold mb-4'>Oops! Something went wrong.</h1>
      <p className='text-xl mb-8'>
        We're sorry for the inconvenience. Please try again.
      </p>
      <pre className='mb-8 p-4 bg-pm-card rounded'>{error.message}</pre>
      <button
        onClick={resetErrorBoundary}
        className='px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
      >
        Try again
      </button>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {}}
    >
      <AuthProvider>
        <Router>
          <div className='App bg-pm-page min-h-screen text-white flex flex-col'>
            <TopNav />
            <main className='flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-6'>
              <AppRoutes />
            </main>
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
