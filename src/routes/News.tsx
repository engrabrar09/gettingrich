import PagePlaceholder from '../components/PagePlaceholder.tsx'

export default function News() {
  return (
    <PagePlaceholder title="News" phase="Phase 5">
      Aggregated feed filterable by portfolio, watchlist or ticker. Fetched hourly
      by cron and cached in Postgres, so page views cost no API quota — Marketaux
      allows only 100 requests/day on the free tier.
    </PagePlaceholder>
  )
}
