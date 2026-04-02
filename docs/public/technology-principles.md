# ConnectiveByte 公開技術原則

このドキュメントは、ConnectiveByteがpublic repositoryで共有する技術原則をまとめたものです。ここでは実装可能で再利用しやすい原則だけを公開し、内部の生成ロジックは含めません。

## 1. Static-first publication

公開コンテンツは、できる限り静的ファイルとして配布します。閲覧者に不要な複雑性を持ち込まず、変更差分も追跡しやすくなります。

## 2. Manifest-driven publishing

private側からpublic側へ反映する際は、allowlist形式のmanifestで対象を限定します。これにより、誤って機密ファイルを公開する事故を防ぎます。

## 3. Schema to product

思想や説明文も、なるべく構造化データで保持します。今回のAboutページはYAMLをJSONへ変換しており、公開面ではNext.jsの型付きコンテンツとして利用できます。

## 4. Public and private by design

public repoには公開可能な思想、技術原則、静的コンテンツだけを置きます。private repoには、プロンプト、生成器、非公開設計、検証ロジックを保持します。

## 5. Verification before sync

公開処理では、書き込み先が対象repo配下に収まっているか、期待するpackage名に一致するかを検証します。便利さより、誤公開の防止を優先します。

## 公開スタック

- Next.js / React / TypeScript による表示層
- YAMLからJSONへの変換によるコンテンツ管理
- Markdownによる公開ドキュメント配布
- Python CLIによる同期と検証

この範囲を超える内部最適化や機密運用は、public側には出しません。
