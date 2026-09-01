# content-curriculum — カリキュラム原稿（Markdown）

12週カリキュラムの本文原稿を置く場所。`npm run import:curriculum` で
Neon Postgres へ取込み、`/learning/` から配信する。

## 構成

```
content-curriculum/
├── README.md          ← この仕様書
└── week-01/           ← モジュール単位のディレクトリ（slug = ディレクトリ名）
    ├── _module.md     ← モジュール定義（frontmatter 必須）
    ├── day-01.md      ← セッション本文（slug = ファイル名から .md を除いたもの）
    └── day-02.md
```

## `_module.md`（モジュール定義）

frontmatter のみ使用（body は読まない）:

```yaml
---
title: 接続思考の基礎
description: 最初の1週間で全体像を掴む
weekNumber: 1 # 1-52。Phase（W1-3/4-8/9-12）の自動振り分けに使う
---
```

## `day-*.md`（セッション本文）

frontmatter + Markdown 本文:

````yaml
---
title: 接続とは何か
description: 3種の接続パターンを理解する
durationMinutes: 45
objectives: # 任意・最大20件
  - 接続の3分類を説明できる
  - 自分の仕事の接続点を3つ挙げられる
---
# 接続とは何か

本文（Markdown・GFM対応）。コードサンプルもそのまま書ける
（sanitizeInput の対象外のため `onChange=` 等も壊れない）。

```js
const connect = (a, b) => ({ ...a, ...b });
````

````

## 取込み

```bash
# 確認だけ（DB に書き込まない）
npm run import:curriculum -- --dry-run

# 取込み（既存データの is_published / order_index は保持。新規は非公開で作成）
npm run import:curriculum

# 取込みして公開（新規モジュール・セッションを is_published=true で作成）
npm run import:curriculum -- --publish
````

- **冪等**: 何度実行しても同一結果。既存slugは title/description/本文等を
  上書き更新するが `is_published` と `order_index` は変更しない
- モジュールの並び順 = ディレクトリ名順、セッションの並び順 = ファイル名順
- `day-*.md` 以外のファイル（`_module.md`・README 以外の dotファイル等）は無視

## 公開前チェック（デザイン自己レビュー・必須）

「書けている」だけではリリースしない。**本番ブラウザで全体を確認してから公開**する:

1. `npm run import:curriculum` で取込み
2. 本番 `/learning/?module=<slug>&session=<slug>` をブラウザで開き、**最初から最後まで通読**:
   - [ ] コードブロック: 1行が長すぎて読みにくくないか（折返し・横スクロール）
   - [ ] 見出し・箇条書き・表・強調の階層が意図どおり描画されているか
   - [ ] 前/次セッションへのナビが正しいか
   - [ ] モバイル幅（≈375px）でも崩れていないか
3. 問題があれば原稿修正 → 再取込み → 再確認（2に戻る）
4. すべて通ったら公開（新規は `--publish`、既存の切替は管理画面で is_published）

**執筆ルール（2026-09-01の教訓）**: `const f = (d) => d.map(...).reduce(...)` のような
長い1行コードはデスクトップでも読みにくい。**コードサンプルは80桁目安で改行**して書く。
原稿の時点で整形しておく（表示側のCSSに頼らない）。
