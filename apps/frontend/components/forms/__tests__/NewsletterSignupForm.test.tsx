import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../test/test-utils';
import { NewsletterSignupForm } from '../NewsletterSignupForm';

describe('NewsletterSignupForm', () => {
  it('should render form fields', () => {
    render(<NewsletterSignupForm />);

    expect(screen.getByLabelText(/メールアドレス/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登録/i })).toBeInTheDocument();
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<NewsletterSignupForm />);

    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const submitButton = screen.getByRole('button', { name: /登録/i });

    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/有効なメールアドレス/i)).toBeInTheDocument();
    });
  });

  it('should show validation error when consent is not checked', async () => {
    const user = userEvent.setup();
    render(<NewsletterSignupForm />);

    const emailInput = screen.getByLabelText(/メールアドレス/i);
    const submitButton = screen.getByRole('button', { name: /登録/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/プライバシーポリシーに同意してください/i);
    });
  });
});
