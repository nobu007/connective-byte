# Repository relations

Repository: connective-byte

- 親: business_notes（jinno確定 2026-09-26）
- 根拠: 特定サービスのプロダクト実装であり汎用ツール・単なるコンテンツ配信ではない
- 出典: contracts registry `registry/organization/repositories/connective-byte.yaml` の spec.parent（contracts commit ecbc226）。2026-09-26 の一括レビュー表output/repo-parent-review-2026-09-26.md（ローカル output ディレクトリ）を jinno が現状案で承認。

## tas_autopilot

- Status: confirmed
- Relationship: operator/operated — cp-daemon の loop-md reconcile が本リポの LOOP.md を生成・更新し（write → git add → git commit → push は best-effort）、connective-byte 側は husky commitlint によるコミットポリシーと着地規律を保持する
- Responsibility: tas_autopilot は loop-md ライフサイクル（生成・spec marker 更新）を所有、connective-byte は自リポの commit policy と歴史を所有する
- Canonical sources: tas_autopilot:tas_autopilot/control_plane/loop_md.py, connective-byte:commitlint.config.js, connective-byte:.husky/commit-msg
- Change rule: tas_autopilot の loop_md.py のコミットメッセージ書式または spec version が変わったら、本リポの commitlint でそのメッセージを検証する。commitlint rules を変えたら loop-md 自動メッセージを再検証する
- Evidence: tas_autopilot:tas_autopilot/control_plane/loop_md.py sha256:0af39fbbf7af4729ddf32918b41836a8414d2891a082b42657b0bc2dea55d5eb
- Evidence: connective-byte:commitlint.config.js sha256:f25edf4841d9699a31b4d7e9c1b7aa7cf7830b820fb4f8e23f75a0ab0e8bb6d9
- Observation: 2026-10-08 21:56 の reconcile は commit-msg hook（subject-case always フォーク）に "docs: add LOOP.md — …" を拒否され、stage 済み LOOP.md が dirty 残置 → post_dispatch push_failed「A LOOP.md」+ caretaker pull_deferred を慢性化。journal は created=1 errors=0（失敗が成功集計される）。subject-case を config-conventional 既定へ復元して解消（本コミット）
- Follow-up: [ ] tas_autopilot — loop_md._write_and_commit は git commit 失敗時も status "created" を返し reconcile_fleet が reason を廃棄するため、commit 失敗が journal に記録されず dirty 残置が自己修復しない。完了条件: reconcile summary が commit 失敗を errors として表面化し（かつ status を committed と区別し）、リトライまたは通知が走ること。もう一つの上流欠陥: 生成メッセージの主題が大文字ファイル名（LOOP.md）を含み、subject-case を strict に運用するリポで恒常的に拒否される
