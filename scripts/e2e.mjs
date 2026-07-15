// CarGuy end-to-end API smoke test.
// Exercises every feature module against a running API (default http://localhost:4000/api).
// Usage: node scripts/e2e.mjs

const BASE = process.env.API_URL || 'http://localhost:4000/api';

let passed = 0;
let failed = 0;
const failures = [];

function log(ok, name, extra = '') {
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${ok ? '\x1b[32m' : '\x1b[31m'}[${mark}]\x1b[0m ${name}${extra ? ' — ' + extra : ''}`);
  if (ok) passed++;
  else {
    failed++;
    failures.push(`${name}${extra ? ' — ' + extra : ''}`);
  }
}

async function req(method, path, { token, body, query } = {}) {
  let url = BASE + path;
  if (query) {
    const qs = new URLSearchParams(query).toString();
    url += (path.includes('?') ? '&' : '?') + qs;
  }
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, ok: res.ok, json };
}

function data(r) {
  return r.json && typeof r.json === 'object' && 'data' in r.json ? r.json.data : r.json;
}
function list(d) {
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.items)) return d.items;
  return [];
}

// Runs a single test: fn should return {ok, extra} or throw.
async function test(name, fn) {
  try {
    const result = await fn();
    if (result === false) log(false, name);
    else if (result && result.ok === false) log(false, name, result.extra || '');
    else log(true, name, result && result.extra ? result.extra : '');
  } catch (e) {
    log(false, name, e.message);
  }
}

function errText(r) {
  const m = r.json && r.json.message;
  return `HTTP ${r.status}${m ? ' ' + (Array.isArray(m) ? m.join(',') : m) : ''}`;
}

const ts = Date.now();

async function main() {
  console.log(`\n=== CarGuy E2E against ${BASE} ===\n`);

  const ctx = {};

  // ---------- AUTH ----------
  await test('AUTH register userA', async () => {
    const r = await req('POST', '/auth/register', {
      body: {
        email: `a_${ts}@carguy.test`,
        username: `userA_${ts}`,
        password: 'Passw0rd!',
        displayName: 'User A',
      },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    const d = data(r);
    ctx.a = { token: d.accessToken, refresh: d.refreshToken, id: d.user.id, username: d.user.username };
    return { extra: `role=${d.user.role}` };
  });

  await test('AUTH register userB', async () => {
    const r = await req('POST', '/auth/register', {
      body: {
        email: `b_${ts}@carguy.test`,
        username: `userB_${ts}`,
        password: 'Passw0rd!',
        displayName: 'User B',
      },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    const d = data(r);
    ctx.b = { token: d.accessToken, id: d.user.id, username: d.user.username };
    return true;
  });

  await test('AUTH register shop owner', async () => {
    const r = await req('POST', '/auth/register', {
      body: {
        email: `shop_${ts}@carguy.test`,
        username: `shop_${ts}`,
        password: 'Passw0rd!',
        displayName: 'Shop Owner',
      },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    const d = data(r);
    ctx.shop = { token: d.accessToken, id: d.user.id, username: d.user.username };
    return true;
  });

  await test('AUTH login admin (seeded)', async () => {
    const r = await req('POST', '/auth/login', {
      body: { email: 'admin@carguy.app', password: 'Admin123!' },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    const d = data(r);
    ctx.admin = { token: d.accessToken, id: d.user.id };
    return { extra: `role=${d.user.role}` };
  });

  await test('AUTH /auth/me', async () => {
    const r = await req('GET', '/auth/me', { token: ctx.a.token });
    return r.ok ? { extra: data(r).email } : { ok: false, extra: errText(r) };
  });

  await test('AUTH refresh token rotation', async () => {
    const r = await req('POST', '/auth/refresh', { body: { refreshToken: ctx.a.refresh } });
    if (!r.ok) return { ok: false, extra: errText(r) };
    const d = data(r);
    if (d.accessToken) ctx.a.token = d.accessToken;
    return true;
  });

  // ---------- PROFILE ----------
  await test('PROFILE get me', async () => {
    const r = await req('GET', '/profiles/me', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('PROFILE update me', async () => {
    const r = await req('PUT', '/profiles/me', {
      token: ctx.a.token,
      body: { bio: 'Car enthusiast', city: 'Tbilisi', favoriteBrands: ['BMW', 'Toyota'] },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- USERS ----------
  await test('USERS list (admin only)', async () => {
    const r = await req('GET', '/users', { token: ctx.admin.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('USERS list forbidden for normal user (RBAC)', async () => {
    const r = await req('GET', '/users', { token: ctx.a.token });
    return r.status === 403 ? { extra: 'correctly blocked' } : { ok: false, extra: `expected 403, got ${r.status}` };
  });
  await test('USERS get by username', async () => {
    const r = await req('GET', `/users/${ctx.b.username}`, { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- FOLLOW ----------
  await test('FOLLOW user B', async () => {
    const r = await req('POST', `/users/${ctx.b.username}/follow`, { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('FOLLOW list followers of B', async () => {
    const r = await req('GET', `/users/${ctx.b.username}/followers`, { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('FOLLOW list following of A', async () => {
    const r = await req('GET', `/users/${ctx.a.username}/following`, { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- POSTS ----------
  await test('POSTS create photo post', async () => {
    const r = await req('POST', '/posts', {
      token: ctx.a.token,
      body: { type: 'PHOTO', content: 'My new build #bmw', hashtags: ['bmw'] },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.postId = data(r).id;
    return true;
  });
  await test('POSTS public feed', async () => {
    const r = await req('GET', '/posts');
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('POSTS personalized feed', async () => {
    const r = await req('GET', '/posts/feed', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('POSTS get one', async () => {
    const r = await req('GET', `/posts/${ctx.postId}`, { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('POSTS like (as B)', async () => {
    const r = await req('POST', `/posts/${ctx.postId}/like`, { token: ctx.b.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('POSTS bookmark', async () => {
    const r = await req('POST', `/posts/${ctx.postId}/bookmark`, { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('POSTS list bookmarks', async () => {
    const r = await req('GET', '/posts/bookmarks', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('POSTS add comment', async () => {
    const r = await req('POST', `/posts/${ctx.postId}/comments`, {
      token: ctx.b.token,
      body: { content: 'Sick build!' },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.commentId = data(r).id;
    return true;
  });
  await test('POSTS list comments', async () => {
    const r = await req('GET', `/posts/${ctx.postId}/comments`, { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('POSTS like comment', async () => {
    const r = await req('POST', `/posts/comments/${ctx.commentId}/like`, { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('POSTS create poll + vote', async () => {
    const r = await req('POST', '/posts', {
      token: ctx.a.token,
      body: { type: 'POLL', content: 'Best engine?', poll: { question: 'Best engine?', options: ['V8', 'I6'] } },
    });
    if (!r.ok) return { ok: false, extra: 'create ' + errText(r) };
    const pid = data(r).id;
    const g = await req('GET', `/posts/${pid}`, { token: ctx.a.token });
    const opt = data(g)?.poll?.options?.[0];
    if (!opt) return { ok: false, extra: 'no poll options returned' };
    const v = await req('POST', `/posts/poll/options/${opt.id}/vote`, { token: ctx.b.token });
    return v.ok || { ok: false, extra: 'vote ' + errText(v) };
  });

  // ---------- STORIES ----------
  await test('STORIES create', async () => {
    const r = await req('POST', '/stories', {
      token: ctx.a.token,
      body: { mediaUrl: 'https://picsum.photos/400/700', caption: 'On the road' },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.storyId = data(r).id;
    return true;
  });
  await test('STORIES feed', async () => {
    const r = await req('GET', '/stories', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('STORIES view (as B)', async () => {
    const r = await req('POST', `/stories/${ctx.storyId}/view`, { token: ctx.b.token });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- MESSAGING ----------
  await test('MESSAGING open direct conversation', async () => {
    const r = await req('POST', '/conversations/direct', {
      token: ctx.a.token,
      body: { recipientId: ctx.b.id, content: 'Hey!' },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.convId = data(r).id;
    return true;
  });
  await test('MESSAGING send message', async () => {
    const r = await req('POST', `/conversations/${ctx.convId}/messages`, {
      token: ctx.a.token,
      body: { content: 'Are you coming to the meet?' },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('MESSAGING list conversations', async () => {
    const r = await req('GET', '/conversations', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('MESSAGING get messages', async () => {
    const r = await req('GET', `/conversations/${ctx.convId}/messages`, { token: ctx.b.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('MESSAGING mark read', async () => {
    const r = await req('PATCH', `/conversations/${ctx.convId}/read`, { token: ctx.b.token });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- BUSINESS (workshop) ----------
  await test('BUSINESS create workshop', async () => {
    const r = await req('POST', '/businesses', {
      token: ctx.shop.token,
      body: {
        name: `Pro Garage ${ts}`,
        description: 'Full-service auto workshop',
        category: 'MECHANIC',
        city: 'Tbilisi',
        country: 'Georgia',
        phone: '+995555000000',
        latitude: 41.7151,
        longitude: 44.8271,
      },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.business = { id: data(r).id, slug: data(r).slug };
    return { extra: ctx.business.slug };
  });
  await test('BUSINESS list', async () => {
    const r = await req('GET', '/businesses');
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('BUSINESS get mine', async () => {
    const r = await req('GET', '/businesses/me', { token: ctx.shop.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('BUSINESS get by slug', async () => {
    const r = await req('GET', `/businesses/${ctx.business.slug}`);
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('BUSINESS dashboard', async () => {
    const r = await req('GET', '/businesses/me/dashboard', { token: ctx.shop.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('BUSINESS admin verify', async () => {
    const r = await req('PATCH', `/businesses/${ctx.business.id}/verify`, {
      token: ctx.admin.token,
      body: { status: 'VERIFIED' },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- SERVICES ----------
  await test('SERVICES create', async () => {
    const r = await req('POST', '/services', {
      token: ctx.shop.token,
      body: { name: 'Oil Change', category: 'OIL_CHANGE', priceFrom: 50, priceTo: 90, durationMin: 45 },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.serviceId = data(r).id;
    return true;
  });
  await test('SERVICES set working hours', async () => {
    const r = await req('PUT', '/services/working-hours/set', {
      token: ctx.shop.token,
      body: { hours: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '18:00' }] },
    });
    // Some impls accept an array directly; retry if needed
    if (!r.ok) {
      const r2 = await req('PUT', '/services/working-hours/set', {
        token: ctx.shop.token,
        body: [{ dayOfWeek: 1, openTime: '09:00', closeTime: '18:00' }],
      });
      return r2.ok || { ok: false, extra: errText(r) };
    }
    return true;
  });

  // ---------- BOOKING ----------
  await test('BOOKING create (user A)', async () => {
    const r = await req('POST', '/bookings', {
      token: ctx.a.token,
      body: {
        businessId: ctx.business.id,
        serviceId: ctx.serviceId,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        notes: 'Please check brakes too',
      },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.bookingId = data(r).id;
    return true;
  });
  await test('BOOKING list (user)', async () => {
    const r = await req('GET', '/bookings', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('BOOKING list (business)', async () => {
    const r = await req('GET', '/bookings/business', { token: ctx.shop.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('BOOKING confirm then complete', async () => {
    const r = await req('PATCH', `/bookings/${ctx.bookingId}/status`, {
      token: ctx.shop.token,
      body: { status: 'CONFIRMED' },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    const r2 = await req('PATCH', `/bookings/${ctx.bookingId}/status`, {
      token: ctx.shop.token,
      body: { status: 'COMPLETED', finalPrice: 75 },
    });
    return r2.ok || { ok: false, extra: errText(r2) };
  });

  // ---------- REVIEWS ----------
  await test('REVIEWS create (verified via booking)', async () => {
    const r = await req('POST', '/reviews', {
      token: ctx.a.token,
      body: {
        businessId: ctx.business.id,
        bookingId: ctx.bookingId,
        rating: 5,
        quality: 5,
        price: 4,
        comment: 'Excellent service!',
      },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('REVIEWS list for business', async () => {
    const r = await req('GET', `/reviews/business/${ctx.business.id}`);
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('REVIEWS top rated', async () => {
    const r = await req('GET', '/reviews/top-rated');
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- DISCOUNTS ----------
  await test('DISCOUNTS create', async () => {
    const r = await req('POST', '/discounts', {
      token: ctx.shop.token,
      body: { type: 'SPECIAL_OFFER', title: '20% off oil change', percentOff: 20, description: 'Limited time' },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.discountId = data(r).id;
    return true;
  });
  await test('DISCOUNTS list', async () => {
    const r = await req('GET', '/discounts');
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('DISCOUNTS mine (business)', async () => {
    const r = await req('GET', '/discounts/mine', { token: ctx.shop.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('DISCOUNTS redeem (user)', async () => {
    const r = await req('POST', `/discounts/${ctx.discountId}/redeem`, { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- MARKETPLACE ----------
  await test('MARKETPLACE create listing', async () => {
    const r = await req('POST', '/marketplace', {
      token: ctx.a.token,
      body: {
        title: 'BMW E46 Alloy Wheels',
        description: 'Set of 4 in great condition, 18 inch staggered.',
        category: 'WHEEL',
        condition: 'USED',
        price: 600,
        city: 'Tbilisi',
      },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.listing = { id: data(r).id, slug: data(r).slug };
    return true;
  });
  await test('MARKETPLACE list', async () => {
    const r = await req('GET', '/marketplace');
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('MARKETPLACE mine', async () => {
    const r = await req('GET', '/marketplace/mine', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('MARKETPLACE get by slug', async () => {
    const r = await req('GET', `/marketplace/${ctx.listing.slug}`);
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('MARKETPLACE favorite (as B)', async () => {
    const r = await req('POST', `/marketplace/${ctx.listing.id}/favorite`, { token: ctx.b.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('MARKETPLACE favorites list (B)', async () => {
    const r = await req('GET', '/marketplace/favorites', { token: ctx.b.token });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- GARAGE ----------
  await test('GARAGE add vehicle', async () => {
    const r = await req('POST', '/garage', {
      token: ctx.a.token,
      body: { nickname: 'Daily', brand: 'BMW', model: 'M3', year: 2019, mileage: 45000, fuelType: 'PETROL' },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.vehicleId = data(r).id;
    return true;
  });
  await test('GARAGE list', async () => {
    const r = await req('GET', '/garage', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('GARAGE get one', async () => {
    const r = await req('GET', `/garage/${ctx.vehicleId}`, { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('GARAGE add maintenance', async () => {
    const r = await req('POST', `/garage/${ctx.vehicleId}/maintenance`, {
      token: ctx.a.token,
      body: { type: 'OIL_CHANGE', title: 'Oil & filter', mileage: 45000, cost: 80, performedAt: new Date().toISOString() },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('GARAGE add mileage log', async () => {
    const r = await req('POST', `/garage/${ctx.vehicleId}/mileage`, {
      token: ctx.a.token,
      body: { mileage: 45500, liters: 40, cost: 90 },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('GARAGE add reminder', async () => {
    const r = await req('POST', `/garage/${ctx.vehicleId}/reminders`, {
      token: ctx.a.token,
      body: { type: 'INSPECTION', title: 'Annual inspection', dueMileage: 50000 },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- FORUM ----------
  await test('FORUM categories', async () => {
    const r = await req('GET', '/forum/categories');
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.forumCat = list(data(r))[0]?.slug;
    return { extra: `${list(data(r)).length} categories` };
  });
  await test('FORUM create thread', async () => {
    const r = await req('POST', '/forum/threads', {
      token: ctx.a.token,
      body: {
        categorySlug: ctx.forumCat,
        title: 'How to diagnose a P0300 code?',
        content: 'My car throws a random misfire code, where should I start looking?',
      },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.thread = { id: data(r).id, slug: data(r).slug };
    return true;
  });
  await test('FORUM list threads', async () => {
    const r = await req('GET', '/forum/threads');
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('FORUM get thread by slug', async () => {
    const r = await req('GET', `/forum/threads/${ctx.thread.slug}`);
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('FORUM reply to thread', async () => {
    const r = await req('POST', `/forum/threads/${ctx.thread.id}/replies`, {
      token: ctx.b.token,
      body: { content: 'Check your spark plugs and coil packs first.' },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.forumPostId = data(r).id;
    return true;
  });
  await test('FORUM vote thread', async () => {
    const r = await req('POST', `/forum/threads/${ctx.thread.id}/vote`, {
      token: ctx.b.token,
      body: { value: 1 },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('FORUM vote post', async () => {
    const r = await req('POST', `/forum/posts/${ctx.forumPostId}/vote`, {
      token: ctx.a.token,
      body: { value: 1 },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('FORUM accept answer', async () => {
    const r = await req('PATCH', `/forum/posts/${ctx.forumPostId}/accept`, { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- REPUTATION ----------
  await test('REPUTATION me', async () => {
    const r = await req('GET', '/reputation/me', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('REPUTATION my badges', async () => {
    const r = await req('GET', '/reputation/me/badges', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('REPUTATION my achievements', async () => {
    const r = await req('GET', '/reputation/me/achievements', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('REPUTATION leaderboard', async () => {
    const r = await req('GET', '/reputation/leaderboard');
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('REPUTATION admin verify mechanic', async () => {
    const r = await req('PATCH', `/reputation/${ctx.b.id}/verify/mechanic`, {
      token: ctx.admin.token,
      body: { value: true },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- NEWS ----------
  await test('NEWS categories', async () => {
    const r = await req('GET', '/news/categories');
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.newsCat = list(data(r))[0]?.slug;
    return { extra: `${list(data(r)).length} categories` };
  });
  await test('NEWS create article (admin)', async () => {
    const r = await req('POST', '/news', {
      token: ctx.admin.token,
      body: {
        title: `New EV incentives announced ${ts}`,
        excerpt: 'Government rolls out new subsidies.',
        content: 'The government announced a new set of incentives for electric vehicle buyers this quarter.',
        categorySlug: ctx.newsCat,
        isPublished: true,
      },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.articleSlug = data(r).slug;
    return true;
  });
  await test('NEWS list', async () => {
    const r = await req('GET', '/news');
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('NEWS highlights', async () => {
    const r = await req('GET', '/news/highlights');
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('NEWS get by slug', async () => {
    const r = await req('GET', `/news/${ctx.articleSlug}`);
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- EVENTS ----------
  await test('EVENTS create', async () => {
    const r = await req('POST', '/events', {
      token: ctx.a.token,
      body: {
        title: `Saturday Car Meet ${ts}`,
        description: 'Monthly community meetup',
        type: 'CAR_MEET',
        city: 'Tbilisi',
        startsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.event = { id: data(r).id, slug: data(r).slug };
    return true;
  });
  await test('EVENTS list', async () => {
    const r = await req('GET', '/events');
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('EVENTS get by slug', async () => {
    const r = await req('GET', `/events/${ctx.event.slug}`);
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('EVENTS rsvp', async () => {
    const r = await req('POST', `/events/${ctx.event.id}/rsvp`, {
      token: ctx.b.token,
      body: { status: 'GOING' },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- INSURANCE ----------
  await test('INSURANCE companies', async () => {
    const r = await req('GET', '/insurance/companies');
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('INSURANCE plans', async () => {
    const r = await req('GET', '/insurance/plans');
    if (!r.ok) return { ok: false, extra: errText(r) };
    const plans = list(data(r));
    ctx.planIds = plans.map((p) => p.id);
    return { extra: `${plans.length} plans` };
  });
  await test('INSURANCE compare', async () => {
    if (!ctx.planIds || ctx.planIds.length < 2) return { ok: false, extra: 'not enough plans' };
    const r = await req('GET', '/insurance/compare', { query: { ids: ctx.planIds.slice(0, 2).join(',') } });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('INSURANCE quote', async () => {
    if (!ctx.planIds || !ctx.planIds.length) return { ok: false, extra: 'no plans' };
    const r = await req('POST', '/insurance/quote', {
      token: ctx.a.token,
      body: { planId: ctx.planIds[0] },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.policyId = data(r).id;
    return true;
  });
  await test('INSURANCE activate policy', async () => {
    const r = await req('PATCH', `/insurance/policies/${ctx.policyId}/activate`, { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('INSURANCE my policies', async () => {
    const r = await req('GET', '/insurance/policies', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('INSURANCE file claim', async () => {
    const r = await req('POST', '/insurance/claims', {
      token: ctx.a.token,
      body: { policyId: ctx.policyId, title: 'Windshield crack', description: 'Rock hit the windshield on the highway.' },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('INSURANCE my claims', async () => {
    const r = await req('GET', '/insurance/claims', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- AI ----------
  await test('AI ask', async () => {
    const r = await req('POST', '/ai/ask', {
      token: ctx.a.token,
      body: { message: 'My check engine light is on and the car shakes at idle. What could it be?' },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('AI conversations', async () => {
    const r = await req('GET', '/ai/conversations', { token: ctx.a.token });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- MAP ----------
  await test('MAP config', async () => {
    const r = await req('GET', '/map/config');
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('MAP nearby', async () => {
    const r = await req('GET', '/map/nearby', { query: { lat: 41.7151, lng: 44.8271, radiusKm: 25 } });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('MAP create place (admin)', async () => {
    const r = await req('POST', '/map/places', {
      token: ctx.admin.token,
      body: { name: `Vake Fuel ${ts}`, type: 'FUEL_STATION', city: 'Tbilisi', latitude: 41.71, longitude: 44.77 },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- ADMIN ----------
  await test('ADMIN stats', async () => {
    const r = await req('GET', '/admin/stats', { token: ctx.admin.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('ADMIN file report (user)', async () => {
    const r = await req('POST', '/reports', {
      token: ctx.b.token,
      body: { targetType: 'POST', targetId: ctx.postId, reason: 'Spam' },
    });
    if (!r.ok) return { ok: false, extra: errText(r) };
    ctx.reportId = data(r).id;
    return true;
  });
  await test('ADMIN list reports', async () => {
    const r = await req('GET', '/admin/reports', { token: ctx.admin.token });
    return r.ok || { ok: false, extra: errText(r) };
  });
  await test('ADMIN resolve report', async () => {
    const r = await req('PATCH', `/admin/reports/${ctx.reportId}`, {
      token: ctx.admin.token,
      body: { status: 'RESOLVED', resolutionNote: 'Reviewed, no action needed.' },
    });
    return r.ok || { ok: false, extra: errText(r) };
  });

  // ---------- VIN removal check ----------
  await test('VIN endpoint removed (expect 404)', async () => {
    const r = await req('GET', '/vin/WBA12345678901234');
    return r.status === 404 ? { extra: 'gone' } : { ok: false, extra: `got HTTP ${r.status}` };
  });

  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log('  - ' + f);
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
