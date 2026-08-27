#!/usr/bin/env node
/**
 * 本番スモークテスト — デプロイ直後の生存確認（automated-deployment-verification の最小実装）
 * 使い方: npm run smoke [-- <baseUrl>]
 *   例: npm run smoke -- https://connectivebyte.com
 * 期待: 主要ページが200、sitemap/robots配信、404処理、API Functionが応答、
 *       セキュリティヘッダ付与。いずれかが崩れていれば exit 1。
 */
const baseUrl = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || 'https://connectivebyte.com').replace(/\/+$/, '');

const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail });

async function fetchWithTimeout(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      redirect: 'manual',
      headers: { 'User-Agent': 'connective-byte-smoke/1.0', ...(options.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

// --- 静的ページ ---
for (const path of ['/', '/about/', '/principles/', '/contact/', '/privacy/']) {
  try {
    const res = await fetchWithTimeout(path);
    const ok = res.status === 200;
    record(`GET ${path}`, ok, ok ? '' : `HTTP ${res.status}`);
    if (ok && path === '/') {
      const body = await res.text();
      const hasHtml = body.includes('</html>');
      record('GET / がHTMLを返す', hasHtml, hasHtml ? '' : 'bodyに</html>なし');
    }
  } catch (err) {
    record(`GET ${path}`, false, err.message);
  }
}

// --- trailingSlash リダイレクト（/about → /about/） ---
try {
  const res = await fetchWithTimeout('/about');
  const ok = res.status === 200 || (res.status >= 301 && res.status <= 308);
  record('GET /about（リダイレクト許容）', ok, `HTTP ${res.status}`);
} catch (err) {
  record('GET /about（リダイレクト許容）', false, err.message);
}

// --- 404処理 ---
try {
  const res = await fetchWithTimeout('/__smoke_not_found__');
  record('GET /__smoke_not_found__ → 404', res.status === 404, `HTTP ${res.status}`);
} catch (err) {
  record('GET /__smoke_not_found__ → 404', false, err.message);
}

// --- sitemap / robots ---
for (const path of ['/sitemap.xml', '/robots.txt']) {
  try {
    const res = await fetchWithTimeout(path);
    const ok = res.status === 200;
    record(`GET ${path}`, ok, ok ? '' : `HTTP ${res.status}`);
  } catch (err) {
    record(`GET ${path}`, false, err.message);
  }
}

// --- セキュリティヘッダ（public/_headers 由来） ---
try {
  const res = await fetchWithTimeout('/');
  const h = res.headers;
  const expected = ['x-frame-options', 'x-content-type-options', 'referrer-policy'];
  const missing = expected.filter((k) => !h.get(k));
  record('セキュリティヘッダ', missing.length === 0, missing.length ? `未設定: ${missing.join(', ')}` : '');
} catch (err) {
  record('セキュリティヘッダ', false, err.message);
}

// --- API Function 生存確認（実際のメールは送らない: 不正入力でバリデーション応答を期待） ---
for (const [path, payload] of [
  ['/api/contact', {}],
  ['/api/newsletter', { email: 'not-an-email' }],
]) {
  try {
    const res = await fetchWithTimeout(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // 400系（404以外）= Functionが生きてバリデーションが動いている。
    // 404 = Function/リダイレクト未配備、5xx = Function故障、いずれも失敗扱い
    const ok = res.status >= 400 && res.status < 500 && res.status !== 404;
    record(`POST ${path}（不正入力→4xx）`, ok, `HTTP ${res.status}`);
  } catch (err) {
    record(`POST ${path}（不正入力→4xx）`, false, err.message);
  }
}

// --- バックエンドAPI（Cloudflare Workers: api.connectivebyte.com） ---
const apiBase = (
  process.env.API_SMOKE_URL || 'https://api.connectivebyte.com'
).replace(/\/+$/, '');
for (const [path, options, expect] of [
  ['/api/health', {}, 200],
  [
    '/api/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    },
    400,
  ],
  // 無認証での保護リソースは 401 エンベロープで拒否されること
  ['/api/auth/sessions', {}, 401],
  ['/api/auth/me', {}, 401],
]) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let res;
    try {
      res = await fetch(`${apiBase}${path}`, {
        ...options,
        signal: controller.signal,
        headers: { 'User-Agent': 'connective-byte-smoke/1.0', ...(options.headers || {}) },
      });
    } finally {
      clearTimeout(timer);
    }
    const ok = res.status === expect;
    record(`API ${path} → ${expect}`, ok, ok ? '' : `HTTP ${res.status}`);
  } catch (err) {
    record(`API ${path} → ${expect}`, false, err.message);
  }
}

// --- auth: Google OAuth 開始エンドポイント（設定済みなら Google へ、未設定でも /login/ へ 302） ---
try {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(`${apiBase}/api/auth/google`, {
      signal: controller.signal,
      redirect: 'manual',
      headers: { 'User-Agent': 'connective-byte-smoke/1.0' },
    });
  } finally {
    clearTimeout(timer);
  }
  const ok = res.status >= 301 && res.status <= 308;
  record('API /api/auth/google → 302', ok, ok ? `→ ${res.headers.get('location')?.slice(0, 60)}` : `HTTP ${res.status}`);
} catch (err) {
  record('API /api/auth/google → 302', false, err.message);
}

// --- 結果 ---
console.log(`本番スモークテスト: ${baseUrl}\n`);
for (const r of results) console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 合格`);
if (failed.length) {
  console.log('❌ 失敗があります。CloudflareのDeployment historyと `npx wrangler tail` を確認してください。');
  process.exit(1);
}
