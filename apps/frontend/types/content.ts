/**
 * TypeScript interfaces for content types
 */

export interface HeroContent {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaLink: string;
}

export interface ProblemCard {
  icon: string;
  title: string;
  description: string;
}

export interface ValueCard {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  benefits: string[];
  color: 'blue' | 'green' | 'orange';
}

export interface SocialProof {
  participantCount: number;
  programName: string;
  badge: string;
  description: string;
}

export interface CTASection {
  headline: string;
  description: string;
  steps: string[];
  ctaText: string;
  ctaLink: string;
}

export interface HomepageContent {
  hero: HeroContent;
  problems: ProblemCard[];
  values: ValueCard[];
  socialProof: SocialProof;
  finalCTA: CTASection;
}

export interface PhilosophyConcept {
  title: string;
  headline: string;
  description: string;
  insight: string;
}

export interface AboutContent {
  introduction: {
    title: string;
    content: string;
  };
  mission: {
    title: string;
    headline: string;
    description: string;
  };
  philosophy: {
    title: string;
    subtitle: string;
    concepts: PhilosophyConcept[];
  };
  values: {
    title: string;
    items: Array<{
      title: string;
      description: string;
    }>;
  };
  vision: {
    title: string;
    content: string;
    tagline: string;
  };
}

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
  consent: boolean;
}

export interface SocialLink {
  name: string;
  href: string;
  icon: string;
}

export interface LegalLink {
  name: string;
  href: string;
}
