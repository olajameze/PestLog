/**
 * Lightweight production (or staging) smoke: public pages and /api/health.
 * Usage: BASE_URL=https://www.pesttrace.com node scripts/production-smoke.js
 */
const base = (process.env.BASE_URL || 'https://www.pesttrace.com').replace(/\/$/, '');

const paths = ['/', '/home', '/auth/signin', '/auth/signup', '/upgrade', '/reports', '/api/health'];

async function check(path) {
  const url = `${base}${path}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    });
    clearTimeout(t);
    let ok = res.status >= 200 && res.status < 400;
    if (path === '/api/health' && ok) {
      try {
        const j = await res.json();
        ok = j?.ok === true;
      } catch {
        ok = false;
      }
    }
    return { path, status: res.status, ok };
  } catch (e) {
    clearTimeout(t);
    return { path, status: 0, ok: false, error: String(e) };
  }
}

async function main() {
  console.log(`Production smoke: ${base}\n`);
  let failed = false;
  for (const p of paths) {
    const r = await check(p);
    const line = r.ok ? `✅ ${p} → ${r.status}` : `❌ ${p} → ${r.status}${r.error ? ` (${r.error})` : ''}`;
    console.log(line);
    if (!r.ok) failed = true;
  }
  if (failed) {
    console.error('\nSmoke failed.');
    process.exit(1);
  }
  console.log('\nSmoke complete.');
}

main();
