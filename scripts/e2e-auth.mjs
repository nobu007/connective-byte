#!/usr/bin/env node
/**
 * auth API E2E — デプロイ後の認証フロー全体を1ユーザーで通し検証
 * 使い方: npm run e2e:auth [-- <apiBaseUrl>]
 *   例: npm run e2e:auth -- http://localhost:3001
 *
 * 検証内容:
 *   register → me → login（2セッション） → sessions 一覧 → 個別失効 →
 *   change-password（他セッション失効・現セッション維持） →
 *   refresh ローテーション（旧 Cookie 401 = 再利用検知で全失効） →
 *   再ログイン → delete-account → cancel → logout
 *
 * 注意: 実APIにテストユーザーを1件作成する（verification メールが1通飛ぶ）。
 * アカウントは残るが非活動。匿名化させたい場合は最後の cancel を外して
 * 30日の猶予で自動削除に任せること。
 */

const base = (process.argv[2] || process.env.E2E_AUTH_URL || 'https://api.connectivebyte.com').replace(/\/+$/, '');

const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail });

function assert(name, cond, detail = '') {
  record(name, Boolean(cond), cond ? '' : detail);
  return Boolean(cond);
}

/** set-cookie から指定 Cookie の最終値を抽出 */
function pickCookie(res, name) {
  // getSetCookie() は Node 19.7+。無い場合は連結ヘッダを分割してフォールバック
  const raw =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : (res.headers.get('set-cookie') || '').split(/,(?=[^;]+?=)/);
  for (const c of raw) {
    const m = c.match(new RegExp(`^${name}=([^;]*)`));
    if (m) return m[1];
  }
  return null;
}

async function call(path, { method = 'GET', token, cookie, body } = {}) {
  const headers = {};
  // ボディ無し POST も JSON Content-Type 必須のミドルウェア対策
  if (body || ['POST', 'PUT', 'PATCH'].includes(method)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { res, json };
}

async function main() {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // resend.dev は Resend のテスト用受信ドメイン（本物の宛先に飛ばない）
  const email = `e2e-auth-${runId}@resend.dev`;
  const password = 'E2eStart2026x';
  const newPassword = 'E2eRotate2026z';
  console.log(`auth E2E: ${base}\nテストユーザー: ${email}\n`);

  // 1. register（自動ログイン）
  const reg = await call('/api/auth/register', {
    method: 'POST',
    body: { email, password, fullName: 'E2E Tester' },
  });
  if (!assert('register → 201', reg.res.status === 201, `HTTP ${reg.res.status} ${JSON.stringify(reg.json)}`)) return report();
  const token1 = reg.json?.data?.accessToken;
  const regCookie = pickCookie(reg.res, 'cb_rt');
  assert('register が cb_rt Cookie を設定', Boolean(regCookie));
  assert('register が accessToken を返す', Boolean(token1));

  // 2. me
  const me1 = await call('/api/auth/me', { token: token1 });
  assert('GET /me（Bearer）→ 200', me1.res.status === 200, `HTTP ${me1.res.status}`);
  assert('me が user を返す', me1.json?.data?.user?.email === email);

  // 3. login（2セッション目）
  const login1 = await call('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!assert('login → 200', login1.res.status === 200, `HTTP ${login1.res.status}`)) return report();
  const token2 = login1.json?.data?.accessToken;
  const loginCookie = pickCookie(login1.res, 'cb_rt');
  assert('login が cb_rt Cookie を設定', Boolean(loginCookie));

  // 4. sessions 一覧（login セッションを current として）
  const sessions1 = await call('/api/auth/sessions', { token: token2, cookie: `cb_rt=${loginCookie}` });
  if (!assert('GET /sessions → 200', sessions1.res.status === 200, `HTTP ${sessions1.res.status}`)) return report();
  const sessions = sessions1.json?.data?.sessions ?? [];
  assert('セッションが2件', sessions.length === 2, `${sessions.length}件`);
  const other = sessions.find((s) => !s.isCurrent);
  assert('現在セッションに isCurrent=true', sessions.some((s) => s.isCurrent));

  // 5. 他セッションを個別失効
  if (other) {
    const del = await call(`/api/auth/sessions/${other.id}`, {
      method: 'DELETE',
      token: token2,
      cookie: `cb_rt=${loginCookie}`,
    });
    assert('DELETE /sessions/:id → 200', del.res.status === 200, `HTTP ${del.res.status}`);
    const sessions1b = await call('/api/auth/sessions', { token: token2, cookie: `cb_rt=${loginCookie}` });
    assert('失効後のセッションは1件', (sessions1b.json?.data?.sessions ?? []).length === 1);
  }

  // 6. change-password（register セッションは失効済み、現セッション維持）
  const cp = await call('/api/auth/change-password', {
    method: 'POST',
    token: token2,
    cookie: `cb_rt=${loginCookie}`,
    body: { currentPassword: password, newPassword },
  });
  assert('change-password → 200', cp.res.status === 200, `HTTP ${cp.res.status} ${JSON.stringify(cp.json)}`);

  // 7. refresh ローテーション: login Cookie → 新 Cookie
  const refresh1 = await call('/api/auth/refresh', { method: 'POST', cookie: `cb_rt=${loginCookie}` });
  if (!assert('refresh → 200', refresh1.res.status === 200, `HTTP ${refresh1.res.status}`)) return report();
  const rotatedCookie = pickCookie(refresh1.res, 'cb_rt');
  const token3 = refresh1.json?.data?.accessToken;
  assert('refresh が新しい accessToken を返す', Boolean(token3) && token3 !== token2);

  // 8. 旧 Cookie の再利用 → 401（再利用検知 = 全セッション失効）
  const reuse = await call('/api/auth/refresh', { method: 'POST', cookie: `cb_rt=${loginCookie}` });
  assert('旧 Cookie 再利用 → 401', reuse.res.status === 401, `HTTP ${reuse.res.status}`);

  // 9. 再利用検知後は新 Cookie も失効
  const refresh2 = await call('/api/auth/refresh', { method: 'POST', cookie: `cb_rt=${rotatedCookie}` });
  assert('失効後の新 Cookie → 401', refresh2.res.status === 401, `HTTP ${refresh2.res.status}`);

  // 10. 新パスワードで再ログイン（全失効後の復帰）
  const login2 = await call('/api/auth/login', { method: 'POST', body: { email, password: newPassword } });
  if (!assert('新パスワードで再login → 200', login2.res.status === 200, `HTTP ${login2.res.status} ${JSON.stringify(login2.json)}`)) return report();
  const token4 = login2.json?.data?.accessToken;
  const finalCookie = pickCookie(login2.res, 'cb_rt');
  // 旧パスワードは拒否される
  const loginOld = await call('/api/auth/login', { method: 'POST', body: { email, password } });
  assert('旧パスワード → 401', loginOld.res.status === 401, `HTTP ${loginOld.res.status}`);

  // 11. delete-account → 30日後の予約
  const del = await call('/api/auth/delete-account', { method: 'POST', token: token4 });
  if (!assert('delete-account → 200', del.res.status === 200, `HTTP ${del.res.status} ${JSON.stringify(del.json)}`)) return report();
  assert('削除予定日を返す', Boolean(del.json?.data?.deletionScheduledFor));
  const dup = await call('/api/auth/delete-account', { method: 'POST', token: token4 });
  assert('二重予約 → 409', dup.res.status === 409, `HTTP ${dup.res.status}`);

  // 12. cancel
  const cancel = await call('/api/auth/delete-account/cancel', { method: 'POST', token: token4 });
  assert('cancel → 200', cancel.res.status === 200, `HTTP ${cancel.res.status} ${JSON.stringify(cancel.json)}`);

  // 13. logout（冪等）
  const logout = await call('/api/auth/logout', { method: 'POST', cookie: `cb_rt=${finalCookie}` });
  assert('logout → 200', logout.res.status === 200, `HTTP ${logout.res.status}`);
  const logout2 = await call('/api/auth/logout', { method: 'POST', cookie: `cb_rt=${finalCookie}` });
  assert('logout は冪等（2回目も200）', logout2.res.status === 200, `HTTP ${logout2.res.status}`);

  report();
}

function report() {
  for (const r of results) console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 合格`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error('❌ E2E 実行エラー:', err.message);
  process.exit(1);
});
