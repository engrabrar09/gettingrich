import PagePlaceholder from '../components/PagePlaceholder.tsx'

export default function Settings() {
  return (
    <PagePlaceholder title="Settings" phase="Phases 1–4">
      Profile, country, base currency, timezone (quiet hours are evaluated in it),
      notification channel setup and push permission.
      <br />
      <br />
      On iPhone, Web Push only works after Share → Add to Home Screen — in a plain
      Safari tab <code>PushManager</code> does not exist. Telegram is the
      recommended primary channel for that reason.
    </PagePlaceholder>
  )
}
