import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Quotes refresh on a 5-15 minute cron, so aggressive refetching just
      // burns free-tier egress for data that has not changed.
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/*
        basename is REQUIRED on GitHub Pages project sites, which serve from
        /<repo-name>/ rather than the domain root. Vite exposes the configured
        base as BASE_URL, so this stays correct if the repo is ever renamed.
      */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
