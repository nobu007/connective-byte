#!/usr/bin/env node
/**
 * ローカル .env の検証（シークレット値は絶対に出力しない）
 * 使い方: npm run env:check
 */
import { readFileSync, existsSync } from 'node:fs';

const ENV_PATH = new URL('../.env', import.meta.url).pathname;

function loadEnvVars(path) {
  if (!existsSync(path)) return null;
  const vars = {};
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return vars;
}

const env = loadEnvVars(ENV_PATH);
if (env === null) {
  console.log('❌ .env がありません。cp .env.example .env で作成してください。');
  process.exit(1);
}

const isSet = (name) => Boolean(env[name]);
const results = [];

// --- Resend: フォーム/ニュースレター ---
if (!isSet('RESEND_API_KEY')) {
  results.push(['RESEND_API_KEY', '❌ 未設定（contact は開発モード、newsletter はエラーになる）']);
} else {
  results.push(['RESEND_API_KEY', '✅ 設定済み（下のAPI検証で有効性を確認）']);
}
results.push([
  'RESEND_AUDIENCE_ID',
  isSet('RESEND_AUDIENCE_ID')
    ? '✅ 設定済み（ニュースレター登録が有効）'
    : '⚠️ 未設定（ニュースレターAPIはエラーになる。Resend → Audiences で作成）',
]);

// --- Backend ---
results.push([
  'JWT_SECRET',
  isSet('JWT_SECRET')
    ? '✅ 設定済み'
    : '⚠️ 未設定（安全でないデフォルト値で動く。本番運用前に必須）',
]);

// --- 手動デプロイ（Cloudflare Pages: 現行） ---
results.push([
  'CLOUDFLARE_API_TOKEN',
  isSet('CLOUDFLARE_API_TOKEN')
    ? '✅ 設定済み（npm run deploy:cf が使える）'
    : '⚠️ 未設定（Cloudflare Pages デプロイ用。My Profile → API Tokens → Edit Cloudflare Pages テンプレート）',
]);

// --- 手動デプロイ（Netlify: 旧ホスティング） ---
results.push([
  'NETLIFY_AUTH_TOKEN / NETLIFY_SITE_ID',
  isSet('NETLIFY_AUTH_TOKEN') && isSet('NETLIFY_SITE_ID')
    ? '✅ 両方設定済み（旧: npm run deploy。Cloudflareへ移行済みのため通常不要）'
    : `ℹ️ 未設定（旧Netlify用。移行済みのため未設定でOK）`,
]);

console.log(`.env 検証結果（${ENV_PATH}）:\n`);
for (const [name, status] of results) console.log(`  ${status}  [${name}]`);

// --- Resend API 実検証（読み取り専用 GET /domains・メールは送らない） ---
if (isSet('RESEND_API_KEY')) {
  console.log('\nResend API 検証中（読み取り専用）...');
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
    });
    if (res.status === 200) {
      const data = await res.json();
      const verified = (data.data ?? [])
        .filter((d) => d.status === 'verified')
        .map((d) => d.name);
      console.log(
        verified.length
          ? `  ✅ キーは有効。検証済みドメイン: ${verified.join(', ')}`
          : '  ✅ キーは有効。検証済みドメインは未登録（contact の送信元 connectivebyte.com を Resend → Domains で検証するとメールが送れる）',
      );
    } else if (res.status === 401) {
      console.log('  ❌ キーが拒否されました（HTTP 401）。Resend → API Keys で再作成してください。');
      process.exitCode = 1;
    } else {
      console.log(`  ⚠️ 検証できません（HTTP ${res.status}）。後で再試行してください。`);
    }
  } catch (err) {
    console.log(`  ⚠️ ネットワークエラーで検証できません: ${err.message}`);
  }
}
