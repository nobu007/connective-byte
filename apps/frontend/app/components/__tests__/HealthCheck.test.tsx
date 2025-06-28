import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import HealthCheck from '../HealthCheck';

describe('HealthCheck Component', () => {
  it('displays the API status after fetching', async () => {
    render(<HealthCheck />);

    // Initially, it should show loading
    expect(screen.getByText('API Status: loading...')).toBeInTheDocument();

    // After the fetch is mocked and completes, it should show the healthy status
    await waitFor(() => {
      expect(screen.getByText('API Status: healthy')).toBeInTheDocument();
    });
  });
});
