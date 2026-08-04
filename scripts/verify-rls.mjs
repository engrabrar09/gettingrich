/**
 * RLS isolation verification.
 *
 * Row Level Security is the ONLY thing keeping one user's portfolios away from
 * another's. The migration applying without error proves the policies were
 * created — it proves nothing about whether they actually isolate anyone. This
 * script proves that, against two real signed-in users.
 *
 * Credentials come from the environment and are never printed. Run:
 *
 *   node --env-file=.env.local scripts/verify-rls.mjs
 *
 * Required in .env.local:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *   TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD
 *   TEST_USER_B_EMAIL / TEST_USER_B_PASSWORD
 *
 * Exits non-zero on any failure. Re-run after ANY change to policies.
 */

import { createClient } from '@supabase/supabase-js'

const URL = process.env.VITE_SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const A_EMAIL = process.env.TEST_USER_A_EMAIL
const A_PASS = process.env.TEST_USER_A_PASSWORD
const B_EMAIL = process.env.TEST_USER_B_EMAIL
const B_PASS = process.env.TEST_USER_B_PASSWORD

for (const [name, value] of Object.entries({
  VITE_SUPABASE_URL: URL,
  VITE_SUPABASE_ANON_KEY: ANON,
  TEST_USER_A_EMAIL: A_EMAIL,
  TEST_USER_A_PASSWORD: A_PASS,
  TEST_USER_B_EMAIL: B_EMAIL,
  TEST_USER_B_PASSWORD: B_PASS,
})) {
  if (!value) {
    console.error(`Missing ${name}. See the header of this file.`)
    process.exit(1)
  }
}

let failures = 0
let checks = 0

function ok(label) {
  checks++
  console.log(`  \x1b[32mPASS\x1b[0m  ${label}`)
}

function fail(label, detail) {
  checks++
  failures++
  console.error(`  \x1b[31mFAIL\x1b[0m  ${label}`)
  if (detail) console.error(`        ${detail}`)
}

/** Sign in and return a client scoped to that user's JWT. */
async function signIn(email, password, label) {
  const client = createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    console.error(`\nCould not sign in as ${label}: ${error.message}`)
    console.error('Has the account been created and its email confirmed?')
    process.exit(1)
  }
  return { client, userId: data.user.id }
}

console.log('RLS isolation verification\n')

const a = await signIn(A_EMAIL, A_PASS, 'user A')
const b = await signIn(B_EMAIL, B_PASS, 'user B')

if (a.userId === b.userId) {
  console.error('\nBoth sets of credentials resolve to the SAME user. Use two distinct accounts.')
  process.exit(1)
}
console.log(`  signed in as two distinct users\n`)

// --- Setup: user A creates a portfolio and a watchlist ----------------------
const { data: portfolio, error: pErr } = await a.client
  .from('portfolios')
  .insert({ user_id: a.userId, name: 'RLS probe portfolio' })
  .select()
  .single()

if (pErr) {
  console.error(`User A could not create a portfolio: ${pErr.message}`)
  console.error('That is an RLS failure in its own right — the insert policy is too strict.')
  process.exit(1)
}
ok('user A can create their own portfolio')

const { data: watchlist, error: wErr } = await a.client
  .from('watchlists')
  .insert({ user_id: a.userId, name: 'RLS probe watchlist' })
  .select()
  .single()

if (wErr) {
  fail('user A can create their own watchlist', wErr.message)
}

// --- The actual isolation checks -------------------------------------------
console.log('\nSELECT isolation')
{
  const { data } = await a.client.from('portfolios').select('id').eq('id', portfolio.id)
  data?.length === 1
    ? ok('user A sees their own portfolio')
    : fail('user A sees their own portfolio', 'own row not returned')
}
{
  const { data } = await b.client.from('portfolios').select('id').eq('id', portfolio.id)
  data?.length === 0
    ? ok("user B CANNOT see user A's portfolio")
    : fail("user B CANNOT see user A's portfolio", `LEAKED ${data?.length} row(s)`)
}
{
  const { data } = await b.client.from('watchlists').select('id')
  const leaked = (data ?? []).some((r) => r.id === watchlist?.id)
  leaked
    ? fail("user B CANNOT see user A's watchlist", 'LEAKED')
    : ok("user B CANNOT see user A's watchlist")
}

console.log('\nUPDATE / DELETE isolation')
{
  const { data } = await b.client
    .from('portfolios')
    .update({ name: 'hijacked' })
    .eq('id', portfolio.id)
    .select()
  data?.length === 0
    ? ok("user B CANNOT rename user A's portfolio")
    : fail("user B CANNOT rename user A's portfolio", 'UPDATE SUCCEEDED')
}
{
  const { data } = await b.client.from('portfolios').delete().eq('id', portfolio.id).select()
  data?.length === 0
    ? ok("user B CANNOT delete user A's portfolio")
    : fail("user B CANNOT delete user A's portfolio", 'DELETE SUCCEEDED')
}

// --- The check this whole script exists for --------------------------------
//
// user_id is denormalised onto child tables so policies avoid a join. A policy
// of `user_id = auth.uid()` ALONE would let user B insert a row carrying their
// OWN user_id but pointing at user A's parent row — writing into a container
// they do not own. The EXISTS clause in the write policies is what stops it.
//
// This is the single most likely place for a policy bug, which is why it gets
// its own section.
console.log('\nCross-user parent ownership (the EXISTS clauses)')
{
  const { error } = await b.client
    .from('watchlist_settings')
    .insert({ watchlist_id: watchlist?.id, user_id: b.userId, refresh_interval_minutes: 15 })
  error
    ? ok("user B CANNOT attach settings to user A's watchlist")
    : fail(
        "user B CANNOT attach settings to user A's watchlist",
        'INSERT SUCCEEDED — the EXISTS clause is missing or wrong',
      )
}
{
  // Same attack, spelled differently: claim A's user_id outright.
  const { error } = await b.client
    .from('portfolios')
    .insert({ user_id: a.userId, name: 'forged' })
  error
    ? ok("user B CANNOT create a portfolio owned by user A")
    : fail("user B CANNOT create a portfolio owned by user A", 'INSERT SUCCEEDED')
}

console.log('\nService-role surface')
{
  // notifications has no INSERT policy — only the alert engine writes them.
  const { error } = await a.client
    .from('notifications')
    .insert({ user_id: a.userId, title: 'forged', body: 'forged' })
  error
    ? ok('users CANNOT forge their own notifications')
    : fail('users CANNOT forge their own notifications', 'INSERT SUCCEEDED')
}

// --- Cleanup ---------------------------------------------------------------
await a.client.from('watchlists').delete().eq('id', watchlist?.id)
await a.client.from('portfolios').delete().eq('id', portfolio.id)

{
  const { data } = await a.client.from('portfolios').select('id').eq('id', portfolio.id)
  data?.length === 0
    ? ok('cleanup: probe rows removed')
    : fail('cleanup: probe rows removed', 'leftover rows — delete them manually')
}

console.log(
  failures === 0
    ? `\n\x1b[32mPASS\x1b[0m — ${checks} checks, RLS isolates both users correctly`
    : `\n\x1b[31mFAIL\x1b[0m — ${failures} of ${checks} checks failed. DO NOT put real data in until fixed.`,
)
process.exit(failures === 0 ? 0 : 1)
