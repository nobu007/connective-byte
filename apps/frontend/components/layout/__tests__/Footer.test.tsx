import React from 'react';
import { render, screen } from '@testing-library/react';
import { Footer } from '../Footer';

// Mock site config
jest.mock('../../../content/site-config', () => ({
  siteConfig: {
    name: 'ConnectiveByte',
    navigation: [
      { name: 'ホーム', href: '/' },
      { name: 'About', href: '/about' },
      { name: 'お問い合わせ', href: '/contact' },
    ],
    links: {
      twitter: 'https://twitter.com/connectivebyte',
      threads: 'https://threads.net/@connectivebyte',
    },
    footer: {
      tagline: '個を超え、知が立ち上がる場所',
      copyright: '© 2024 ConnectiveByte. All rights reserved.',
      legalLinks: [{ name: 'プライバシーポリシー', href: '/privacy' }],
    },
  },
}));

describe('Footer', () => {
  it('renders company name', () => {
    render(<Footer />);
    expect(screen.getByRole('heading', { name: /connectivebyte/i })).toBeInTheDocument();
  });

  it('renders tagline', () => {
    render(<Footer />);
    expect(screen.getByText(/個を超え、知が立ち上がる場所/i)).toBeInTheDocument();
  });

  it('renders copyright text', () => {
    render(<Footer />);
    expect(screen.getByText(/© 2024 ConnectiveByte/i)).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /ホーム/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /お問い合わせ/i })).toBeInTheDocument();
  });

  it('renders privacy policy link', () => {
    render(<Footer />);
    const privacyLink = screen.getByRole('link', { name: /プライバシーポリシー/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  describe('social media links', () => {
    it('renders Twitter link with correct attributes', () => {
      render(<Footer />);
      const twitterLink = screen.getByRole('link', { name: /twitter/i });
      expect(twitterLink).toBeInTheDocument();
      expect(twitterLink).toHaveAttribute('href', 'https://twitter.com/connectivebyte');
      expect(twitterLink).toHaveAttribute('target', '_blank');
      expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders Threads link with correct attributes', () => {
      render(<Footer />);
      const threadsLink = screen.getByRole('link', { name: /threads/i });
      expect(threadsLink).toBeInTheDocument();
      expect(threadsLink).toHaveAttribute('href', 'https://threads.net/@connectivebyte');
      expect(threadsLink).toHaveAttribute('target', '_blank');
      expect(threadsLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('accessibility', () => {
    it('has proper list structure for navigation', () => {
      render(<Footer />);
      const lists = screen.getAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);
    });

    it('has semantic footer element', () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });
  });

  describe('layout sections', () => {
    it('renders navigation section heading', () => {
      render(<Footer />);
      expect(screen.getByRole('heading', { name: /ナビゲーション/i })).toBeInTheDocument();
    });

    it('renders social section heading', () => {
      render(<Footer />);
      expect(screen.getByRole('heading', { name: /フォロー/i })).toBeInTheDocument();
    });
  });
});
