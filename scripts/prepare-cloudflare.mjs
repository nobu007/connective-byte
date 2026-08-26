/**
 * Cloudflare Pages デプロイ前処理。
 * Next静的エクスポート成果物（apps/frontend/out）をCF向けに整える:
 *
 * 1. _redirects から Netlify Functions 用の /api/* リライトを除去。
 *    Cloudflare では functions/api/*.ts が /api/* を直接配信するため不要で、
 *    かつ `200!` は CF の _redirects 構文としてパースされない。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const redirectsPath = join(process.cwd(), 'apps/frontend/out/_redirects');
const original = readFileSync(redirectsPath, 'utf8');

const cleaned = original
  .split('\n')
  .filter((line) => !/^\/api\//.test(line.trim()))
  .join('\n');

writeFileSync(redirectsPath, cleaned);
console.log('[prepare-cloudflare] _redirects から Netlify 用 /api/* リライトを除去しました');
