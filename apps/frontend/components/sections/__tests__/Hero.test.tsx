import React from 'react';
import { render, screen } from '@testing-library/react';
import { Hero } from '../Hero';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    h1: ({ children, variants, initial, animate, transition, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, variants, initial, animate, transition, ...props }: any) => <p {...props}>{children}</p>,
    div: ({ children, variants, initial, animate, transition, whileHover, whileTap, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock useReducedMotion hook
jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

describe('Hero', () => {
  const defaultProps = {
    headline: 'Test Headline',
    subheadline: 'Test Subheadline',
    ctaText: 'Get Started',
    ctaLink: '/contact',
  };

  it('renders headline', () => {
    render(<Hero {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /test headline/i })).toBeInTheDocument();
  });

  it('renders subheadline', () => {
    render(<Hero {...defaultProps} />);
    expect(screen.getByText(/test subheadline/i)).toBeInTheDocument();
  });

  it('renders CTA button with correct text and link', () => {
    render(<Hero {...defaultProps} />);
    const ctaButton = screen.getByRole('link', { name: /get started/i });
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute('href', '/contact');
  });

  it('applies gradient variant by default', () => {
    const { container } = render(<Hero {...defaultProps} />);
    const section = container.querySelector('section');
    expect(section).toHaveClass('bg-gradient-to-br');
  });

  it('applies minimal variant when specified', () => {
    const { container } = render(<Hero {...defaultProps} variant="minimal" />);
    const section = container.querySelector('section');
    expect(section).not.toHaveClass('bg-gradient-to-br');
    expect(section).toHaveClass('bg-[#1e3a8a]');
  });

  it('has proper accessibility attributes', () => {
    const { container } = render(<Hero {...defaultProps} />);
    const section = container.querySelector('section[aria-labelledby="hero-heading"]');
    expect(section).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('id', 'hero-heading');
  });

  it('renders scroll indicator', () => {
    const { container } = render(<Hero {...defaultProps} />);
    // Check for scroll indicator div (has specific styling)
    const scrollIndicator = container.querySelector('.w-6.h-10.border-2');
    expect(scrollIndicator).toBeInTheDocument();
  });
});
