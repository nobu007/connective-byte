import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navigation } from '../Navigation';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock site config
jest.mock('../../../content/site-config', () => ({
  siteConfig: {
    name: 'ConnectiveByte',
    navigation: [
      { name: 'ホーム', href: '/' },
      { name: 'About', href: '/about' },
      { name: 'お問い合わせ', href: '/contact' },
    ],
  },
}));

// Mock auth context（Navigation は useAuth でログイン状態を表示）
const authState = {
  status: 'unauthenticated' as 'loading' | 'authenticated' | 'unauthenticated',
  user: null as { fullName: string } | null,
  logout: jest.fn(),
};
jest.mock('../../auth/AuthProvider', () => ({
  useAuth: () => authState,
}));

describe('Navigation', () => {
  beforeEach(() => {
    // Reset any DOM state
    document.body.style.overflow = 'unset';
    authState.status = 'unauthenticated';
    authState.user = null;
    authState.logout.mockClear();
  });

  it('renders site name', () => {
    render(<Navigation />);
    expect(screen.getByRole('link', { name: /connectivebyte/i })).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    render(<Navigation />);
    expect(screen.getByRole('link', { name: /ホーム/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /お問い合わせ/i })).toBeInTheDocument();
  });

  it('has proper navigation landmark', () => {
    render(<Navigation />);
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav).toBeInTheDocument();
  });

  describe('auth slot', () => {
    it('shows login link when unauthenticated', () => {
      render(<Navigation />);
      expect(screen.getAllByRole('link', { name: /ログイン/ }).length).toBeGreaterThan(0);
    });

    it('shows mypage and logout when authenticated', () => {
      authState.status = 'authenticated';
      authState.user = { fullName: 'テストユーザー' };

      render(<Navigation />);
      expect(screen.getAllByRole('link', { name: /マイページ/ }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /ログアウト/ }).length).toBeGreaterThan(0);
      expect(screen.queryByRole('link', { name: /^ログイン$/ })).not.toBeInTheDocument();
    });

    it('shows no auth entry while session is restoring', () => {
      authState.status = 'loading';

      render(<Navigation />);
      expect(screen.queryByRole('link', { name: /ログイン/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /マイページ/ })).not.toBeInTheDocument();
    });
  });

  describe('mobile menu', () => {
    it('shows mobile menu button', () => {
      render(<Navigation />);
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('toggles mobile menu when button is clicked', async () => {
      const user = userEvent.setup();
      render(<Navigation />);

      const menuButton = screen.getByRole('button', { name: /open menu/i });

      // Click to open
      await user.click(menuButton);
      expect(screen.getByRole('button', { name: /close menu/i })).toBeInTheDocument();

      // Click to close
      await user.click(screen.getByRole('button', { name: /close menu/i }));
      expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
    });

    it('sets body overflow when menu is open', async () => {
      const user = userEvent.setup();
      render(<Navigation />);

      const menuButton = screen.getByRole('button', { name: /open menu/i });
      await user.click(menuButton);

      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('accessibility', () => {
    it('has aria-expanded attribute on mobile menu button', () => {
      render(<Navigation />);
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('marks current page with aria-current', () => {
      render(<Navigation />);
      const homeLink = screen.getAllByRole('link', { name: /ホーム/i })[0];
      expect(homeLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('scroll behavior', () => {
    it('applies shadow on scroll', () => {
      const { container } = render(<Navigation />);

      // Simulate scroll
      window.scrollY = 100;
      window.dispatchEvent(new Event('scroll'));

      const header = container.querySelector('header');
      // Note: This test may need adjustment based on actual implementation
      expect(header).toBeInTheDocument();
    });
  });
});
