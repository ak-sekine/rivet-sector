// Check the workflow for the exact local commit and byte equality of all public assets.
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const api = `https://api.github.com/repos/ak-sekine/rivet-sector/actions/runs?head_sha=${sha}`;
  const r = await fetch(api, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(20000) });
  assert.equal(r.status, 200, 'Actions API');
  const runs = (await r.json()).workflow_runs;
  console.log(JSON.stringify(runs.map(run => ({ sha: run.head_sha, name: run.name, status: run.status, conclusion: run.conclusion, url: run.html_url })), null, 2));
  const deployment = runs.find(run => run.name === 'Deploy GitHub Pages');
  assert(deployment, 'No Pages run found yet');
  assert.equal(deployment.status, 'completed', 'Pages deployment is still pending');
  assert.equal(deployment.conclusion, 'success', 'Pages deployment failed');
  const root = 'https://ak-sekine.github.io/rivet-sector/';
  const catalog = JSON.parse(readFileSync('public/2d/assets/catalog.json', 'utf8'));
  const paths = ['manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',
    ...catalog.images.map(im => '2d/assets/' + im.file), ...catalog.audio.map(wav => '2d/assets/' + wav.file), '2d/assets/catalog.json'];
  const results = await Promise.all(paths.map(async path => {
    const response = await fetch(root + path + `?commit=${sha}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, path); assert.deepEqual(Buffer.from(await response.arrayBuffer()), readFileSync('public/' + path), path);
    return path;
  }));
  for (const path of ['', '2d/']) {
    const response = await fetch(root + path + `?commit=${sha}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) }); assert.equal(response.status, 200);
    const html = await response.text(); if (!path) assert(html.includes('href="/rivet-sector/manifest.webmanifest"'));
    assert(html.includes(path ? 'location.replace' : '2D Action Shooter'));
    const local = readFileSync(path ? 'dist/2d/index.html' : 'dist/index.html', 'utf8');
    assert.equal(html, local, 'Published HTML must match the locally tested production build');
  }
  console.log(`PASS commit ${sha}: Pages workflow success, 2D + legacy redirect HTML match dist, ${results.length} public assets HTTP 200 and byte-identical`);
})().catch(error => { console.error(error); process.exitCode = 1; });
