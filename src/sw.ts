/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

/**
 * Custom service worker.
 *
 * Built with vite-plugin-pwa's `injectManifest` strategy rather than
 * `generateSW`, because a generated worker cannot carry a `push` handler — and
 * push is the whole reason this file exists.
 *
 * Typechecked via tsconfig.worker.json: the WebWorker lib conflicts with DOM,
 * so this file is excluded from the app's tsconfig and compiled as its own
 * project.
 */

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

// Injected at build time by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST)

// Drop caches from previous deployments so old chunks don't accumulate.
cleanupOutdatedCaches()

/** Payload the alert engine sends. Kept in sync with supabase/functions/_shared/notify/webpush.ts */
interface PushPayload {
  title?: string
  body?: string
  /** App-relative path, e.g. "/notifications" or "/assets/AAPL". */
  url?: string
  tag?: string
}

self.addEventListener('push', (event) => {
  // A push with no payload still wakes the worker. Browsers require that we
  // show *something* — a silent push can cost the site its notification
  // permission — so fall back to a generic message rather than returning.
  let payload: PushPayload = {}
  try {
    payload = event.data?.json() ?? {}
  } catch {
    payload = { body: event.data?.text() }
  }

  const title = payload.title ?? 'Portfolio alert'

  // waitUntil is mandatory: without it the worker may be killed before the
  // notification is displayed, and the alert is silently lost.
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body ?? 'Open the app for details.',
      icon: 'pwa-192x192.png',
      badge: 'pwa-64x64.png',
      // Same tag replaces an existing notification instead of stacking. The
      // engine sets it per rule so one asset re-alerting does not pile up.
      tag: payload.tag,
      data: { url: payload.url ?? '/notifications' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const target = new URL(
    (event.notification.data as { url?: string } | undefined)?.url ?? '/notifications',
    self.registration.scope,
  ).href

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      // Prefer focusing an open tab over opening a second one — otherwise every
      // tapped alert spawns another window.
      for (const client of windows) {
        if (client.url.startsWith(self.registration.scope)) {
          await client.focus()
          if ('navigate' in client) await client.navigate(target)
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})

/**
 * iOS in particular expires push subscriptions without warning, and the user is
 * never told. Re-subscribing here keeps delivery working; the client syncs the
 * new endpoint to Supabase on its next load.
 *
 * The event is not yet in TypeScript's lib, hence the cast.
 */
self.addEventListener('pushsubscriptionchange', ((event: Event & {
  oldSubscription?: PushSubscription
  waitUntil(p: Promise<unknown>): void
}) => {
  event.waitUntil(
    (async () => {
      const applicationServerKey = event.oldSubscription?.options?.applicationServerKey
      if (!applicationServerKey) return
      await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
    })(),
  )
}) as EventListener)

// Apply a new worker immediately rather than waiting for every tab to close.
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | undefined)?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
