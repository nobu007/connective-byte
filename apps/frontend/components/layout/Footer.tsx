import React from 'react';
import Link from 'next/link';
import { Twitter } from 'lucide-react';
import { siteConfig } from '@/content/site-config';
import { Container } from './Container';

export function Footer() {
  return (
    <footer className="bg-[#111827] text-white py-12">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-4">{siteConfig.name}</h3>
            <p className="text-[#9ca3af] text-sm leading-relaxed">{siteConfig.footer.tagline}</p>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">ナビゲーション</h4>
            <ul className="space-y-2" role="list">
              {siteConfig.navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-[#9ca3af] hover:text-white transition-colors text-sm">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Links & Legal */}
          <div>
            <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider">フォロー</h4>
            <div className="flex space-x-4 mb-6">
              <a
                href={siteConfig.links.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9ca3af] hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
              <a
                href={siteConfig.links.threads}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#9ca3af] hover:text-white transition-colors"
                aria-label="Threads"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.186 3.998c-1.5 0-2.75.5-3.5 1.25-.75.75-1.25 1.75-1.25 3v.5h2v-.5c0-.75.25-1.25.5-1.5.25-.25.75-.5 1.25-.5s1 .25 1.25.5c.25.25.5.75.5 1.5v.5c0 .75-.25 1.25-.5 1.5-.25.25-.75.5-1.25.5h-.5v2h.5c1.5 0 2.75-.5 3.5-1.25.75-.75 1.25-1.75 1.25-3v-.5c0-1.25-.5-2.25-1.25-3-.75-.75-2-1.25-3.5-1.25zm0 10c-1.5 0-2.75.5-3.5 1.25-.75.75-1.25 1.75-1.25 3v.5c0 1.25.5 2.25 1.25 3 .75.75 2 1.25 3.5 1.25s2.75-.5 3.5-1.25c.75-.75 1.25-1.75 1.25-3v-.5c0-1.25-.5-2.25-1.25-3-.75-.75-2-1.25-3.5-1.25zm0 2c.5 0 1 .25 1.25.5.25.25.5.75.5 1.5v.5c0 .75-.25 1.25-.5 1.5-.25.25-.75.5-1.25.5s-1-.25-1.25-.5c-.25-.25-.5-.75-.5-1.5v-.5c0-.75.25-1.25.5-1.5.25-.25.75-.5 1.25-.5z" />
                </svg>
              </a>
            </div>

            <ul className="space-y-2" role="list">
              {siteConfig.footer.legalLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-[#9ca3af] hover:text-white transition-colors text-sm">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[#374151]">
          <p className="text-[#9ca3af] text-sm text-center">{siteConfig.footer.copyright}</p>
        </div>
      </Container>
    </footer>
  );
}
