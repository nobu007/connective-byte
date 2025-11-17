import { Hero } from '@/components/sections/Hero';
import { ProblemStatement } from '@/components/sections/ProblemStatement';
import { ValuePropositions } from '@/components/sections/ValuePropositions';
import { SocialProof } from '@/components/sections/SocialProof';
import { CTASection } from '@/components/sections/CTASection';
import homepageContent from '@/content/homepage.json';

export default function Home() {
  return (
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
  );
}
