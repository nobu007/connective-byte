# コーディング規約

このドキュメントは、ConnectiveByteプロジェクトにおけるコーディングの規約を定めます。

## 全般

- **言語**: 主要な言語はTypeScriptです。
- **フォーマット**: コードのフォーマットは[Prettier](https://prettier.io/)に準拠します。コミット前に自動でフォーマットが適用される設定を推奨します。
- **静的解析**: [ESLint](https://eslint.org/)を使用し、潜在的なバグやコードスタイルの一貫性を保ちます。

## 命名規則

- **ファイル名**:
  - Reactコンポーネント: `PascalCase.tsx` (例: `MyComponent.tsx`)
  - それ以外のファイル: `kebab-case.ts` (例: `api-client.ts`)
- **変数・関数**: `camelCase` (例: `const userData`, `function getUser() { ... }`)
- **型・インターフェース**: `PascalCase` (例: `interface UserProfile`, `type ApiResponse = { ... }`)
- **定数**: `UPPER_SNAKE_CASE` (例: `const API_ENDPOINT = '...'`)

## Reactコンポーネント

- **関数コンポーネント**: クラスコンポーネントではなく、常に関数コンポーネントとHooksを使用します。
- **Props**: PropsはTypeScriptの`interface`または`type`で型定義を明確にします。
  ```tsx
  interface MyComponentProps {
    title: string;
    isVisible: boolean;
  }

  const MyComponent = ({ title, isVisible }: MyComponentProps) => {
    // ...
  };
  ```
- **コンポーネントの分割**: 1つのコンポーネントが大きくなりすぎないように、関心事に基づいて適切にコンポーネントを分割します。Presentational ComponentとContainer Componentの分離を意識することが推奨されます。

## 状態管理

- **ローカルステート**: コンポーネント内でのみ使用される状態は`useState`または`useReducer`を使用します。
- **グローバルステート**: 複数のコンポーネント間で共有される状態や、アプリケーション全体で影響する状態（例: ユーザー認証情報）は、Context APIや状態管理ライブラリ（Zustand, Jotaiなど）の使用を検討します。ただし、導入は必要性が明確になってから行います。

## Git

- **ブランチ戦略**: `git-flow`や`GitHub Flow`のようなブランチ戦略に従います。
  - `main`: 本番環境のコード
  - `develop`: 開発中のコード
  - `feature/xxx`: 機能開発ブランチ
  - `fix/xxx`: バグ修正ブランチ
- **コミットメッセージ**: Conventional Commitsの規約に準拠することを推奨します。
  - `feat`: 新機能の追加
  - `fix`: バグ修正
  - `docs`: ドキュメントの変更
  - `style`: コードスタイルの変更（フォーマットなど）
  - `refactor`: リファクタリング
  - `test`: テストの追加・修正
  - `chore`: ビルドプロセスや補助ツールの変更

  例: `feat: add user login form`
