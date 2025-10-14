import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import HealthCheck from '../HealthCheck';
import { server } from '../../../mocks/server';
import { errorHandlers } from '../../../mocks/handlers';

describe('HealthCheck Component', () => {
  it('displays the API status after fetching', async () => {
    render(<HealthCheck />);

    // Initially, it should show loading
    expect(screen.getByText(/API Status: LOADING/i)).toBeInTheDocument();

    // After the fetch is mocked and completes, it should show the success status
    await waitFor(() => {
      expect(screen.getByText(/API Status: SUCCESS/i)).toBeInTheDocument();
      expect(screen.getByText(/Backend status: ok/i)).toBeInTheDocument();
    });
  });

  it('displays an error status when the API call fails', async () => {
    // Override the default handlers with error handlers for this test
    server.use(...errorHandlers);

    render(<HealthCheck />);

    // Initially, it should show loading
    expect(screen.getByText(/API Status: LOADING/i)).toBeInTheDocument();

    // After the fetch fails, it should show the error status
    await waitFor(
      () => {
        expect(screen.getByText(/API Status: ERROR/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to connect/i)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
