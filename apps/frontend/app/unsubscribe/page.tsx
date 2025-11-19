import { Container } from '@/components/layout/Container';
import { getWebPageSchema } from '@/lib/seo/structured-data';
import { siteConfig } from '@/content/site-config';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ニュースレター配信停止 - ConnectiveByte',
  description: 'ConnectiveByteニュースレターの配信停止について',
};

export default function UnsubscribePage() {
  const pageSchema = getWebPageSchema({
    title: 'ニュースレター配信停止 - ConnectiveByte',
    description: 'ConnectiveByteニュースレターの配信停止について',
    url: `${siteConfig.url}/unsubscribe`,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <main className="pt-24 pb-16">
        <Container maxWidth="md">
          <article className="prose prose-lg max-w-none">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">ニュースレター配信停止</h1>
              <p className="text-xl text-gray-600">Newsletter Unsubscribe</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">配信停止について</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                ConnectiveByteのニュースレター配信停止は、各メールに記載されている「配信停止」リンクから自動的に処理されます。
              </p>
              <p className="text-gray-700 leading-relaxed">
                リンクをクリックすると、Resendのシステムにより即座に配信が停止され、お客様の情報が削除されます。
              </p>
            </div>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">配信停止の方法</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">1. メール内のリンクから</h3>
                  <p className="text-gray-700">
                    各ニュースレターの最下部に記載されている「配信停止」リンクをクリックしてください。
                    自動的に配信が停止されます。
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">2. お問い合わせから</h3>
                  <p className="text-gray-700 mb-2">
                    配信停止リンクが見つからない場合や、問題が発生した場合は、以下のメールアドレスまでご連絡ください：
                  </p>
                  <p className="text-gray-700">
                    <a
                      href="mailto:info@connectivebyte.com"
                      className="text-primary-deep-blue hover:underline font-medium"
                    >
                      info@connectivebyte.com
                    </a>
                  </p>
                  <p className="text-gray-600 text-sm mt-2">
                    件名に「ニュースレター配信停止」と記載し、登録されているメールアドレスをお知らせください。
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">配信停止後について</h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>配信停止の処理は即座に完了します</li>
                <li>お客様の個人情報（メールアドレス、お名前）は速やかに削除されます</li>
                <li>配信停止後、新しいニュースレターは送信されません</li>
                <li>既に送信済みのメールは受信される可能性があります（配信システムの遅延による）</li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">再登録について</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                配信停止後、再度ニュースレターを受け取りたい場合は、ウェブサイトのフッターにある登録フォームから再登録できます。
              </p>
              <div className="text-center mt-8">
                <Link
                  href="/"
                  className="inline-block bg-primary-deep-blue text-white px-8 py-3 rounded-lg hover:bg-primary-deep-blue/90 transition-colors font-medium"
                >
                  ホームページに戻る
                </Link>
              </div>
            </section>

            <section className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">プライバシーについて</h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                お客様の個人情報の取り扱いについては、
                <Link href="/privacy" className="text-primary-deep-blue hover:underline">
                  プライバシーポリシー
                </Link>
                をご確認ください。
              </p>
              <p className="text-gray-700 leading-relaxed">
                ニュースレター配信サービスには、Resend（
                <a
                  href="https://resend.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-deep-blue hover:underline"
                >
                  プライバシーポリシー
                </a>
                ）を使用しています。
              </p>
            </section>
          </article>
        </Container>
      </main>
    </>
  );
}
