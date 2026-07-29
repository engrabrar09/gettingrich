import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-(--color-ink-muted)">
        That route does not exist.
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-(--color-brand) px-4 py-2 text-sm font-medium text-white"
      >
        Back to dashboard
      </Link>
    </section>
  )
}
