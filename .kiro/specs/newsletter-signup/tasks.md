# Implementation Plan

- [x] 1. Set up email service configuration
  - Install @react-email/components package
  - Add RESEND_AUDIENCE_ID environment variable to .env.local
  - Create Resend audience in dashboard
  - Verify sender domain (info@connectivebyte.com)
  - Document environment variables in .env.example
  - _Requirements: 5.1, 5.2_

- [x] 2. Create newsletter validation schema
  - Create lib/validation/newsletter-schema.ts
  - Implement Zod schema with email, name, consent fields
  - Add honeypot field (website) for bot detection
  - Implement disposable email domain validation
  - Add Japanese error messages
  - Export TypeScript types
  - _Requirements: 7.1, 7.3, 7.4, 9.2_

- [x] 3. Implement rate limiting utility
  - Create lib/rate-limit.ts
  - Implement in-memory rate limiting (3 requests per hour per IP)
  - Add cleanup for expired entries
  - Return success/failure and remaining count
  - Add logging for rate limit violations
  - _Requirements: 9.1_

- [x] 4. Create welcome email template
  - Install @react-email/components if not already installed
  - Create emails/WelcomeEmail.tsx
  - Design email layout with ConnectiveByte branding
  - Include welcome message and newsletter description
  - Add unsubscribe link placeholder
  - Style email for responsive display
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Implement newsletter API route
  - Create app/api/newsletter/route.ts
  - Implement POST handler with rate limiting
  - Add request validation using Zod schema
  - Implement honeypot check
  - Integrate with Resend API (add to audience)
  - Send welcome email using template
  - Add error handling and logging
  - Return appropriate status codes and messages
  - _Requirements: 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5, 9.3, 9.4_

- [x] 6. Create newsletter signup form component
  - Create components/forms/NewsletterSignupForm.tsx
  - Implement form with React Hook Form + Zod
  - Add email field (required)
  - Add name field (optional)
  - Add consent checkbox (required)
  - Add honeypot field (hidden)
  - Implement real-time validation
  - Add loading state during submission
  - Display success/error messages
  - Integrate analytics tracking
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 6.1, 6.2, 7.2, 7.5, 8.1, 8.2_

- [-] 7. Add newsletter section to footer
  - Update components/layout/Footer.tsx
  - Add newsletter section with heading and description
  - Integrate NewsletterSignupForm component
  - Style section to match existing footer design
  - Add responsive layout
  - Test on mobile and desktop
  - _Requirements: 1.1, 2.4, 2.5_

- [ ] 8. Configure analytics tracking
  - Add "Newsletter Signup Click" to Plausible goals
  - Configure custom property: location (footer, inline, popup)
  - Test event tracking in development
  - Verify events appear in Plausible dashboard
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 9. Update privacy policy
  - Add newsletter section to app/privacy/page.tsx
  - Explain data collection (email, name, timestamp)
  - Describe data usage (newsletter only)
  - Mention unsubscribe process
  - Link to Resend's privacy policy
  - Update last modified date
  - _Requirements: 2.2, 10.1, 10.4, 10.5_

- [ ] 10. Create unsubscribe page
  - Create app/unsubscribe/page.tsx
  - Display unsubscribe confirmation message
  - Explain that unsubscribe is processed automatically by Resend
  - Provide contact information for issues
  - Add link back to homepage
  - _Requirements: 4.2, 4.5_

- [ ] 11. Update documentation
  - Update README.md with newsletter feature
  - Document Resend audience setup in NETLIFY_DEPLOY.md
  - Add newsletter configuration to environment variables guide
  - Create docs/newsletter-setup.md with setup instructions
  - Document email template customization
  - _Requirements: 5.5_

- [ ] 12. Write unit tests
  - Test newsletter schema validation
  - Test rate limiting utility
  - Test NewsletterSignupForm component
  - Test form validation and error handling
  - Test success/error states
  - _Requirements: 7.1, 7.2, 7.3, 9.1_

- [ ] 13. Write integration tests
  - Test POST /api/newsletter endpoint
  - Test Resend API integration (mocked)
  - Test rate limiting enforcement
  - Test honeypot detection
  - Test error handling
  - _Requirements: 5.1, 5.2, 9.1, 9.3, 9.4_

- [ ] 14. Write E2E tests
  - Test newsletter signup flow from footer
  - Test form validation
  - Test success message display
  - Test error handling
  - Test analytics event tracking
  - _Requirements: 1.4, 1.5, 6.1, 8.1, 8.2_

- [ ] 15. Deploy and verify
  - Add RESEND_AUDIENCE_ID to Netlify environment variables
  - Deploy to production
  - Test newsletter signup on production
  - Verify welcome email delivery
  - Check Resend audience for new subscriber
  - Verify analytics events in Plausible
  - Test unsubscribe link in welcome email
  - _Requirements: 3.1, 3.5, 4.1, 4.4, 5.2, 6.3_

- [ ] 16. Performance and accessibility audit
  - Run Lighthouse audit on pages with newsletter form
  - Verify form submission completes within 2 seconds
  - Test keyboard navigation
  - Test with screen reader
  - Verify ARIA labels and error messages
  - Check mobile responsiveness
  - _Requirements: 8.2, 8.3, 8.5_
