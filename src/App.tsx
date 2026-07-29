import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell.tsx'
import SetupRequired from './components/SetupRequired.tsx'
import { isSupabaseConfigured } from './lib/supabase.ts'

// Lazy per route so the initial bundle stays small — the charting and analytics
// code on the asset page is by far the heaviest thing here and should not be
// downloaded just to look at the dashboard.
const Dashboard = lazy(() => import('./routes/Dashboard.tsx'))
const Portfolios = lazy(() => import('./routes/Portfolios.tsx'))
const Watchlists = lazy(() => import('./routes/Watchlists.tsx'))
const AssetDetail = lazy(() => import('./routes/AssetDetail.tsx'))
const News = lazy(() => import('./routes/News.tsx'))
const Notifications = lazy(() => import('./routes/Notifications.tsx'))
const Settings = lazy(() => import('./routes/Settings.tsx'))
const NotFound = lazy(() => import('./routes/NotFound.tsx'))

function RouteFallback() {
  return (
    <div className="p-8 text-sm text-(--color-ink-muted)" role="status" aria-live="polite">
      Loading…
    </div>
  )
}

export default function App() {
  // Render a setup screen rather than crashing on a missing env var. Throwing at
  // import time would give a blank page and a console error on a fresh clone.
  if (!isSupabaseConfigured) return <SetupRequired />

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="portfolios" element={<Portfolios />} />
          <Route path="watchlists" element={<Watchlists />} />
          <Route path="assets/:symbol" element={<AssetDetail />} />
          <Route path="news" element={<News />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
