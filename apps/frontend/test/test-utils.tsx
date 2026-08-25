import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { PlausibleProvider } from '@/lib/analytics/PlausibleProvider';

// Wrapper providing a disabled PlausibleProvider for components using useTrackEvent
const PlausibleWrapper = ({ children }: { children: ReactNode }) => (
  <PlausibleProvider
    config={{
      enabled: false,
      domain: 'test.com',
      apiHost: 'https://plausible.io',
      trackLocalhost: false,
    }}
  >
    {children}
  </PlausibleProvider>
);

// render with PlausibleProvider pre-applied (analytics disabled)
function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: PlausibleWrapper, ...options });
}

export { renderWithProviders as render };
