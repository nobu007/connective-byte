import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import Home from '../page';

describe('Home Page', () => {
  it('renders the main heading', () => {
    render(<Home />);
    const heading = screen.getByText(/Get started by editing/i);
    expect(heading).toBeInTheDocument();
  });
});
