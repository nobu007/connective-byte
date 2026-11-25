# GoalDev Log

永続的決定と完了記録を追記する。各エントリに日付と検証を必ず付ける
（原則: contracts `llm-wiki-discipline` の log-is-append-with-correction）。

## 2026-09-26 — llm-wiki スキャフォールド

contracts の llm-wiki-discipline 原則に基づき `docs/llm-wiki/` を新設した。

- **Verification**: 原則 `registry/principles/llm-wiki-discipline.yaml`（contracts リポ commit 3ab5768）。

## 2026-09-26 — 親の確定（jinno確定）

relations.md の親草案を確定版へ訂正した（親: business_notes）。

**Verification**: contracts registry `registry/organization/repositories/connective-byte.yaml` の spec.parent と一致することを確認（contracts commit ecbc226、validate/lint 0 errors 済み）。

## 2026-11-22 — PR #25 auto_merge_blocked の根本原因（stale ブランチの conflict・superseded 内容）

inbox 起票 `auto_merge_blocked`（PR #25「checks passed but merge failed … the merge commit cannot be cleanly created」）の根本原因を特定した。CI・権限・quota 起因ではない。

- **根本原因**: PR #25 の head `tas/auto-care/20261109` @ c47752c0fd2fb3904fe428718bd6884b6716eec5 は 2026-10-08 の base 95c00db8466307754ff7f88b636faa6ea71871e5 から分岐した stale ブランチで、main b9b448b19f83de4b0ec4057b53dc57dc294d742b と同じ行（LOOP.md・apps/frontend/package.json・package-lock.json）を両者が変更したための merge conflict。GitHub の mergeable=CONFLICTING / merge_state=dirty と一致する。
- **内容は既に main に包含**: next 15.5.28→main 15.5.29、qs 6.16.1→6.17.1、ip-address 10.7.4→10.7.6、LOOP.md `loop-md:spec v3`→`v4`（main は branch 由来の doc-bloat 節も保持）。merge は main の巻き戻しは正攻で、正解は superseded としての close。修正自体は PR #15（bbc29dc）/ PR #20（249796f）で main に着地済み。
- **「checks passed」は偽前提**: head c47752c の check-runs は 0 件、statusCheckRollup も空で `gh pr checks 25` は「no checks reported」を返す。#21/#23/#25 はいずれも conflict 状態で作成されたため pull_request ワークフロー run が作られていない。
- **リポ内欠陥なし**: main b9b448b で CI（lint/type-check/backend/frontend/e2e/build）と Security Scan（runs 44887208367 / 44887208368、2026-11-21）が green、`npm audit --omit=dev --audit-level=high --package-lock-only` は exit 0（2026-11-22）。
- **境界**: merge 修復は本リポ外（tas_autopilot care lane と GitHub の PR 状態）。処置は relations.md の follow-up に記載。

**Verification**: `git merge-tree --write-tree --name-only main c47752c`（LOOP.md・apps/frontend/package.json・package-lock.json で CONFLICT (content)）、`gh api repos/nobu007/connective-byte/pulls/25`（mergeable=CONFLICTING, merge_state=dirty）、`gh api repos/nobu007/connective-byte/commits/c47752c/check-runs`（total_count=0）、`gh pr checks 25`（no checks reported）、`npm audit --omit=dev --audit-level=high --package-lock-only`（exit 0）。2026-11-22 実施。
