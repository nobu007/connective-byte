import { Container } from '@/components/layout/Container';
import { getWebPageSchema } from '@/lib/seo/structured-data';
import { siteConfig } from '@/content/site-config';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'プライバシーポリシー - ConnectiveByte',
  description: 'ConnectiveByteのプライバシーポリシー',
};

export default function PrivacyPage() {
  const pageSchema = getWebPageSchema({
    title: 'プライバシーポリシー - ConnectiveByte',
    description: 'ConnectiveByteのプライバシーポリシー',
    url: `${siteConfig.url}/privacy`,
  });
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <main className="pt-24 pb-16">
        <Container maxWidth="md">
          <article className="prose prose-lg max-w-none">
            <h1 className="text-4xl font-bold text-[#111827] mb-8">プライバシーポリシー</h1>

            <p className="text-[#4b5563] leading-relaxed mb-8">
              ConnectiveByte（以下「当社」）は、お客様の個人情報の保護を重要な責務と考え、
              以下のプライバシーポリシーに基づき、適切な取り扱いと保護に努めます。
            </p>

            {/* Table of Contents */}
            <nav className="bg-[#f9fafb] rounded-lg p-6 mb-12">
              <h2 className="text-xl font-bold text-[#111827] mb-4">目次</h2>
              <ol className="space-y-2 list-decimal list-inside text-[#1e3a8a]">
                <li>
                  <a href="#section-1" className="hover:underline">
                    個人情報の定義
                  </a>
                </li>
                <li>
                  <a href="#section-2" className="hover:underline">
                    個人情報の収集
                  </a>
                </li>
                <li>
                  <a href="#section-3" className="hover:underline">
                    個人情報の利用目的
                  </a>
                </li>
                <li>
                  <a href="#section-4" className="hover:underline">
                    個人情報の第三者提供
                  </a>
                </li>
                <li>
                  <a href="#section-5" className="hover:underline">
                    個人情報の管理
                  </a>
                </li>
                <li>
                  <a href="#section-6" className="hover:underline">
                    個人情報の開示・訂正・削除
                  </a>
                </li>
                <li>
                  <a href="#section-7" className="hover:underline">
                    アクセス解析ツール
                  </a>
                </li>
                <li>
                  <a href="#section-8" className="hover:underline">
                    Cookie等の使用
                  </a>
                </li>
                <li>
                  <a href="#section-9" className="hover:underline">
                    プライバシーポリシーの変更
                  </a>
                </li>
                <li>
                  <a href="#section-10" className="hover:underline">
                    お問い合わせ
                  </a>
                </li>
              </ol>
            </nav>

            {/* Section 1 */}
            <section id="section-1" className="mb-12">
              <h2 className="text-2xl font-bold text-[#111827] mb-4">1. 個人情報の定義</h2>
              <p className="text-[#4b5563] leading-relaxed">
                本プライバシーポリシーにおいて「個人情報」とは、個人情報保護法第2条第1項に定義される、
                生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日その他の記述等により
                特定の個人を識別することができるもの（他の情報と容易に照合することができ、
                それにより特定の個人を識別することができることとなるものを含む）を指します。
              </p>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="mb-12">
              <h2 className="text-2xl font-bold text-[#111827] mb-4">2. 個人情報の収集</h2>
              <p className="text-[#4b5563] leading-relaxed mb-4">
                当社は、以下の方法により個人情報を収集することがあります：
              </p>
              <ul className="list-disc list-inside space-y-2 text-[#4b5563] ml-4">
                <li>お問い合わせフォームからの送信</li>
                <li>メールでのお問い合わせ</li>
                <li>サービス利用時の登録</li>
                <li>アンケートやキャンペーンへの参加</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section id="section-3" className="mb-12">
              <h2 className="text-2xl font-bold text-[#111827] mb-4">3. 個人情報の利用目的</h2>
              <p className="text-[#4b5563] leading-relaxed mb-4">当社は、収集した個人情報を以下の目的で利用します：</p>
              <ul className="list-disc list-inside space-y-2 text-[#4b5563] ml-4">
                <li>お問い合わせへの対応</li>
                <li>サービスの提供・運営</li>
                <li>サービスに関する情報のご案内</li>
                <li>サービスの改善・新サービスの開発</li>
                <li>利用規約違反への対応</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="mb-12">
              <h2 className="text-2xl font-bold text-[#111827] mb-4">4. 個人情報の第三者提供</h2>
              <p className="text-[#4b5563] leading-relaxed">
                当社は、以下の場合を除き、お客様の同意なく個人情報を第三者に提供することはありません：
              </p>
              <ul className="list-disc list-inside space-y-2 text-[#4b5563] ml-4 mt-4">
                <li>法令に基づく場合</li>
                <li>人の生命、身体または財産の保護のために必要がある場合</li>
                <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
                <li>
                  国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合
                </li>
              </ul>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="mb-12">
              <h2 className="text-2xl font-bold text-[#111827] mb-4">5. 個人情報の管理</h2>
              <p className="text-[#4b5563] leading-relaxed">
                当社は、個人情報の正確性を保ち、これを安全に管理します。
                個人情報への不正アクセス、紛失、破壊、改ざん、漏洩などを防止するため、
                適切なセキュリティ対策を実施します。
              </p>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="mb-12">
              <h2 className="text-2xl font-bold text-[#111827] mb-4">6. 個人情報の開示・訂正・削除</h2>
              <p className="text-[#4b5563] leading-relaxed">
                お客様は、当社が保有する自己の個人情報について、開示、訂正、削除を請求することができます。
                請求される場合は、本ページ末尾の連絡先までお問い合わせください。
              </p>
            </section>

            {/* Section 7 */}
            <section id="section-7" className="mb-12">
              <h2 className="text-2xl font-bold text-[#111827] mb-4">7. アクセス解析ツール</h2>
              <p className="text-[#4b5563] leading-relaxed mb-4">
                当社のウェブサイトでは、サービスの改善とユーザー体験の向上のため、 Plausible
                Analyticsを使用してアクセス解析を行っています。
              </p>

              <h3 className="text-xl font-semibold text-[#111827] mb-3 mt-6">Plausible Analyticsについて</h3>
              <p className="text-[#4b5563] leading-relaxed mb-4">
                Plausible Analyticsは、プライバシーを重視したアクセス解析ツールです。以下の特徴があります：
              </p>
              <ul className="list-disc list-inside space-y-2 text-[#4b5563] ml-4 mb-4">
                <li>Cookieを使用しません</li>
                <li>個人を特定できる情報を収集しません</li>
                <li>ウェブサイトをまたいだトラッキングを行いません</li>
                <li>IPアドレスは保存前にハッシュ化されます</li>
                <li>GDPR、CCPA、PECRに準拠しています</li>
              </ul>

              <h3 className="text-xl font-semibold text-[#111827] mb-3 mt-6">収集される情報</h3>
              <p className="text-[#4b5563] leading-relaxed mb-4">以下の情報が匿名化された形で収集されます：</p>
              <ul className="list-disc list-inside space-y-2 text-[#4b5563] ml-4 mb-4">
                <li>ページビューとナビゲーションパターン</li>
                <li>参照元（どこから訪問したか）</li>
                <li>デバイスタイプとブラウザ</li>
                <li>地理的位置（国レベルのみ）</li>
                <li>ページの表示時間とパフォーマンス指標</li>
              </ul>

              <p className="text-[#4b5563] leading-relaxed mb-4">
                すべてのデータは匿名化され、集計されます。個々の訪問者を特定することはできません。
              </p>

              <p className="text-[#4b5563] leading-relaxed">
                詳細については、
                <a
                  href="https://plausible.io/data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#1e3a8a] hover:underline"
                >
                  Plausibleのデータポリシー
                </a>
                をご覧ください。
              </p>
            </section>

            {/* Section 8 */}
            <section id="section-8" className="mb-12">
              <h2 className="text-2xl font-bold text-[#111827] mb-4">8. Cookie等の使用</h2>
              <p className="text-[#4b5563] leading-relaxed">
                当社のウェブサイトでは、サービスの利便性向上のためCookieを使用することがあります。
                Cookieの使用を希望されない場合は、ブラウザの設定でCookieを無効にすることができます。
                ただし、Cookieを無効にした場合、一部のサービスが正常に機能しない可能性があります。
              </p>
            </section>

            {/* Section 9 */}
            <section id="section-9" className="mb-12">
              <h2 className="text-2xl font-bold text-[#111827] mb-4">9. プライバシーポリシーの変更</h2>
              <p className="text-[#4b5563] leading-relaxed">
                当社は、法令の変更や事業内容の変更に伴い、本プライバシーポリシーを変更することがあります。
                変更後のプライバシーポリシーは、本ページに掲載した時点で効力を生じるものとします。
              </p>
            </section>

            {/* Section 10 */}
            <section id="section-10" className="mb-12">
              <h2 className="text-2xl font-bold text-[#111827] mb-4">10. お問い合わせ</h2>
              <p className="text-[#4b5563] leading-relaxed mb-4">
                本プライバシーポリシーに関するお問い合わせは、以下までご連絡ください：
              </p>
              <div className="bg-[#f9fafb] rounded-lg p-6">
                <p className="text-[#111827] font-semibold mb-2">ConnectiveByte</p>
                <p className="text-[#4b5563]">
                  Email:{' '}
                  <a href="mailto:info@connectivebyte.com" className="text-[#1e3a8a] hover:underline">
                    info@connectivebyte.com
                  </a>
                </p>
              </div>
            </section>

            <div className="mt-12 pt-8 border-t border-[#e5e7eb]">
              <p className="text-sm text-[#9ca3af]">
                制定日：2024年1月1日
                <br />
                最終更新日：2024年11月19日
              </p>
            </div>
          </article>
        </Container>
      </main>
    </>
  );
}
