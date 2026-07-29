import { useParams } from 'react-router-dom'
import PagePlaceholder from '../components/PagePlaceholder.tsx'

export default function AssetDetail() {
  const { symbol } = useParams<{ symbol: string }>()

  return (
    <PagePlaceholder title={symbol?.toUpperCase() ?? 'Asset'} phase="Phases 3–5">
      Tabs for Chart (overlays plus RSI/MACD panes), Technicals, Fundamentals &amp;
      dividends, Forecast (regression with R², Monte Carlo cone, seasonality,
      support/resistance), News, and the dual AI verdict cards.
      <br />
      <br />
      The maths behind the Technicals and Forecast tabs is already written and
      tested in <code>shared/analytics/</code> — 76 passing tests, verified
      identical in Node and Deno.
    </PagePlaceholder>
  )
}
