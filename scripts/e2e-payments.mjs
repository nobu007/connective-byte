#!/usr/bin/env node
/**
 * payments E2E — Stripe 受講登録のゲーティング・status・署名拒否を通し検証
 * 使い方: npm run e2e:payments [-- <apiBaseUrl>]
 *
 * 検証内容:
 *   公開 read のキャッシュ方針（curriculum=public / session=private） →
 *   register（learner） → 匿名 status 401 / status purchased:false →
 *   webhook 署名なし 400（Stripe 署名の本体保護・本番 whsec は wrangler 専用） →
 *   SQL で content_administrator へ昇格し有料週（week>=2）の公開モジュール/セッションを作成 →
 *   未購入: 有料 slug 403 PAYMENT_001・PUT progress 403 →
 *   SQL で grant（purchases + users.purchased_at）: status true・有料 slug 200・progress 200 →
 *   SQL で revoke（refund 相当）: status false・403 に戻る →
 *   モジュール削除・テストユーザーを SQL で完全削除（purchases も CASCADE）
 *
 * 注意: DATABASE_URL が必要（role 昇格・grant/revoke・クリーンアップに使用）。
 * Webhook の付与経路そのものはローカル（apps/backend 単体テスト + stripe listen）で検証済み。
 * 本番 e2e は「SQL で grant したのと同じ状態」を作って API の挙動を確認する。
 */

import { neon } from '@neondatabase/serverless';

const base = (
  process.argv[2] ||
  process.env.E2E_PAYMENTS_URL ||
  'https://api.connectivebyte.com'
).replace(/\/+$/, '');

const results = [];
const record = (name, ok, detail) => results.push({ name, ok, detail });

function assert(name, cond, detail = '') {
  record(name, Boolean(cond), cond ? '' : detail);
  return Boolean(cond);
}

async function call(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (body || ['POST', 'PUT', 'PATCH'].includes(method)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      break;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  if (!res) throw lastError;

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { res, json };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      '❌ DATABASE_URL が設定されていません（role 昇格・grant/revoke・クリーンアップに必要）'
    );
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-payments-${runId}@resend.dev`;
  const password = 'E2ePayments2026x';
  const paidSlug = `e2e-paid-${runId}`;
  const moduleSlug = `e2e-mod-${runId}`;
  const checkoutSessionId = `cs_e2e_${runId}`;
  console.log(`payments E2E: ${base}\nテストユーザー: ${email}\n`);

  // どの経路で抜けても（アサート失敗の早期 return・例外）本番DBに
  // 検証用の行を残さない。API 削除は本体内、SQL は finally で最終防波堤。
  let registered = false;
  try {
    await runScenario();
  } finally {
    try {
      await sql.query('DELETE FROM curriculum_modules WHERE slug = $1', [moduleSlug]);
      if (registered) {
        await sql.query('DELETE FROM users WHERE email = $1', [email]);
      }
      console.log('\n🧹 クリーンアップ完了（モジュール・ユーザー削除）');
    } catch (err) {
      console.error(`⚠️ クリーンアップ失敗（手動削除が必要）: ${err.message}`);
      console.error(`   module: ${moduleSlug} / user: ${email}`);
    }
  }

  report();

  async function runScenario() {
    // --- 1. 公開 read とキャッシュ方針 ---

    const cur = await call('/api/learning/curriculum');
    if (!assert('GET /curriculum（匿名）→ 200', cur.res.status === 200, `HTTP ${cur.res.status}`))
      return;
    assert(
      'curriculum は public キャッシュ（全員同一）',
      (cur.res.headers.get('cache-control') || '').includes('public'),
      cur.res.headers.get('cache-control') ?? 'none'
    );
    const phases = cur.json?.data?.phases ?? [];
    const week1 = phases.flatMap((p) => p.modules).find((m) => m.slug === 'week-01');
    const phase1 = phases.find((p) => p.number === 1);
    assert('week-01 が公開ツリーに存在', Boolean(week1));

    const pub = await call(
      `/api/learning/sessions/${week1.sessions?.[0]?.slug ?? 'week-01-day-01'}`
    );
    assert('GET 無料セッション（匿名）→ 200', pub.res.status === 200, `HTTP ${pub.res.status}`);
    assert(
      'セッション本文は private キャッシュ（Authorization で変化）',
      (pub.res.headers.get('cache-control') || '').includes('private'),
      pub.res.headers.get('cache-control') ?? 'none'
    );

    // --- 2. ユーザー登録と status ---

    const reg = await call('/api/auth/register', {
      method: 'POST',
      body: { email, password, fullName: 'Payments E2E' },
    });
    if (
      !assert(
        'register → 201',
        reg.res.status === 201,
        `HTTP ${reg.res.status} ${JSON.stringify(reg.json)}`
      )
    )
      return;
    registered = true;
    let token = reg.json?.data?.accessToken;

    const anonStatus = await call('/api/payments/status');
    assert(
      'GET /payments/status（匿名）→ 401',
      anonStatus.res.status === 401,
      `HTTP ${anonStatus.res.status}`
    );

    const status0 = await call('/api/payments/status', { token });
    assert(
      'GET /payments/status（未購入）→ 200',
      status0.res.status === 200,
      `HTTP ${status0.res.status}`
    );
    assert(
      'purchased: false',
      status0.json?.data?.purchased === false,
      JSON.stringify(status0.json?.data)
    );

    // --- 3. webhook は署名なしを拒否 ---

    const unsigned = await call('/api/payments/webhook', {
      method: 'POST',
      body: { type: 'checkout.session.completed', data: { object: {} } },
    });
    assert(
      'POST /payments/webhook（署名なし）→ 400',
      unsigned.res.status === 400,
      `HTTP ${unsigned.res.status} ${JSON.stringify(unsigned.json)}`
    );

    // --- 4. 有料週（week>=2）の公開モジュール/セッションを作成（管理者昇格） ---

    await sql.query(
      `UPDATE users SET role = 'content_administrator', updated_at = now() WHERE email = $1`,
      [email]
    );
    const relogin = await call('/api/auth/login', { method: 'POST', body: { email, password } });
    if (
      !assert(
        '昇格後に再 login → 200',
        relogin.res.status === 200,
        `HTTP ${relogin.res.status} ${JSON.stringify(relogin.json)}`
      )
    )
      return;
    token = relogin.json?.data?.accessToken;

    const newModule = await call('/api/learning/admin/modules', {
      method: 'POST',
      token,
      body: {
        phaseId: phase1.id,
        slug: moduleSlug,
        title: 'E2E検証（支払い）',
        description: '削除される',
        weekNumber: 2,
        isPublished: true,
      },
    });
    if (
      !assert(
        '管理 module（week 2・公開）作成 → 201',
        newModule.res.status === 201,
        `HTTP ${newModule.res.status} ${JSON.stringify(newModule.json)}`
      )
    )
      return;
    const newModuleId = newModule.json?.data?.module?.id;

    const newSession = await call('/api/learning/admin/sessions', {
      method: 'POST',
      token,
      body: {
        moduleId: newModuleId,
        slug: paidSlug,
        title: 'E2E検証セッション（有料）',
        description: '削除される',
        content: '# 有料本文（e2e）',
        durationMinutes: 5,
        objectives: ['検証'],
        isPublished: true,
      },
    });
    assert(
      '管理 session（公開）作成 → 201',
      newSession.res.status === 201,
      `HTTP ${newSession.res.status} ${JSON.stringify(newSession.json)}`
    );
    const newSessionId = newSession.json?.data?.session?.id;

    // --- 5. 未購入: ゲーティング ---

    const lockedAnon = await call(`/api/learning/sessions/${paidSlug}`);
    assert(
      '有料 slug（匿名）→ 403 PAYMENT_001',
      lockedAnon.res.status === 403 && lockedAnon.json?.error?.code === 'PAYMENT_001',
      `HTTP ${lockedAnon.res.status} ${JSON.stringify(lockedAnon.json)}`
    );

    const lockedAuth = await call(`/api/learning/sessions/${paidSlug}`, { token });
    assert(
      '有料 slug（未購入 learner）→ 403 PAYMENT_001',
      lockedAuth.res.status === 403 && lockedAuth.json?.error?.code === 'PAYMENT_001',
      `HTTP ${lockedAuth.res.status} ${JSON.stringify(lockedAuth.json)}`
    );

    const progressDenied = await call(`/api/learning/progress/sessions/${newSessionId}`, {
      method: 'PUT',
      token,
      body: { status: 'completed' },
    });
    assert(
      'PUT progress（未購入）→ 403 PAYMENT_001',
      progressDenied.res.status === 403 && progressDenied.json?.error?.code === 'PAYMENT_001',
      `HTTP ${progressDenied.res.status} ${JSON.stringify(progressDenied.json)}`
    );

    // --- 6. SQL grant（webhook 付与と同じ状態） ---

    await sql.query(
      `INSERT INTO purchases (id, user_id, status, stripe_checkout_session_id, stripe_payment_intent_id, amount_total, currency)
     VALUES ($1, (SELECT id FROM users WHERE email = $2), 'active', $3, $4, 29800, 'jpy')
     ON CONFLICT (stripe_checkout_session_id) DO UPDATE SET status = 'active', revoked_at = NULL, updated_at = now()`,
      [crypto.randomUUID(), email, checkoutSessionId, `pi_e2e_${runId}`]
    );
    await sql.query(`UPDATE users SET purchased_at = now(), updated_at = now() WHERE email = $1`, [
      email,
    ]);

    const status1 = await call('/api/payments/status', { token });
    assert(
      'grant 後 status → 200・purchased: true',
      status1.json?.data?.purchased === true,
      JSON.stringify(status1.json?.data)
    );
    assert(
      '購入額が 29800 円',
      status1.json?.data?.purchase?.amountTotal === 29800,
      JSON.stringify(status1.json?.data?.purchase)
    );

    const unlocked = await call(`/api/learning/sessions/${paidSlug}`, { token });
    assert(
      'grant 後 有料 slug → 200',
      unlocked.res.status === 200,
      `HTTP ${unlocked.res.status} ${JSON.stringify(unlocked.json)}`
    );
    assert(
      '有料本文が閲覧できる',
      (unlocked.json?.data?.session?.content ?? '').includes('有料本文')
    );

    const progressOk = await call(`/api/learning/progress/sessions/${newSessionId}`, {
      method: 'PUT',
      token,
      body: { status: 'completed' },
    });
    assert(
      'grant 後 PUT progress → 200',
      progressOk.res.status === 200,
      `HTTP ${progressOk.res.status} ${JSON.stringify(progressOk.json)}`
    );

    // --- 7. SQL revoke（charge.refunded と同じ状態） ---

    await sql.query(
      `UPDATE purchases SET status = 'refunded', revoked_at = now(), updated_at = now() WHERE stripe_checkout_session_id = $1`,
      [checkoutSessionId]
    );
    await sql.query(`UPDATE users SET purchased_at = NULL, updated_at = now() WHERE email = $1`, [
      email,
    ]);

    const status2 = await call('/api/payments/status', { token });
    assert(
      'revoke 後 status → purchased: false',
      status2.json?.data?.purchased === false,
      JSON.stringify(status2.json?.data)
    );

    const relocked = await call(`/api/learning/sessions/${paidSlug}`, { token });
    assert(
      'revoke 後 有料 slug → 403 に戻る',
      relocked.res.status === 403 && relocked.json?.error?.code === 'PAYMENT_001',
      `HTTP ${relocked.res.status}`
    );

    // --- 8. クリーンアップ（モジュール削除 → users 削除で purchases も CASCADE） ---

    const delModule = await call(`/api/learning/admin/modules/${newModuleId}`, {
      method: 'DELETE',
      token,
    });
    assert('管理 module 削除 → 204', delModule.res.status === 204, `HTTP ${delModule.res.status}`);

    const pubDeleted = await call(`/api/learning/sessions/${paidSlug}`);
    assert('CASCADE 削除後は 404', pubDeleted.res.status === 404, `HTTP ${pubDeleted.res.status}`);

    await sql.query('DELETE FROM users WHERE email = $1', [email]);
    const [purchaseLeft] = await sql.query(
      'SELECT 1 FROM purchases WHERE stripe_checkout_session_id = $1',
      [checkoutSessionId]
    );
    assert('purchases 行が CASCADE で残っていない', !purchaseLeft);
  } // end runScenario
}

function report() {
  for (const r of results)
    console.log(`  ${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 合格`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error('❌ E2E 実行エラー:', err.message);
  process.exit(1);
});
