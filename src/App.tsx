import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell.tsx'
import SetupRequired from './components/SetupRequired.tsx'
import RequireAuth from './components/RequireAuth.tsx'
import UpdatePrompt from './components/UpdatePrompt.tsx'
import { AuthProvider } from './lib/auth.tsx'
import { isSupabaseConfigured } from './lib/supabase.ts'

// Lazy per route so the initial bundle stays small — the charting and analytics
// code on the asset page is by far the heaviest thing here and should not be
// downloaded just to look at the dashboard.
const Auth = lazy(() => import('./routes/Auth.tsx'))
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
  //
  // This check MUST come before <AuthProvider>, which calls getSupabase() on
  // mount and would throw if the client was never constructed.
  // UpdatePrompt also performs service-worker registration, so it renders on
  // both branches — the PWA should still install and update even before
  // Supabase is configured.
  if (!isSupabaseConfigured) {
    return (
      <>
        <SetupRequired />
        <UpdatePrompt />
      </>
    )
  }

  return (
    <AuthProvider>
      <UpdatePrompt />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Unguarded — guarding the sign-in page would loop forever. */}
          <Route path="/auth" element={<Auth />} />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
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
    </AuthProvider>
  )
}
