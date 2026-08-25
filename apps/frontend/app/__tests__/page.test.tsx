import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import { render } from '../../test/test-utils';
import Home from '../page';

describe('Home Page', () => {
  it('renders the hero with headline and CTA from homepage content', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { level: 1, name: /個を超え、知が立ち上がる場所/i })).toBeInTheDocument();
    expect(screen.getByText(/AI時代の知的共創圏 ConnectiveByte/i)).toBeInTheDocument();
    // CTA は Hero と finalCTA の2箇所に表示される
    const ctaLinks = screen.getAllByRole('link', { name: /無料相談に申し込む/i });
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
    ctaLinks.forEach((link) => expect(link).toHaveAttribute('href', '/contact'));
  });

  it('renders the main content sections', () => {
    render(<Home />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText(/AI時代、1人で戦うのは限界/i)).toBeInTheDocument();
    expect(screen.getByText(/接続可能な人材になる、3つの価値/i)).toBeInTheDocument();
  });

  it('provides a skip link for accessibility', () => {
    render(<Home />);

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('embeds organization structured data for SEO', () => {
    const { container } = render(<Home />);

    const ldJson = container.querySelector('script[type="application/ld+json"]');
    expect(ldJson).not.toBeNull();
    const parsed = JSON.parse(ldJson?.textContent ?? '{}') as { '@type'?: string };
    expect(parsed['@type']).toBe('Organization');
  });
});
