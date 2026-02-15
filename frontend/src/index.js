import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

let ReactQueryDevtools = null;

if (process.env.NODE_ENV === 'development') {
  try {
    ReactQueryDevtools =
      require('@tanstack/react-query-devtools').ReactQueryDevtools;
  } catch (e) {
    console.warn('React Query Devtools not available');
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: 1000,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {ReactQueryDevtools && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  </React.StrictMode>
);
