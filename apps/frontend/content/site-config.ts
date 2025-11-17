/**
 * Global site configuration
 */

export const siteConfig = {
  name: 'ConnectiveByte',
  description: 'AI時代の知的共創圏 - 個を超え、知が立ち上がる場所',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://connectivebyte.com',
  ogImage: '/images/og-image.jpg',

  links: {
    twitter: 'https://twitter.com/connectivebyte',
    threads: 'https://threads.net/@connectivebyte',
  },

  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@connectivebyte.com',
  },

  navigation: [
    { name: 'ホーム', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'お問い合わせ', href: '/contact' },
  ],

  footer: {
    tagline: '個を超え、知が立ち上がる場所',
    copyright: `© ${new Date().getFullYear()} ConnectiveByte. All rights reserved.`,
    legalLinks: [{ name: 'プライバシーポリシー', href: '/privacy' }],
  },
} as const;

export type SiteConfig = typeof siteConfig;
