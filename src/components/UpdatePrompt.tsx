import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Service worker registration plus an update toast.
 *
 * Uses `registerType: 'prompt'` rather than 'autoUpdate' deliberately. An
 * automatic reload can swap the page out mid-interaction — losing a half-typed
 * alert rule, for instance. Here the user decides when to take the update.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(url, registration) {
      if (import.meta.env.DEV) console.debug('[pwa] service worker registered', url)
      // Poll hourly so a long-lived tab (this app is meant to stay open) still
      // notices a deploy. Without it, a tab open for days never updates.
      if (registration) {
        setInterval(() => void registration.update(), 60 * 60 * 1000)
      }
    },
    onRegisterError(error) {
      console.error('[pwa] service worker registration failed', error)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl border border-(--color-border-subtle) bg-(--color-surface) p-4 shadow-lg md:bottom-6"
    >
      <p className="text-sm font-medium">A new version is available.</p>
      <p className="mt-1 text-xs text-(--color-ink-muted)">
        Reload to get the latest build.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="rounded-lg bg-(--color-brand) px-3 py-1.5 text-sm font-medium text-white"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="rounded-lg border border-(--color-border-subtle) px-3 py-1.5 text-sm text-(--color-ink-muted)"
        >
          Later
        </button>
      </div>
    </div>
  )
}
