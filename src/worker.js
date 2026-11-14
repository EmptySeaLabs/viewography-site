// viewography.app Worker. Static files are served straight from assets; this script runs only for /api/*.
//   POST /api/beta             beta request form: Turnstile check, saved to D1 (one row per email), emailed to support@
//   GET  /api/streaming-week   "Streaming this week" on the home page: new US streaming movies and new seasons, from TMDB
// Secrets: TURNSTILE_SECRET, TMDB_TOKEN (a TMDB read access token).

const SITE_HOSTS = new Set(['viewography.app', 'www.viewography.app']);
const WEEK_KEY = 'streaming_week';
const WEEK_MAX_AGE_MS = 24 * 60 * 60 * 1000; // rebuild after a day
const WEEK_STALE_MS = 3 * 24 * 60 * 60 * 1000; // hide the section if the list is older than this

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/beta') return await beta(request, env, ctx, url);
      if (url.pathname === '/api/streaming-week') return await streamingWeek(request, env, ctx);
    } catch (error) {
      console.error('api error', url.pathname, error && error.stack || error);
      return json({ ok: false, error: 'server' }, 500);
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshWeek(env));
  },
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
}

// ---------- Beta requests ----------

async function beta(request, env, ctx, url) {
  if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, { allow: 'POST' });
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== url.host) return json({ ok: false, error: 'origin' }, 403);

  let form;
  try { form = await request.formData(); } catch { return json({ ok: false, error: 'form' }, 400); }
  const field = (name, max) => String(form.get(name) || '').trim().slice(0, max);
  const name = field('name', 120);
  const email = field('email', 254).toLowerCase();
  const model = field('model', 80);

  // The hidden "Website" field: people never fill it in. Answer as if it worked and save nothing.
  if (field('_honey', 200)) return json({ ok: true });
  if (!name || !model || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'fields' }, 400);

  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET || '', response: field('cf-turnstile-response', 2048), remoteip: request.headers.get('cf-connecting-ip') || '' }),
  }).then((r) => r.json()).catch(() => ({ success: false }));
  if (!verify.success) return json({ ok: false, error: 'check' }, 400);

  const source = SITE_HOSTS.has(url.hostname) ? 'site' : 'preview';
  const result = await env.DB.prepare(
    'INSERT INTO beta_requests (email, name, model, source, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING'
  ).bind(email, name, model, source, new Date().toISOString()).run();

  // A repeat email gets the same thank-you, without a second row or a second email to support@.
  if (result.meta.changes === 1) ctx.waitUntil(notify({ name, email, model, source }));
  return json({ ok: true });
}

// Mark still gets an email for each new request, as before, through FormSubmit to support@viewography.app.
async function notify({ name, email, model, source }) {
  const response = await fetch('https://formsubmit.co/ajax/support@viewography.app', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', origin: 'https://viewography.app', referer: 'https://viewography.app/beta/' },
    body: JSON.stringify({
      _subject: (source === 'preview' ? '[Preview test] ' : '') + 'Viewography beta access request',
      _template: 'table',
      name,
      email,
      'Email for TestFlight': email,
      'iPhone model': model,
      Saved: 'Cloudflare D1 (viewography-site, beta_requests)',
    }),
  }).catch((error) => ({ ok: false, status: String(error) }));
  if (!response.ok) console.error('formsubmit failed', response.status);
}

// ---------- Streaming this week ----------

async function streamingWeek(request, env, ctx) {
  const cache = caches.default;
  // Bump the version when the list's shape changes, so old cached copies are skipped.
  const cacheKey = new Request(new URL('/api/streaming-week?v=2', request.url).toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const row = await env.DB.prepare('SELECT value, updated_at FROM site_cache WHERE key = ?').bind(WEEK_KEY).first();
  let week = row ? JSON.parse(row.value) : null;
  const age = row ? Date.now() - Date.parse(row.updated_at) : Infinity;
  if (!week) week = await refreshWeek(env);
  else if (age > WEEK_MAX_AGE_MS) ctx.waitUntil(refreshWeek(env)); // serve the old list, rebuild in the background

  const fresh = week && Date.now() - Date.parse(week.built) < WEEK_STALE_MS;
  if (!fresh) return json({ movies: [], shows: [] }); // not cached, so the next visit tries again
  const response = json(week, 200, { 'cache-control': 'public, max-age=3600' });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

// Preferred names for the services people know; anything else uses TMDB's own name.
const SERVICE_ORDER = ['Netflix', 'Disney Plus', 'Max', 'HBO Max', 'Hulu', 'Amazon Prime Video', 'Apple TV', 'Apple TV Plus', 'Paramount Plus', 'Paramount Plus Premium', 'Paramount Plus Essential', 'Peacock', 'Peacock Premium'];
const SERVICE_NAMES = { 'Disney Plus': 'Disney+', 'Apple TV Plus': 'Apple TV+', 'Apple TV': 'Apple TV+', 'Paramount Plus': 'Paramount+', 'Paramount Plus Premium': 'Paramount+', 'Paramount Plus Essential': 'Paramount+', 'Peacock Premium': 'Peacock', 'Amazon Prime Video': 'Prime Video', 'HBO Max': 'Max' };

function service(providers) {
  const names = (providers?.results?.US?.flatrate || []).map((p) => p.provider_name)
    .filter((n) => !/with Ads|Channel|fuboTV|YouTube TV|Sling|DIRECTV|Philo/i.test(n));
  if (!names.length) return null;
  const known = SERVICE_ORDER.find((n) => names.includes(n));
  const name = known || names[0];
  return SERVICE_NAMES[name] || name;
}

async function refreshWeek(env) {
  if (!env.TMDB_TOKEN) return null;
  const tmdb = async (path) => {
    const r = await fetch('https://api.themoviedb.org/3/' + path, { headers: { authorization: 'Bearer ' + env.TMDB_TOKEN, accept: 'application/json' } });
    if (!r.ok) throw new Error('tmdb ' + r.status + ' ' + path.split('?')[0]);
    return r.json();
  };
  const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  const today = day(0), start = day(-7), yearAgo = day(-365);
  const base = 'watch_region=US&with_watch_monetization_types=flatrate&include_adult=false&language=en-US';
  const poster = (p) => (p ? 'https://image.tmdb.org/t/p/w185' + p : null);

  // Movies released to streaming in the last 7 days (digital release in the US), made in the last year.
  const movieList = await tmdb(`discover/movie?${base}&region=US&with_release_type=4&release_date.gte=${start}&release_date.lte=${today}&primary_release_date.gte=${yearAgo}&sort_by=popularity.desc`);
  const movies = [];
  for (const m of movieList.results.slice(0, 10)) {
    if (movies.length >= 6) break;
    const d = await tmdb(`movie/${m.id}?append_to_response=watch/providers&language=en-US`);
    const s = service(d['watch/providers']);
    if (s && d.poster_path) movies.push({ id: d.id, title: d.title, service: s, poster: poster(d.poster_path) });
  }

  // Shows whose current season started in the last 7 days (new series and new seasons). No news, talk, reality or soaps.
  const showQuery = `discover/tv?${base}&air_date.gte=${start}&air_date.lte=${today}&without_genres=10763,10764,10766,10767&sort_by=popularity.desc`;
  const [p1, p2] = await Promise.all([tmdb(showQuery), tmdb(showQuery + '&page=2')]);
  const shows = [];
  for (const x of [...p1.results, ...p2.results].slice(0, 28)) {
    if (shows.length >= 6) break;
    const d = await tmdb(`tv/${x.id}?append_to_response=watch/providers&language=en-US`);
    const last = d.last_episode_to_air || {};
    const season = (d.seasons || []).find((s) => s.season_number === last.season_number);
    if (!season?.air_date || season.air_date < start || season.air_date > today) continue;
    const s = service(d['watch/providers']);
    if (s && d.poster_path) shows.push({ id: d.id, title: d.name, season: last.season_number, service: s, poster: poster(d.poster_path) });
  }

  const week = { built: new Date().toISOString(), from: start, to: today, movies, shows };
  await env.DB.prepare('INSERT INTO site_cache (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(WEEK_KEY, JSON.stringify(week), week.built).run();
  return week;
}
