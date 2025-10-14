import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '../page';

describe('Home Page', () => {
  it('renders with health check status', async () => {
    render(<Home />);

    // Should show loading initially
    expect(screen.getByText(/Connecting to backend/i)).toBeInTheDocument();
    expect(screen.getByTestId('status-indicator')).toHaveTextContent('LOADING');

    // After fetch completes, should show success
    await waitFor(() => {
      expect(screen.getByText(/Backend status:/i)).toBeInTheDocument();
      expect(screen.getByTestId('status-indicator')).toHaveTextContent('SUCCESS');
    });
  });
});
