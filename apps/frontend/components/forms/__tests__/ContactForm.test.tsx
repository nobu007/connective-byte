import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactForm } from '../ContactForm';

// Helper to get submit button
const getSubmitButton = () => screen.getByText(/送信する/i).closest('button') as HTMLButtonElement;

describe('ContactForm', () => {
  beforeEach(() => {
    // Mock fetch for each test
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders all form fields', () => {
      render(<ContactForm />);

      expect(screen.getByLabelText(/お名前/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/メールアドレス/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/お問い合わせ内容/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByText(/送信する/i)).toBeInTheDocument();
    });

    it('renders privacy policy link', () => {
      render(<ContactForm />);
      const privacyLink = screen.getByRole('link', { name: /プライバシーポリシー/i });
      expect(privacyLink).toHaveAttribute('href', '/privacy');
      expect(privacyLink).toHaveAttribute('target', '_blank');
    });

    it('marks required fields with asterisk', () => {
      render(<ContactForm />);
      const asterisks = screen.getAllByText('*');
      expect(asterisks.length).toBeGreaterThan(0);
    });
  });

  describe('validation', () => {
    it('shows error when name is empty', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const submitButton = getSubmitButton();
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/お名前は2文字以上で入力してください/i)).toBeInTheDocument();
      });
    });

    it('shows error when name is too short', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const nameInput = screen.getByLabelText(/お名前/i);
      await user.type(nameInput, 'A');

      const submitButton = getSubmitButton();
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/お名前は2文字以上で入力してください/i)).toBeInTheDocument();
      });
    });

    it('shows error when email is empty', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const submitButton = getSubmitButton();
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/有効なメールアドレスを入力してください/i)).toBeInTheDocument();
      });
    });

    it('shows error when email is invalid', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const emailInput = screen.getByLabelText(/メールアドレス/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = getSubmitButton();
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/有効なメールアドレスを入力してください/i)).toBeInTheDocument();
      });
    });

    it('shows error when message is empty', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const submitButton = getSubmitButton();
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/メッセージは10文字以上で入力してください/i)).toBeInTheDocument();
      });
    });

    it('shows error when message is too short', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const messageInput = screen.getByLabelText(/お問い合わせ内容/i);
      await user.type(messageInput, 'Short');

      const submitButton = getSubmitButton();
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/メッセージは10文字以上で入力してください/i)).toBeInTheDocument();
      });
    });

    it('shows error when consent checkbox is not checked', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const nameInput = screen.getByLabelText(/お名前/i);
      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const messageInput = screen.getByLabelText(/お問い合わせ内容/i);

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(messageInput, 'This is a test message with enough characters');

      const submitButton = getSubmitButton();
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/プライバシーポリシーに同意してください/i)).toBeInTheDocument();
      });
    });
  });

  describe('form submission', () => {
    it('submits form with valid data', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'お問い合わせを受け付けました' }),
      });

      render(<ContactForm />);

      const nameInput = screen.getByLabelText(/お名前/i);
      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const messageInput = screen.getByLabelText(/お問い合わせ内容/i);
      const consentCheckbox = screen.getByRole('checkbox');

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(messageInput, 'This is a test message with enough characters');
      await user.click(consentCheckbox);

      const submitButton = getSubmitButton();
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/contact',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Test User',
              email: 'test@example.com',
              message: 'This is a test message with enough characters',
              consent: true,
            }),
          }),
        );
      });
    });

    it('shows success message after successful submission', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'お問い合わせを受け付けました' }),
      });

      render(<ContactForm />);

      const nameInput = screen.getByLabelText(/お名前/i);
      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const messageInput = screen.getByLabelText(/お問い合わせ内容/i);
      const consentCheckbox = screen.getByRole('checkbox');

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(messageInput, 'This is a test message with enough characters');
      await user.click(consentCheckbox);

      const submitButton = getSubmitButton();
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/送信完了/i)).toBeInTheDocument();
        expect(screen.getByText(/お問い合わせありがとうございます/i)).toBeInTheDocument();
      });
    });

    it('shows error message when submission fails', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'サーバーエラーが発生しました' }),
      });

      render(<ContactForm />);

      const nameInput = screen.getByLabelText(/お名前/i);
      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const messageInput = screen.getByLabelText(/お問い合わせ内容/i);
      const consentCheckbox = screen.getByRole('checkbox');

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(messageInput, 'This is a test message with enough characters');
      await user.click(consentCheckbox);

      const submitButton = getSubmitButton();
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/サーバーエラーが発生しました/i)).toBeInTheDocument();
      });
    });

    it('resets form after successful submission', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'お問い合わせを受け付けました' }),
      });

      render(<ContactForm />);

      const nameInput = screen.getByLabelText(/お名前/i) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/メールアドレス/i) as HTMLInputElement;
      const messageInput = screen.getByLabelText(/お問い合わせ内容/i) as HTMLTextAreaElement;
      const consentCheckbox = screen.getByRole('checkbox') as HTMLInputElement;

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(messageInput, 'This is a test message with enough characters');
      await user.click(consentCheckbox);

      const submitButton = getSubmitButton();
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/送信完了/i)).toBeInTheDocument();
      });

      // Click button to send another message
      const sendAnotherButton = screen.getByText(/別のメッセージを送信/i).closest('button') as HTMLButtonElement;
      await user.click(sendAnotherButton);

      // Form should be reset
      await waitFor(() => {
        const newNameInput = screen.getByLabelText(/お名前/i) as HTMLInputElement;
        const newEmailInput = screen.getByLabelText(/メールアドレス/i) as HTMLInputElement;
        const newMessageInput = screen.getByLabelText(/お問い合わせ内容/i) as HTMLTextAreaElement;
        const newConsentCheckbox = screen.getByRole('checkbox') as HTMLInputElement;

        expect(newNameInput.value).toBe('');
        expect(newEmailInput.value).toBe('');
        expect(newMessageInput.value).toBe('');
        expect(newConsentCheckbox.checked).toBe(false);
      });
    });
  });

  describe('loading state', () => {
    it('disables submit button during submission', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true }),
                }),
              100,
            ),
          ),
      );

      render(<ContactForm />);

      const nameInput = screen.getByLabelText(/お名前/i);
      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const messageInput = screen.getByLabelText(/お問い合わせ内容/i);
      const consentCheckbox = screen.getByRole('checkbox');

      await user.type(nameInput, 'Test User');
      await user.type(emailInput, 'test@example.com');
      await user.type(messageInput, 'This is a test message with enough characters');
      await user.click(consentCheckbox);

      const submitButton = getSubmitButton();
      await user.click(submitButton);

      // Button should show loading state
      await waitFor(() => {
        const loadingButton = screen.getByText(/送信中/i).closest('button') as HTMLButtonElement;
        expect(loadingButton).toBeDisabled();
      });
    });
  });

  describe('accessibility', () => {
    it('has proper aria attributes for form fields', () => {
      render(<ContactForm />);

      const nameInput = screen.getByLabelText(/お名前/i);
      const emailInput = screen.getByLabelText(/メールアドレス/i);
      const messageInput = screen.getByLabelText(/お問い合わせ内容/i);

      expect(nameInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(messageInput).toHaveAttribute('aria-required', 'true');
    });

    it('associates error messages with form fields', async () => {
      const user = userEvent.setup();
      render(<ContactForm />);

      const submitButton = getSubmitButton();
      await user.click(submitButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/お名前/i);
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
        expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
      });
    });

    it('has proper form landmark', () => {
      const { container } = render(<ContactForm />);
      const form = container.querySelector('form[aria-labelledby="contact-form-heading"]');
      expect(form).toBeInTheDocument();
    });
  });
});
