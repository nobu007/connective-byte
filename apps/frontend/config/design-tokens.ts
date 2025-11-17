/**
 * Design Tokens for ConnectiveByte Website
 * Centralized design system configuration
 */

export const colors = {
  primary: {
    deepBlue: '#1e3a8a',
    techGreen: '#10b981',
  },
  accent: {
    brightOrange: '#f97316',
    vividPurple: '#a855f7',
  },
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    600: '#4b5563',
    900: '#111827',
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
} as const;

export const typography = {
  fonts: {
    heading: "'Inter', 'Noto Sans JP', sans-serif",
    body: "'Inter', 'Noto Sans JP', sans-serif",
  },
  sizes: {
    hero: '3.5rem', // 56px
    h1: '2.5rem', // 40px
    h2: '2rem', // 32px
    h3: '1.5rem', // 24px
    body: '1rem', // 16px
    small: '0.875rem', // 14px
  },
  weights: {
    bold: 700,
    semibold: 600,
    normal: 400,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;

export const spacing = {
  xs: '0.5rem', // 8px
  sm: '1rem', // 16px
  md: '1.5rem', // 24px
  lg: '2rem', // 32px
  xl: '3rem', // 48px
  '2xl': '4rem', // 64px
  '3xl': '6rem', // 96px
} as const;

export const breakpoints = {
  mobile: '320px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
} as const;
