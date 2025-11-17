import { Container } from '@/components/layout/Container';
import aboutContent from '@/content/about.json';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About - ConnectiveByte',
  description: 'ConnectiveByteのミッション、思想、ビジョンについて',
};

export default function AboutPage() {
  return (
    <main className="pt-24 pb-16">
      <Container maxWidth="md">
        <article className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-16">
            <h1 className="text-4xl font-bold text-[#111827] mb-6">{aboutContent.introduction.title}</h1>
            <p className="text-lg text-[#4b5563] leading-relaxed">{aboutContent.introduction.content}</p>
          </section>

          {/* Mission */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#111827] mb-4">{aboutContent.mission.title}</h2>
            <div className="bg-[#10b981]/10 border-l-4 border-[#10b981] p-6 mb-6">
              <p className="text-xl font-semibold text-[#111827] mb-2">{aboutContent.mission.headline}</p>
            </div>
            <p className="text-[#4b5563] leading-relaxed">{aboutContent.mission.description}</p>
          </section>

          {/* Philosophy */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#111827] mb-4">{aboutContent.philosophy.title}</h2>
            <p className="text-lg text-[#4b5563] mb-8">{aboutContent.philosophy.subtitle}</p>

            <div className="space-y-12">
              {aboutContent.philosophy.concepts.map((concept, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-8">
                  <h3 className="text-2xl font-bold text-[#1e3a8a] mb-3">{concept.title}</h3>
                  <div className="bg-[#1e3a8a]/5 border-l-4 border-[#1e3a8a] p-4 mb-4">
                    <p className="text-lg font-semibold text-[#111827]">{concept.headline}</p>
                  </div>
                  <p className="text-[#4b5563] leading-relaxed mb-4">{concept.description}</p>
                  <div className="bg-[#f97316]/10 rounded-lg p-4">
                    <p className="text-[#4b5563] leading-relaxed italic">{concept.insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Values */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-[#111827] mb-6">{aboutContent.values.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {aboutContent.values.items.map((item, index) => (
                <div key={index} className="bg-[#f9fafb] rounded-lg p-6">
                  <h3 className="text-xl font-bold text-[#10b981] mb-3">{item.title}</h3>
                  <p className="text-[#4b5563] leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Vision */}
          <section>
            <h2 className="text-3xl font-bold text-[#111827] mb-6">{aboutContent.vision.title}</h2>
            <div className="whitespace-pre-line text-[#4b5563] leading-relaxed mb-8">{aboutContent.vision.content}</div>
            <div className="bg-gradient-to-r from-[#1e3a8a] to-[#10b981] text-white rounded-lg p-8 text-center">
              <p className="text-2xl font-bold leading-relaxed">{aboutContent.vision.tagline}</p>
            </div>
          </section>
        </article>
      </Container>
    </main>
  );
}
