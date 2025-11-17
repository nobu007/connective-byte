import { Container } from '@/components/layout/Container';
import { ContactForm } from '@/components/forms/ContactForm';
import { Clock, Mail, MessageSquare } from 'lucide-react';
import { getWebPageSchema } from '@/lib/seo/structured-data';
import { siteConfig } from '@/content/site-config';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'お問い合わせ - ConnectiveByte',
  description: '無料相談のお申し込みはこちらから。AI時代の協創リーダーへの第一歩を踏み出しましょう。',
};

export default function ContactPage() {
  const pageSchema = getWebPageSchema({
    title: 'お問い合わせ - ConnectiveByte',
    description: '無料相談のお申し込みはこちらから。AI時代の協創リーダーへの第一歩を踏み出しましょう。',
    url: `${siteConfig.url}/contact`,
  });
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <main className="pt-24 pb-16">
        <Container>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-[#111827] mb-4">無料相談のお申し込み</h1>
              <p className="text-lg text-[#4b5563] leading-relaxed">
                あなたの課題をお聞かせください。
                <br />
                AI時代の協創リーダーへの道をサポートします。
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Contact Form */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-md p-8">
                  <h2 id="contact-form-heading" className="text-2xl font-bold text-[#111827] mb-6">
                    お問い合わせフォーム
                  </h2>
                  <ContactForm />
                </div>
              </div>

              {/* Contact Information */}
              <div className="lg:col-span-1">
                <div className="bg-[#f9fafb] rounded-lg p-6 sticky top-24">
                  <h2 className="text-xl font-bold text-[#111827] mb-6">相談について</h2>

                  <div className="space-y-6">
                    <div className="flex items-start">
                      <MessageSquare className="text-[#10b981] mr-3 flex-shrink-0 mt-1" size={24} />
                      <div>
                        <h3 className="font-semibold text-[#111827] mb-2">何をお話しできますか？</h3>
                        <p className="text-sm text-[#4b5563] leading-relaxed">
                          AI協働スキル、思考連携、チーム効率化など、あなたの課題に合わせてご相談いただけます。
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Clock className="text-[#10b981] mr-3 flex-shrink-0 mt-1" size={24} />
                      <div>
                        <h3 className="font-semibold text-[#111827] mb-2">相談の流れ</h3>
                        <ol className="text-sm text-[#4b5563] leading-relaxed list-decimal list-inside space-y-1">
                          <li>フォームから申し込み</li>
                          <li>2営業日以内にご連絡</li>
                          <li>オンライン面談（30分）</li>
                          <li>プログラム参加のご案内</li>
                        </ol>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Mail className="text-[#10b981] mr-3 flex-shrink-0 mt-1" size={24} />
                      <div>
                        <h3 className="font-semibold text-[#111827] mb-2">返信について</h3>
                        <p className="text-sm text-[#4b5563] leading-relaxed">
                          通常2営業日以内にご返信いたします。お急ぎの場合はその旨をメッセージ欄にご記入ください。
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-[#e5e7eb]">
                    <p className="text-xs text-[#9ca3af] leading-relaxed">
                      ご入力いただいた個人情報は、お問い合わせへの対応のみに使用し、
                      <a href="/privacy" className="text-[#1e3a8a] hover:underline">
                        プライバシーポリシー
                      </a>
                      に基づき適切に管理いたします。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </main>
    </>
  );
}
