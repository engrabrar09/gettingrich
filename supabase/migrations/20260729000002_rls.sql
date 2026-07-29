-- ============================================================================
-- Row Level Security
--
-- This is the ONLY thing protecting user data. The Supabase anon key is public
-- by design (it ships in the built JS bundle), so every guarantee lives here.
--
-- Two patterns:
--   REFERENCE tables  — RLS on, SELECT granted to authenticated, NO write
--                       policies at all. The service role bypasses RLS, which
--                       is how cron jobs write them. Absence of a write policy
--                       is the deny.
--   USER-OWNED tables — RLS on, all four verbs scoped to auth.uid().
--
-- ⚠ CHILD TABLES: `user_id` is denormalised onto holdings, watchlist_items and
-- watchlist_settings so policies avoid a join. Checking `user_id = auth.uid()`
-- ALONE is not sufficient — a caller could insert a row carrying their OWN
-- user_id but pointing at ANOTHER user's portfolio_id, and thereby write into a
-- portfolio they do not own. Every write policy on a child table therefore also
-- proves ownership of the parent via EXISTS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Reference tables: readable by any signed-in user, writable only by cron
-- ---------------------------------------------------------------------------
alter table public.assets         enable row level security;
alter table public.quotes         enable row level security;
alter table public.quote_history  enable row level security;
alter table public.fundamentals   enable row level security;
alter table public.indicators     enable row level security;
alter table public.forecasts      enable row level security;
alter table public.news_articles  enable row level security;

create policy assets_read        on public.assets        for select to authenticated using (true);
create policy quotes_read        on public.quotes        for select to authenticated using (true);
create policy quote_history_read on public.quote_history for select to authenticated using (true);
create policy fundamentals_read  on public.fundamentals  for select to authenticated using (true);
create policy indicators_read    on public.indicators    for select to authenticated using (true);
create policy forecasts_read     on public.forecasts     for select to authenticated using (true);
create policy news_read          on public.news_articles for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Create the profile row on signup so the app never has to handle a missing one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- portfolios
-- ---------------------------------------------------------------------------
alter table public.portfolios enable row level security;

create policy portfolios_select on public.portfolios
  for select to authenticated using (user_id = (select auth.uid()));
create policy portfolios_insert on public.portfolios
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy portfolios_update on public.portfolios
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy portfolios_delete on public.portfolios
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- holdings — child of portfolios
-- ---------------------------------------------------------------------------
alter table public.holdings enable row level security;

create policy holdings_select on public.holdings
  for select to authenticated using (user_id = (select auth.uid()));

create policy holdings_insert on public.holdings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = (select auth.uid())
    )
  );

create policy holdings_update on public.holdings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = (select auth.uid())
    )
  );

create policy holdings_delete on public.holdings
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- watchlists
-- ---------------------------------------------------------------------------
alter table public.watchlists enable row level security;

create policy watchlists_select on public.watchlists
  for select to authenticated using (user_id = (select auth.uid()));
create policy watchlists_insert on public.watchlists
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy watchlists_update on public.watchlists
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy watchlists_delete on public.watchlists
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- watchlist_items — child of watchlists
-- ---------------------------------------------------------------------------
alter table public.watchlist_items enable row level security;

create policy watchlist_items_select on public.watchlist_items
  for select to authenticated using (user_id = (select auth.uid()));

create policy watchlist_items_insert on public.watchlist_items
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.watchlists w
      where w.id = watchlist_id and w.user_id = (select auth.uid())
    )
  );

create policy watchlist_items_update on public.watchlist_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.watchlists w
      where w.id = watchlist_id and w.user_id = (select auth.uid())
    )
  );

create policy watchlist_items_delete on public.watchlist_items
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- watchlist_settings — child of watchlists
-- ---------------------------------------------------------------------------
alter table public.watchlist_settings enable row level security;

create policy watchlist_settings_select on public.watchlist_settings
  for select to authenticated using (user_id = (select auth.uid()));

create policy watchlist_settings_insert on public.watchlist_settings
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.watchlists w
      where w.id = watchlist_id and w.user_id = (select auth.uid())
    )
  );

create policy watchlist_settings_update on public.watchlist_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy watchlist_settings_delete on public.watchlist_settings
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- alert_rules — may target a portfolio or watchlist, so prove ownership of
-- whichever one is referenced.
-- ---------------------------------------------------------------------------
alter table public.alert_rules enable row level security;

create policy alert_rules_select on public.alert_rules
  for select to authenticated using (user_id = (select auth.uid()));

create policy alert_rules_insert on public.alert_rules
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (portfolio_id is null or exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = (select auth.uid())
    ))
    and (watchlist_id is null or exists (
      select 1 from public.watchlists w
      where w.id = watchlist_id and w.user_id = (select auth.uid())
    ))
  );

create policy alert_rules_update on public.alert_rules
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (portfolio_id is null or exists (
      select 1 from public.portfolios p
      where p.id = portfolio_id and p.user_id = (select auth.uid())
    ))
    and (watchlist_id is null or exists (
      select 1 from public.watchlists w
      where w.id = watchlist_id and w.user_id = (select auth.uid())
    ))
  );

create policy alert_rules_delete on public.alert_rules
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- notifications
--
-- No INSERT policy: notifications are created by the alert engine under the
-- service role. Users may only read them and mark them read.
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

-- Delivery rows are written by the engine; users may inspect why a channel failed.
alter table public.notification_deliveries enable row level security;

create policy notification_deliveries_select on public.notification_deliveries
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- push_subscriptions — the browser registers these itself
-- ---------------------------------------------------------------------------
alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- analysis_runs / ai_analyses
--
-- Read-only to users. Both are written by the analyze-asset Edge Function under
-- the service role, which is what keeps the provider API keys server-side.
-- ---------------------------------------------------------------------------
alter table public.analysis_runs enable row level security;
alter table public.ai_analyses   enable row level security;

create policy analysis_runs_select on public.analysis_runs
  for select to authenticated using (user_id = (select auth.uid()));
create policy ai_analyses_select on public.ai_analyses
  for select to authenticated using (user_id = (select auth.uid()));
