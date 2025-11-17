import { Hero } from '@/components/sections/Hero';
import { ProblemStatement } from '@/components/sections/ProblemStatement';
import { ValuePropositions } from '@/components/sections/ValuePropositions';
import { SocialProof } from '@/components/sections/SocialProof';
import { CTASection } from '@/components/sections/CTASection';
import homepageContent from '@/content/homepage.json';
import { getOrganizationSchema } from '@/lib/seo/structured-data';

export default function Home() {
  const organizationSchema = getOrganizationSchema();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <main>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <Hero {...homepageContent.hero} />

        <div id="main-content">
          <ProblemStatement title="AI時代、1人で戦うのは限界" problems={homepageContent.problems} />

          <ValuePropositions title="接続可能な人材になる、3つの価値" values={homepageContent.values} />

          <SocialProof {...homepageContent.socialProof} />

          <CTASection {...homepageContent.finalCTA} />
        </div>
      </main>
    </>
  );
}
