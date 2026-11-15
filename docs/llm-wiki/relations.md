# Repository relations

Repository: connective-byte

- 親: business_notes（jinno確定 2026-09-26）
- 根拠: 特定サービスのプロダクト実装であり汎用ツール・単なるコンテンツ配信ではない
- 出典: contracts registry `registry/organization/repositories/connective-byte.yaml` の spec.parent（contracts commit ecbc226）。2026-09-26 の一括レビュー表output/repo-parent-review-2026-09-26.md（ローカル output ディレクトリ）を jinno が現状案で承認。

## tas_autopilot

- Status: confirmed
- Relationship: operator/operated — tas_autopilot が本リポへ作業を dispatch・着地させ、post_dispatch が着地後の PR 履歴を検査し、cp-daemon の loop-md reconcile が本リポの LOOP.md を生成・更新する（write → git add → git commit → push は best-effort）。ホスト上の全自動化は gh CLI のアクティブアカウント nobu007（user ID 8529529）の GraphQL quota（5000pt/h）を fleet 全体で共有する。
- Responsibility: dispatch・post_dispatch・inbox 起票・loop-md ライフサイクル（生成・spec marker 更新）は tas_autopilot が所有する。本リポは自リポの commit policy（husky commitlint）と歴史を所有する。本リポの workflow は GitHub API を消費しないため、GraphQL quota 枯渇に起因する inbox 起票の修復責任は tas_autopilot 側にある。
- Canonical sources: tas_autopilot:tas_autopilot/control_plane/post_dispatch.py、tas_autopilot:tas_autopilot/control_plane/loop_md.py、connective-byte:.github/workflows/ci.yml、connective-byte:.github/workflows/security.yml、connective-byte:commitlint.config.js、connective-byte:.husky/commit-msg
- Change rule: post_dispatch の PR 検査・quota 取扱い、loop_md.py のコミットメッセージ書式・spec version、または本リポの commitlint rules / workflow が変わったら本項を再検証する。commitlint rules を変えたら loop-md 自動メッセージの検証を見直す。本リポの workflow が GitHub API を使い始めたら関係を見直す。
- Evidence: tas_autopilot:tas_autopilot/control_plane/post_dispatch.py sha256:b8c70152a58538b76cbd2da823402fb8c039f76c99a78dfe7a0821a1bf1d98d8
- Evidence: tas_autopilot:tas_autopilot/control_plane/loop_md.py sha256:d447b0fdc84aad4f96e3179ae0820b2f13a996b4fe3ac2a2cddcc30d71224aea
- Evidence: connective-byte:.github/workflows/ci.yml sha256:f5ee5137057f02778643f3417f9f249b31d083fff881a8e5e178a6cd95a5ceea
- Evidence: connective-byte:.github/workflows/security.yml sha256:05d76be15811b61287b17a9258daaf4eaefa4e8a34e2f674c6243814537d7c88
- Evidence: connective-byte:commitlint.config.js sha256:f25edf4841d9699a31b4d7e9c1b7aa7cf7830b820fb4f8e23f75a0ab0e8bb6d9
- Observation: gh_terminal_pr_at_head() は gh pr list（GraphQL 消費）が非ゼロ終了すると quota 枯渇を含め一律 fail-closed で kind=auto_merge_blocked「post_dispatch: cannot inspect PR history for <branch>」を起票する（post_dispatch.py:398-432、2026-10-02 確認）。
- Observation: 本リポの workflow 2本は GitHub API を呼ばない（gh api/graphql/GITHUB_TOKEN の grep 0件、2026-10-02）。2026-10-02 の「GraphQL: API rate limit already exceeded for user ID 8529529」による auto_merge_blocked 起票は本リポのコード起因ではなく制御plane 側の quota 飽和が原因。孤立ブランチ tas/auto/dde3d87fb201・tas/auto/840bf582241b は tree が main（54b5ae9c）と完全一致の冗物で PR 無し。
- Observation: 2026-10-08 21:56 の reconcile は commit-msg hook（subject-case always フォーク）に "docs: add LOOP.md — …" を拒否され、stage 済み LOOP.md が dirty 残置 → post_dispatch push_failed「A LOOP.md」+ caretaker pull_deferred を慢性化。journal は created=1 errors=0（失敗が成功集計される）。subject-case を config-conventional 既定へ復元して解消（本PRの d22168b）。
- Observation: 2026-10-25 の merge 解消時に tas_autopilot 側 Evidence 2件（post_dispatch.py・loop_md.py）のハッシュをローカル checkout から再計算して更新（旧記録 25c83b34…・0af39fbb… は陳腐化）。quota 修復・loop_md エラー表面化の各 follow-up の完了判断は未検証のまま残す。
- Follow-up: [ ] tas_autopilot で quota 前提の post_dispatch 修復（2026-10-02 調査の処方: gh api rate_limit の REST 事前チェック・GraphQL→REST /pulls?head= フォールバック・rate limit を fail-closed 起票せず defer）が着地したら本項を更新する（完了条件: tas_autopilot main への該当修正着地を確認）
- Follow-up: [ ] tas_autopilot の孤儿ブランチ adopt/retire 手順で tas/auto/dde3d87fb201・tas/auto/840bf582241b が整理されたら本項を更新する（完了条件: 共有チェックアウトの branch 一覧から該当ブランチ消滅を確認）
- Follow-up: [ ] tas_autopilot — loop_md._write_and_commit は git commit 失敗時も status "created" を返し reconcile_fleet が reason を廃棄するため、commit 失敗が journal に記録されず dirty 残置が自己修復しない。完了条件: reconcile summary が commit 失敗を errors として表面化し（かつ status を committed と区別し）、リトライまたは通知が走ること。もう一つの上流欠陥: 生成メッセージの主題が大文字ファイル名（LOOP.md）を含み、subject-case を strict に運用するリポで恒常的に拒否される
