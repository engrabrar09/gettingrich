import PagePlaceholder from '../components/PagePlaceholder.tsx'

export default function Portfolios() {
  return (
    <PagePlaceholder title="Portfolios" phase="Phase 2">
      Multiple portfolios with holdings, cost basis and live P&amp;L. Schema is already
      in place (<code>portfolios</code>, <code>holdings</code>) with RLS that verifies
      parent ownership on write, not just a matching <code>user_id</code>.
    </PagePlaceholder>
  )
}
