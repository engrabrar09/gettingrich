import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Briefcase,
  Eye,
  Newspaper,
  Bell,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../lib/auth.tsx'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/portfolios', label: 'Portfolios', icon: Briefcase, end: false },
  { to: '/watchlists', label: 'Watchlists', icon: Eye, end: false },
  { to: '/news', label: 'News', icon: Newspaper, end: false },
  { to: '/notifications', label: 'Alerts', icon: Bell, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false },
] as const

/**
 * App shell: sidebar on desktop, bottom tab bar on mobile.
 *
 * `unreadCount` is threaded through as a prop for now. Once notifications are
 * wired it comes from a Supabase Realtime subscription on the notifications
 * table, filtered to `read_at is null`.
 */
export default function AppShell({ unreadCount = 0 }: { unreadCount?: number }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    // Replace, so Back does not land on a page that will immediately bounce.
    navigate('/auth', { replace: true })
  }

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-(--color-border-subtle) bg-(--color-surface) p-4 md:flex">
        <div className="mb-8 px-2">
          <h1 className="text-lg font-semibold tracking-tight">Portfolio</h1>
          <p className="text-xs text-(--color-ink-muted)">Markets &amp; alerts</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-(--color-brand)/10 font-medium text-(--color-brand)'
                    : 'text-(--color-ink-muted) hover:bg-(--color-surface-muted)',
                ].join(' ')
              }
            >
              <Icon size={18} aria-hidden />
              <span>{label}</span>
              {to === '/notifications' && unreadCount > 0 && (
                <span
                  className="ml-auto rounded-full bg-(--color-brand) px-2 py-0.5 text-xs font-medium text-white"
                  aria-label={`${unreadCount} unread`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* mt-auto pins this to the bottom of the sidebar column */}
        <div className="mt-auto border-t border-(--color-border-subtle) pt-4">
          {user?.email && (
            <p className="truncate px-3 pb-2 text-xs text-(--color-ink-muted)" title={user.email}>
              {user.email}
            </p>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-(--color-ink-muted) transition-colors hover:bg-(--color-surface-muted)"
          >
            <LogOut size={18} aria-hidden />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* pb-20 clears the fixed mobile tab bar so content is never hidden behind it */}
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-(--color-border-subtle) bg-(--color-surface) md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'relative flex flex-1 flex-col items-center gap-1 py-2 text-[11px]',
                isActive ? 'text-(--color-brand)' : 'text-(--color-ink-muted)',
              ].join(' ')
            }
          >
            <Icon size={20} aria-hidden />
            <span>{label}</span>
            {to === '/notifications' && unreadCount > 0 && (
              <span
                className="absolute top-1 right-[22%] h-2 w-2 rounded-full bg-(--color-brand)"
                aria-label={`${unreadCount} unread`}
              />
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
