import { createServer } from 'net';
import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const targets = [
  'pages/_app.tsx',
  'pages/dashboard.tsx',
  'pages/reports.tsx',
  'pages/upgrade.tsx',
  'pages/auth/signin.tsx',
  'pages/auth/signup.tsx',
  'pages/api/subscription.ts',
  'pages/api/create-checkout-session.ts',
  'pages/api/technicians/certifications.ts',
  'lib/supabase.ts',
  'lib/prisma.ts',
  'prisma/schema.prisma',
];

console.log('Running smoke test...');
console.log('Checking required files');
for (const target of targets) {
  const path = join(root, target);
  if (!existsSync(path)) {
    console.error(`❌ Required file missing: ${target}`);
    process.exit(1);
  }
}
console.log('✅ Required files exist.');

console.log('Running production build (npm run build)...');
try {
  execSync('npm run build', {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
} catch (error) {
  console.error('❌ Production build failed.');
  process.exit(1);
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Failed to resolve a free port')));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        await fetch(url, { method: 'HEAD' });
        return resolve();
      } catch {
        if (Date.now() - start > timeout) {
          return reject(new Error(`Server did not respond within ${timeout}ms`));
        }
        setTimeout(attempt, 250);
      }
    };
    attempt();
  });
}

async function runHttpChecks(baseUrl) {
  const checks = [
    { path: '/', method: 'GET', expected: 200 },
    { path: '/auth/signin', method: 'GET', expected: 200 },
    { path: '/auth/signup', method: 'GET', expected: 200 },
    { path: '/upgrade', method: 'GET', expected: 200 },
    { path: '/api/subscription', method: 'GET', expected: [401, 400] },
    { path: '/api/create-checkout-session', method: 'GET', expected: [401, 405] },
    { path: '/api/technicians/certifications', method: 'GET', expected: [401, 405] },
    { path: '/api/reports', method: 'GET', expected: [401, 405] },
  ];

  for (const check of checks) {
    const url = `${baseUrl}${check.path}`;
    const res = await fetch(url, { method: check.method, redirect: 'manual' });
    const actual = res.status;
    const expected = Array.isArray(check.expected) ? check.expected : [check.expected];
    if (!expected.includes(actual)) {
      throw new Error(`Unexpected response for ${check.method} ${check.path}: ${actual}. Expected: ${expected.join(', ')}`);
    }
    console.log(`✅ ${check.method} ${check.path} returned ${actual}`);
  }
}

async function main() {
  const port = process.env.PORT ? Number(process.env.PORT) : await getAvailablePort();
  const baseUrl = `http://localhost:${port}`;

  console.log(`Starting Next.js production server on port ${port}...`);

  const server = spawn('npm', ['start'], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: true,
  });

  server.on('error', (error) => {
    console.error('❌ Failed to start production server:', error);
    process.exit(1);
  });

  let shuttingDown = false;
  const exitPromise = new Promise((resolve, reject) => {
    server.on('exit', (code, signal) => {
      if (shuttingDown) {
        return resolve();
      }

      if (code !== null && code !== 0) {
        reject(new Error(`Production server exited unexpectedly with code ${code} signal ${signal}`));
      } else if (signal) {
        reject(new Error(`Production server was terminated by signal ${signal}`));
      } else {
        resolve();
      }
    });
  });

  try {
    await waitForServer(`${baseUrl}/`, 30000);
    console.log('✅ Production server is responding.');
    await runHttpChecks(baseUrl);
  } catch (error) {
    console.error(`❌ Smoke test failed: ${error.message}`);
    shuttingDown = true;
    server.kill();
    process.exit(1);
  }

  shuttingDown = true;
  server.kill();

  try {
    await Promise.race([
      exitPromise,
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  } catch (error) {
    console.error(`❌ Server did not shut down cleanly: ${error.message}`);
    process.exit(1);
  }

  console.log('✅ Smoke test complete.');
}

main().catch((error) => {
  console.error(`❌ Smoke test failed: ${error.message}`);
  process.exit(1);
});
