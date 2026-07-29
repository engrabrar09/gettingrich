-- ============================================================================
-- Investment Portfolio Tracker — core schema
--
-- Two families of table:
--   REFERENCE  (assets, quotes, quote_history, fundamentals, indicators,
--               forecasts, news_articles) — shared market data. World-readable,
--               written only by the service role from cron jobs.
--   USER-OWNED (everything carrying user_id) — private. RLS in 0002.
--
-- Nullability is load-bearing throughout: a null indicator means "insufficient
-- history", never zero. See shared/analytics/index.ts.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ===========================================================================
-- REFERENCE TABLES
-- ===========================================================================

create table public.assets (
  id            uuid primary key default gen_random_uuid(),
  symbol        text not null,
  -- Adding a market means inserting rows here plus one provider adapter.
  -- Extending this CHECK is a one-line migration, deliberately not an enum.
  asset_class   text not null check (asset_class in ('equity','etf','metal','crypto')),
  exchange      text,
  currency      text not null default 'USD',
  name          text,
  -- Which MarketDataProvider.key serves this asset. Null = resolve by registry.
  provider_key  text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Metals and crypto have no exchange, so coalesce to keep the key total.
  unique (symbol, asset_class, coalesce(exchange, ''))
);

create index assets_active_idx on public.assets (asset_class) where is_active;

create trigger assets_touch before update on public.assets
  for each row execute function public.touch_updated_at();

-- Latest quote only: one row per asset, upserted by refresh-quotes.
create table public.quotes (
  asset_id    uuid primary key references public.assets(id) on delete cascade,
  price       numeric(20,8) not null,
  prev_close  numeric(20,8),
  change_pct  numeric(12,6),
  -- Surfaced in the UI on every price. Free tiers are delayed; hiding that
  -- would misrepresent the data.
  fetched_at  timestamptz not null default now()
);

-- Daily OHLCV. THE single input to every indicator and forecast.
create table public.quote_history (
  asset_id  uuid not null references public.assets(id) on delete cascade,
  date      date not null,
  open      numeric(20,8) not null,
  high      numeric(20,8) not null,
  low       numeric(20,8) not null,
  close     numeric(20,8) not null,
  volume    numeric(24,4) not null default 0,
  primary key (asset_id, date)
);

-- Ascending order matters: the analytics module assumes ascending, gap-free input.
create index quote_history_asset_date_idx on public.quote_history (asset_id, date asc);

-- Point-in-time fundamentals from Finnhub /stock/metric (free tier).
-- US-centric and sparse elsewhere; entirely absent for metals and crypto.
create table public.fundamentals (
  asset_id            uuid primary key references public.assets(id) on delete cascade,
  pe_ratio            numeric(16,6),
  pb_ratio            numeric(16,6),
  peg_ratio           numeric(16,6),
  eps                 numeric(16,6),
  roe                 numeric(16,6),
  roa                 numeric(16,6),
  debt_to_equity      numeric(16,6),
  current_ratio       numeric(16,6),
  beta                numeric(16,6),
  profit_margin       numeric(16,6),
  dividend_yield      numeric(16,6),
  dividend_per_share  numeric(16,6),
  payout_ratio        numeric(16,6),
  dividend_growth_5y  numeric(16,6),
  as_of               timestamptz not null default now()
);

-- Daily indicator snapshot. Columns the alert engine filters on are extracted
-- for indexability; everything else lives in `extra` so new indicators do not
-- require a migration.
create table public.indicators (
  asset_id          uuid not null references public.assets(id) on delete cascade,
  date              date not null,
  close             numeric(20,8) not null,

  sma_20            numeric(20,8),
  sma_50            numeric(20,8),
  sma_200           numeric(20,8),
  ema_12            numeric(20,8),
  ema_26            numeric(20,8),
  macd              numeric(20,8),
  macd_signal       numeric(20,8),
  macd_histogram    numeric(20,8),
  cross             text check (cross in ('golden','death')),

  rsi_14            numeric(10,6),
  stoch_k           numeric(10,6),
  stoch_d           numeric(10,6),
  roc_12            numeric(16,6),

  bb_upper          numeric(20,8),
  bb_middle         numeric(20,8),
  bb_lower          numeric(20,8),
  bb_bandwidth      numeric(16,8),
  atr_14            numeric(20,8),
  atr_pct           numeric(16,6),
  high_52w          numeric(20,8),
  low_52w           numeric(20,8),
  range_position_pct numeric(10,6),

  volume_sma_20     numeric(24,4),
  volume_ratio      numeric(16,6),

  extra             jsonb not null default '{}'::jsonb,
  computed_at       timestamptz not null default now(),
  primary key (asset_id, date)
);

-- evaluate-alerts reads the newest row per asset on every cycle.
create index indicators_latest_idx on public.indicators (asset_id, date desc);

create table public.forecasts (
  asset_id     uuid not null references public.assets(id) on delete cascade,
  date         date not null,
  regression   jsonb,
  monte_carlo  jsonb,
  seasonality  jsonb,
  levels       jsonb,
  computed_at  timestamptz not null default now(),
  primary key (asset_id, date)
);

create table public.news_articles (
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid references public.assets(id) on delete cascade,
  headline      text not null,
  url           text not null,
  source        text,
  summary       text,
  sentiment     numeric(6,4),
  published_at  timestamptz not null,
  created_at    timestamptz not null default now(),
  unique (asset_id, url)
);

create index news_articles_asset_published_idx
  on public.news_articles (asset_id, published_at desc);

-- ===========================================================================
-- USER-OWNED TABLES
-- ===========================================================================

create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text,
  country           text,
  base_currency     text not null default 'USD',
  -- Quiet hours are evaluated in this zone, so it must be an IANA name.
  timezone          text not null default 'UTC',
  telegram_chat_id  text,
  email_enabled     boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create table public.portfolios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  currency    text not null default 'USD',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index portfolios_user_idx on public.portfolios (user_id);

create trigger portfolios_touch before update on public.portfolios
  for each row execute function public.touch_updated_at();

create table public.holdings (
  id             uuid primary key default gen_random_uuid(),
  portfolio_id   uuid not null references public.portfolios(id) on delete cascade,
  -- Denormalised from portfolios so RLS can be enforced without a join.
  user_id        uuid not null references auth.users(id) on delete cascade,
  asset_id       uuid not null references public.assets(id) on delete restrict,
  quantity       numeric(24,8) not null,
  avg_cost       numeric(20,8) not null,
  purchase_date  date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index holdings_portfolio_idx on public.holdings (portfolio_id);
create index holdings_user_idx on public.holdings (user_id);

create trigger holdings_touch before update on public.holdings
  for each row execute function public.touch_updated_at();

create table public.watchlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index watchlists_user_idx on public.watchlists (user_id);

create trigger watchlists_touch before update on public.watchlists
  for each row execute function public.touch_updated_at();

create table public.watchlist_items (
  id            uuid primary key default gen_random_uuid(),
  watchlist_id  uuid not null references public.watchlists(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  asset_id      uuid not null references public.assets(id) on delete cascade,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (watchlist_id, asset_id)
);

create index watchlist_items_watchlist_idx on public.watchlist_items (watchlist_id);

-- One row per watchlist. This is what makes each watchlist independently
-- configurable, which was an explicit requirement.
create table public.watchlist_settings (
  watchlist_id              uuid primary key references public.watchlists(id) on delete cascade,
  user_id                   uuid not null references auth.users(id) on delete cascade,
  refresh_interval_minutes  integer not null default 15 check (refresh_interval_minutes >= 5),
  enabled_channels          text[] not null default array['telegram']::text[],
  quiet_hours_start         time,
  quiet_hours_end           time,
  news_enabled              boolean not null default true,
  default_alert_thresholds  jsonb not null default '{}'::jsonb,
  updated_at                timestamptz not null default now()
);

create trigger watchlist_settings_touch before update on public.watchlist_settings
  for each row execute function public.touch_updated_at();

create table public.alert_rules (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  scope             text not null check (scope in ('asset','portfolio','watchlist')),
  asset_id          uuid references public.assets(id) on delete cascade,
  portfolio_id      uuid references public.portfolios(id) on delete cascade,
  watchlist_id      uuid references public.watchlists(id) on delete cascade,
  rule_type         text not null check (rule_type in (
                      -- price-based
                      'price_above','price_below','pct_change','crosses_cost_basis',
                      'allocation_drift','news_keyword',
                      -- indicator-based
                      'rsi_crosses_above','rsi_crosses_below','ma_crossover',
                      'price_crosses_sma50','price_crosses_sma200',
                      'bollinger_breakout','volume_spike','new_52w_high','new_52w_low'
                    )),
  params            jsonb not null default '{}'::jsonb,
  is_active         boolean not null default true,
  cooldown_minutes  integer not null default 60 check (cooldown_minutes >= 0),
  last_triggered_at timestamptz,

  -- CROSSING DETECTION. Without this, a "RSI below 30" rule re-fires every
  -- cycle for as long as RSI stays below 30, instead of once at the crossing.
  -- evaluate-alerts writes the freshly observed value here on EVERY run,
  -- whether or not the rule fired.
  previous_value    numeric(20,8),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- The scope column must agree with which FK is populated.
  constraint alert_rules_scope_target check (
    (scope = 'asset'     and asset_id     is not null) or
    (scope = 'portfolio' and portfolio_id is not null) or
    (scope = 'watchlist' and watchlist_id is not null)
  )
);

create index alert_rules_active_idx on public.alert_rules (user_id) where is_active;
create index alert_rules_asset_idx on public.alert_rules (asset_id) where is_active;

create trigger alert_rules_touch before update on public.alert_rules
  for each row execute function public.touch_updated_at();

-- The durable record of every alert. Written BEFORE any channel is attempted,
-- so the notification page is correct even when all channels fail.
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  alert_rule_id uuid references public.alert_rules(id) on delete set null,
  asset_id    uuid references public.assets(id) on delete set null,
  title       text not null,
  body        text not null,
  severity    text not null default 'info' check (severity in ('info','warning','critical')),
  category    text not null default 'alert' check (category in ('alert','news','system','analysis')),
  payload     jsonb not null default '{}'::jsonb,
  -- Unread is read_at IS NULL. Drives the New/Read tabs and the nav badge.
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- Exactly the access pattern of the notifications page and the unread badge.
create index notifications_user_unread_idx
  on public.notifications (user_id, read_at, created_at desc);

-- Per-channel dispatch outcome, so a Telegram failure is visible rather than silent.
create table public.notification_deliveries (
  id               uuid primary key default gen_random_uuid(),
  notification_id  uuid not null references public.notifications(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  channel          text not null check (channel in ('telegram','webpush','email')),
  status           text not null check (status in ('pending','sent','failed')),
  error            text,
  attempted_at     timestamptz not null default now()
);

create index notification_deliveries_notification_idx
  on public.notification_deliveries (notification_id);

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- One row per "Analyze" click. The input snapshot is stored ONCE here, so both
-- providers are provably scored on byte-identical input.
create table public.analysis_runs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  asset_id        uuid not null references public.assets(id) on delete cascade,
  input_snapshot  jsonb not null,
  created_at      timestamptz not null default now()
);

create index analysis_runs_asset_idx on public.analysis_runs (asset_id, created_at desc);
create index analysis_runs_user_idx on public.analysis_runs (user_id, created_at desc);

-- One row PER PROVIDER per run — including providers that failed, so the UI can
-- say "Mistral timed out" instead of silently presenting one opinion as the
-- whole answer.
create table public.ai_analyses (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references public.analysis_runs(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  provider        text not null,
  model           text not null,
  status          text not null check (status in ('ok','error')),
  verdict         text check (verdict in ('buy','hold','sell')),
  confidence_pct  numeric(5,2) check (confidence_pct between 0 and 100),
  horizon         text,
  summary         text,
  key_risks       jsonb,
  error           text,
  latency_ms      integer,
  created_at      timestamptz not null default now(),

  -- A successful analysis must carry a verdict; a failed one must carry a reason.
  constraint ai_analyses_shape check (
    (status = 'ok'    and verdict is not null and confidence_pct is not null) or
    (status = 'error' and error   is not null)
  ),
  unique (run_id, provider)
);

create index ai_analyses_run_idx on public.ai_analyses (run_id);
