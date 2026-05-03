/**
 * Fire N parallel GET requests to /api/health to sanity-check concurrency (no k6 required).
 * Usage:
 *   BASE_URL=https://www.pesttrace.com CONCURRENCY=40 ROUNDS=5 node scripts/concurrent-health-smoke.js
 */
const base = (process.env.BASE_URL || 'https://www.pesttrace.com').replace(/\/$/, '');
const concurrency = Math.min(200, Math.max(1, Number(process.env.CONCURRENCY || 20)));
const rounds = Math.min(50, Math.max(1, Number(process.env.ROUNDS || 3)));

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function oneRequest() {
  const start = performance.now();
  try {
    const res = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(25000),
    });
    const ms = performance.now() - start;
    return { ok: res.ok, ms };
  } catch {
    const ms = performance.now() - start;
    return { ok: false, ms };
  }
}

async function round() {
  const batch = Array.from({ length: concurrency }, () => oneRequest());
  return Promise.all(batch);
}

async function main() {
  console.log(`Concurrent health: ${base}/api/health (${concurrency} parallel × ${rounds} rounds)\n`);
  const allMs = [];
  let failures = 0;
  for (let r = 0; r < rounds; r += 1) {
    const results = await round();
    for (const x of results) {
      if (!x.ok) failures += 1;
      allMs.push(x.ms);
    }
    console.log(`Round ${r + 1}: failures=${results.filter((x) => !x.ok).length}`);
  }
  allMs.sort((a, b) => a - b);
  const p50 = percentile(allMs, 50);
  const p95 = percentile(allMs, 95);
  console.log(`\nTotal requests: ${allMs.length}, failed: ${failures}`);
  console.log(`Latency ms — p50: ${p50.toFixed(0)}, p95: ${p95.toFixed(0)}, max: ${allMs[allMs.length - 1]?.toFixed(0) ?? 0}`);
  if (failures > 0) {
    console.error('\nSome requests failed.');
    process.exit(1);
  }
}

main();
