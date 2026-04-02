import { Container } from '@/components/layout/Container';
import principlesContent from '@/content/public-principles.json';
import { getWebPageSchema } from '@/lib/seo/structured-data';
import { siteConfig } from '@/content/site-config';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Public Principles - ConnectiveByte',
  description: 'ConnectiveByteが公開する思想、技術原則、public/private境界について',
};

export default function PrinciplesPage() {
  const pageSchema = getWebPageSchema({
    title: 'Public Principles - ConnectiveByte',
    description: 'ConnectiveByteが公開する思想、技術原則、public/private境界について',
    url: `${siteConfig.url}/principles`,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <main className="pt-24 pb-16 bg-[#fcfcf9]">
        <Container maxWidth="md">
          <section className="mb-16 rounded-3xl bg-linear-to-r from-[#0f172a] via-primary-deep-blue to-[#0f766e] px-8 py-12 text-white shadow-xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#bfdbfe]">
              {principlesContent.hero.eyebrow}
            </p>
            <h1 className="mb-4 text-4xl font-bold leading-tight">{principlesContent.hero.title}</h1>
            <p className="max-w-3xl text-lg leading-relaxed text-[#e5eefc]">{principlesContent.hero.description}</p>
          </section>

          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold text-[#111827]">{principlesContent.philosophy.title}</h2>
            <div className="grid gap-6">
              {principlesContent.philosophy.items.map((item) => (
                <article key={item.title} className="rounded-2xl border border-[#dbe4ef] bg-white p-7 shadow-sm">
                  <h3 className="mb-3 text-xl font-bold text-primary-deep-blue">{item.title}</h3>
                  <p className="leading-relaxed text-[#4b5563]">{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold text-[#111827]">{principlesContent.technology.title}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {principlesContent.technology.items.map((item) => (
                <article key={item.title} className="rounded-2xl bg-[#eef6ff] p-7 shadow-sm ring-1 ring-[#d2e3f6]">
                  <h3 className="mb-3 text-xl font-bold text-[#0f172a]">{item.title}</h3>
                  <p className="leading-relaxed text-[#475569]">{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <h2 className="mb-6 text-3xl font-bold text-[#111827]">{principlesContent.boundary.title}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <article className="rounded-2xl border border-[#c7f0d8] bg-[#f0fdf4] p-7">
                <h3 className="mb-4 text-xl font-bold text-[#047857]">public に置くもの</h3>
                <ul className="space-y-3 text-[#166534]">
                  {principlesContent.boundary.public_items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden="true">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="rounded-2xl border border-[#fecaca] bg-[#fff7ed] p-7">
                <h3 className="mb-4 text-xl font-bold text-[#b45309]">private に置くもの</h3>
                <ul className="space-y-3 text-[#9a3412]">
                  {principlesContent.boundary.private_items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden="true">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </section>

          <section className="rounded-3xl bg-[#111827] px-8 py-10 text-white shadow-xl">
            <h2 className="mb-4 text-2xl font-bold">{principlesContent.cta.title}</h2>
            <p className="max-w-3xl leading-relaxed text-[#d1d5db]">{principlesContent.cta.description}</p>
          </section>
        </Container>
      </main>
    </>
  );
}
