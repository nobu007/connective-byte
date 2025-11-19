# ニュースレター機能セットアップガイド

このドキュメントでは、ConnectiveByteのニュースレター機能をセットアップする手順を説明します。

## 📋 概要

ConnectiveByteのニュースレター機能は、以下の技術を使用しています：

- **Resend**: メール配信サービス
- **React Email**: メールテンプレートの作成
- **Zod**: バリデーション
- **React Hook Form**: フォーム管理

## 🚀 セットアップ手順

### 1. Resendアカウントの作成

1. [Resend](https://resend.com/)にアクセスしてアカウントを作成
2. ダッシュボードにログイン

### 2. APIキーの取得

1. Resendダッシュボードで「API Keys」セクションに移動
2. 「Create API Key」をクリック
3. 名前を入力（例: `ConnectiveByte Production`）
4. 権限を選択（`Sending access`と`Audience access`が必要）
5. APIキーをコピーして安全に保管

### 3. オーディエンスの作成

1. Resendダッシュボードで「Audiences」セクションに移動
2. 「Create Audience」をクリック
3. オーディエンス名を入力（例: `ConnectiveByte Newsletter`）
4. 作成後、オーディエンスIDをコピー（`aud_xxxxx`形式）

### 4. 送信ドメインの認証

1. Resendダッシュボードで「Domains」セクションに移動
2. 「Add Domain」をクリック
3. ドメイン名を入力（例: `connectivebyte.com`）
4. 表示されるDNSレコードをドメインのDNS設定に追加：
   - **TXT レコード**: ドメイン所有権の確認用
   - **MX レコード**: メール受信用（オプション）
   - **DKIM レコード**: メール認証用
5. DNS設定が反映されるまで待機（最大48時間、通常は数分〜数時間）
6. 「Verify Domain」をクリックして認証を確認

### 5. 環境変数の設定

#### ローカル開発環境

`apps/frontend/.env.local`に以下を追加：

```bash
# Resend API Key
RESEND_API_KEY=re_your_api_key_here

# Resend Audience ID
RESEND_AUDIENCE_ID=aud_your_audience_id_here
```

#### 本番環境（Netlify）

Netlifyダッシュボードで環境変数を設定：

1. 「Site settings」→「Environment variables」に移動
2. 以下の変数を追加：
   - `RESEND_API_KEY`: Resend APIキー
   - `RESEND_AUDIENCE_ID`: ResendオーディエンスID

## 🧪 動作確認

### ローカル環境でのテスト

1. 開発サーバーを起動：

```bash
cd apps/frontend
npm run dev
```

2. ブラウザで `http://localhost:3000` を開く
3. フッターのニュースレター登録フォームを確認
4. テストメールアドレスで登録を試行
5. Resendダッシュボードで以下を確認：
   - 「Emails」セクションでウェルカムメールの送信状況
   - 「Audiences」セクションで購読者の追加

### 本番環境でのテスト

1. デプロイ後、本番サイトにアクセス
2. ニュースレター登録フォームでテスト登録
3. 登録したメールアドレスでウェルカムメールを受信確認
4. メール内の配信停止リンクをテスト

## 📧 メールテンプレートのカスタマイズ

ウェルカムメールのテンプレートは `apps/frontend/emails/WelcomeEmail.tsx` にあります。

### テンプレートの編集

```typescript
// apps/frontend/emails/WelcomeEmail.tsx
export const WelcomeEmail = ({ name }: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      {/* ここでメールの内容をカスタマイズ */}
    </Body>
  </Html>
);
```

### プレビュー

React Emailの開発サーバーでプレビュー可能：

```bash
cd apps/frontend
npx react-email dev
```

ブラウザで `http://localhost:3000` を開くとメールテンプレートのプレビューが表示されます。

## 🔒 セキュリティ機能

### レート制限

- IPアドレスごとに1時間あたり3回まで登録可能
- 実装: `apps/frontend/lib/rate-limit.ts`

### ボット対策

- ハニーポットフィールドによるボット検出
- 実装: `apps/frontend/lib/validation/newsletter-schema.ts`

### 使い捨てメール対策

- 一般的な使い捨てメールドメインをブロック
- 実装: `apps/frontend/lib/validation/newsletter-schema.ts`

## 📊 アナリティクス

ニュースレター登録は自動的にPlausible Analyticsで追跡されます：

- **イベント名**: `Newsletter Signup Click`
- **カスタムプロパティ**: `location` (footer, inline, popup)

Plausibleダッシュボードで以下を確認できます：

- 登録数の推移
- 登録場所の分布
- コンバージョン率

## 🛠️ トラブルシューティング

### メールが送信されない

1. **APIキーの確認**
   - 正しいAPIキーが設定されているか確認
   - APIキーに必要な権限があるか確認

2. **ドメイン認証の確認**
   - Resendダッシュボードでドメインが認証済みか確認
   - DNS設定が正しいか確認

3. **エラーログの確認**
   ```bash
   # ローカル環境
   npm run dev
   # ブラウザのコンソールとターミナルのログを確認
   ```

### 購読者がオーディエンスに追加されない

1. **オーディエンスIDの確認**
   - 正しいオーディエンスIDが設定されているか確認
   - `aud_`で始まる形式か確認

2. **APIキーの権限確認**
   - `Audience access`権限があるか確認

### レート制限エラー

- 1時間待ってから再試行
- 開発環境では `apps/frontend/lib/rate-limit.ts` の制限を調整可能

### 使い捨てメールエラー

- 正規のメールアドレスを使用
- 必要に応じて `apps/frontend/lib/validation/newsletter-schema.ts` のブロックリストを調整

## 📝 メンテナンス

### 購読者の管理

Resendダッシュボードの「Audiences」セクションで以下が可能：

- 購読者リストの閲覧
- 購読者の手動追加・削除
- CSVエクスポート

### メール送信履歴

Resendダッシュボードの「Emails」セクションで以下を確認：

- 送信済みメールの一覧
- 配信ステータス（送信済み、バウンス、開封など）
- エラーログ

### 配信停止の処理

配信停止は自動的に処理されます：

1. ユーザーがメール内の配信停止リンクをクリック
2. Resendが自動的にオーディエンスから削除
3. 以降のメールは送信されない

## 🔗 関連リンク

- [Resend Documentation](https://resend.com/docs)
- [React Email Documentation](https://react.email/docs)
- [Resend Audiences Guide](https://resend.com/docs/dashboard/audiences/introduction)
- [プライバシーポリシー](/privacy)

## ✅ セットアップチェックリスト

- [ ] Resendアカウントの作成
- [ ] APIキーの取得と設定
- [ ] オーディエンスの作成
- [ ] 送信ドメインの認証
- [ ] 環境変数の設定（ローカル・本番）
- [ ] ローカル環境でのテスト
- [ ] 本番環境でのテスト
- [ ] ウェルカムメールの受信確認
- [ ] 配信停止リンクの動作確認
- [ ] アナリティクスの動作確認

## 🎉 完了

セットアップが完了したら、ニュースレター機能が正常に動作することを確認してください。

問題が発生した場合は、[お問い合わせ](mailto:info@connectivebyte.com)までご連絡ください。
