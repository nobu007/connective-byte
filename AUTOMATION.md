# 自動化・運用の入口

この文書は発火・駆動・停止・連携を扱う。[長期計画](ORDER.md)の到達目標と、実際の登録・受入・公開状態を区別する。

## Driver（発火方式）

リポ内で確認できる経路は開発CLIとGitHub Actionsのイベント駆動CI。本ホストのTAS台帳には同名登録を確認できなかった。自律開発を接続する場合は既存制御平面の登録・段階ゲートを使う。

## Schedule（駆動間隔）

[CI](.github/workflows/ci.yml)はpush/PR、[security](.github/workflows/security.yml)はpush/PRと週次。正確なcronはworkflowを正本とする。教材更新・会員運営の周期とは別。

本ホストcrontabにはfleet運用の定常駆動がある (x-discover 収集09:17/投稿21:07 — 収集は生成物の版管理の自動再生成 `regen_stale` を含む・2026-09-15〜)。発火定義の正本はbusiness_notes `横断/2026-08-30-x-discover-operations.md`、生成物台帳はconnectivebyte-web `ARTIFACTS.md` (repo root — scripts/木の外に置き文書変更で版を変えない)。

## Entrypoint（実行コマンド）

`npm run dev`で開発、`npm run lint`・`npm run type-check`・`npm test`・`npm run build`で変更に応じて検証する。`npm run deploy:cf`と`npm run deploy:api`は公開操作。`grant-purchase`やDB初期化も読み取り確認として実行しない。コマンドの定義は[package.json](package.json)。

## Stall Policy（停止時の扱い）

依頼・PRがない待機は正常。失敗は対象のfrontend/backend/認証/決済/権利の境界で絞り、受入条件を持つ一件を修復する。課金・会員権利の実測不足を文章やmock合格で補完しない。

## Coordination（エコシステム連携）

本リポが学習体験と会員・購入・提供の接点を持つ。意味の定義はFramework、制作はStudio、配信はDistribution、共通の顧客文脈はPersonaの各正本に従う。各接続では商品版と受入結果を固定する。

## Kill Switch（緊急停止）

ローカルdevは起動セッションを終了。CIは対象Actions runをcancelする。自律driverを導入した場合はそのrepo単位のpauseを用い、アプリ停止や会員権利削除を開発停止の代用にしない。

## Status（現在の稼働状態）

CLI・CI・公開用scriptの存在を確認。実配備・決済・権利付与・復旧の現行成功はこの文書変更では検証していない。公開範囲は[AGENTS.md](AGENTS.md)の無料/有料契約を維持する。

## Notes（特記）

公開には対象版の技術検証に加え、既存のコンテンツ公開条件とブラウザ確認を満たす。worktree lifecycleとcleanupは共有harnessへ委譲する。

_最終更新: 2026-09-15 ／ driver・workflow・委譲先変更時は本ファイルと入口の参照を更新すること。_
