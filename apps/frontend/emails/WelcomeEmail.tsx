import { Body, Container, Head, Heading, Html, Link, Preview, Text, Hr } from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  name?: string;
}

export function WelcomeEmail({ name = '読者' }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>ConnectiveByteニュースレターへようこそ</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>ようこそ、{name}さん！</Heading>

          <Text style={text}>ConnectiveByteニュースレターにご登録いただき、ありがとうございます。</Text>

          <Text style={text}>
            このニュースレターでは、「理解されない孤独を吹き飛ばして、AI活用と思考連携で協創リーダーになる」ための実践的な知見をお届けします。
          </Text>

          <Heading style={h2}>お届けする内容</Heading>

          <ul style={list}>
            <li style={listItem}>AI時代の協創リーダーシップに関する最新の知見</li>
            <li style={listItem}>思考連携とチーム効率化の実践的なヒント</li>
            <li style={listItem}>APIコスト最適化と技術判断のベストプラクティス</li>
            <li style={listItem}>ConnectiveByteの新機能やイベント情報</li>
            <li style={listItem}>Version 0プログラムの参加者事例と成果</li>
          </ul>

          <Text style={text}>
            <strong>配信頻度：</strong>月1-2回程度
          </Text>

          <Hr style={hr} />

          <Text style={text}>
            ConnectiveByteは、「個を超え、知が立ち上がる場所」として、AI時代の知的共創圏を提供します。
          </Text>

          <Text style={text}>今後ともよろしくお願いいたします。</Text>

          <Text style={signature}>
            ConnectiveByte チーム
            <br />
            <Link href="https://connectivebyte.com" style={link}>
              https://connectivebyte.com
            </Link>
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            このメールの配信を停止する場合は、
            <Link href="{{unsubscribe_url}}" style={link}>
              こちら
            </Link>
            からお手続きください。
          </Text>

          <Text style={footer}>
            プライバシーポリシー：
            <Link href="https://connectivebyte.com/privacy" style={link}>
              https://connectivebyte.com/privacy
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '580px',
};

const h1 = {
  color: '#1e3a8a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
  lineHeight: '1.3',
};

const h2 = {
  color: '#111827',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '32px 0 16px',
  padding: '0 40px',
};

const text = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
};

const list = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px 0 60px',
};

const listItem = {
  marginBottom: '12px',
};

const signature = {
  color: '#4b5563',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '32px 0 16px',
  padding: '0 40px',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 0',
};

const footer = {
  color: '#9ca3af',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '8px 0',
  padding: '0 40px',
};

const link = {
  color: '#1e3a8a',
  textDecoration: 'underline',
};

export default WelcomeEmail;
