/**
 * Honest placeholder for routes that exist but are not built yet.
 *
 * States plainly which phase implements the page, so the shell can be navigated
 * end to end without any screen pretending to be finished.
 */
export default function PagePlaceholder({
  title,
  phase,
  children,
}: {
  title: string
  phase: string
  children?: React.ReactNode
}) {
  return (
    <section>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      </header>
      <div className="rounded-2xl border border-dashed border-(--color-border-subtle) bg-(--color-surface) p-8">
        <p className="text-sm text-(--color-ink-muted)">
          Not implemented yet — scheduled for <span className="font-medium">{phase}</span>.
        </p>
        {children && <div className="mt-4 text-sm text-(--color-ink-muted)">{children}</div>}
      </div>
    </section>
  )
}
