# Implementation Plan

- [x] 1. Set up design system and configuration
  - Create design tokens for colors, typography, and spacing
  - Configure Tailwind CSS with custom theme
  - Set up content structure and configuration files
  - _Requirements: 1.1, 7.1, 7.2_

- [x] 1.1 Create design system configuration
  - Create `config/design-tokens.ts` with color palette, typography scale, and spacing system
  - Configure `tailwind.config.ts` with custom theme extending default Tailwind
  - Add custom CSS variables in `globals.css` for dynamic theming
  - _Requirements: 1.1, 7.1_

- [x] 1.2 Set up content management structure
  - Create `content/homepage.json` with all homepage section content
  - Create `content/about.json` with about page content
  - Create `content/site-config.ts` with global site configuration
  - Create TypeScript interfaces for content types in `types/content.ts`
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 1.3 Configure additional dependencies
  - Install Framer Motion for animations (`npm install framer-motion`)
  - Install React Hook Form and Zod (`npm install react-hook-form @hookform/resolvers zod`)
  - Install Lucide React for icons (`npm install lucide-react`)
  - Install next-seo for SEO utilities (`npm install next-seo`)
  - _Requirements: 4.2, 4.3, 9.2_

- [x] 2. Build core component library
  - Create reusable UI components following design system
  - Implement responsive behavior and accessibility features
  - Add animations and interactions
  - _Requirements: 1.1, 1.2, 5.1, 5.4, 10.1, 10.3_

- [x] 2.1 Create layout components
  - Create `components/layout/Navigation.tsx` with desktop and mobile variants
  - Create `components/layout/Footer.tsx` with company info and social links
  - Create `components/layout/Container.tsx` for consistent max-width and padding
  - Add sticky navigation behavior and mobile menu toggle
  - _Requirements: 5.2, 8.1, 8.2, 8.4_

- [x] 2.2 Create hero and CTA components
  - Create `components/sections/Hero.tsx` with headline, subheadline, and CTA
  - Create `components/ui/Button.tsx` with variants (primary, secondary, outline)
  - Create `components/sections/CTASection.tsx` for final call-to-action
  - Add entrance animations with Framer Motion
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.3 Create card components
  - Create `components/ui/ProblemCard.tsx` for problem statement section
  - Create `components/ui/ValueCard.tsx` for value propositions with color variants
  - Create `components/ui/Card.tsx` as base card component
  - Add hover effects and staggered animations
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.4 Create social proof component
  - Create `components/sections/SocialProof.tsx` with participant counter
  - Implement animated counter using Framer Motion
  - Add Version 0 program badge styling
  - _Requirements: 2.5_

- [x] 3. Implement contact form with validation
  - Build form component with React Hook Form
  - Add Zod validation schema
  - Implement form submission handling
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3.1 Create form components
  - Create `components/forms/ContactForm.tsx` with all form fields
  - Create `components/forms/FormField.tsx` for reusable field wrapper
  - Create `components/forms/FormError.tsx` for error message display
  - Add proper labels, ARIA attributes, and accessibility features
  - _Requirements: 4.1, 4.2, 10.4_

- [x] 3.2 Implement form validation
  - Create `lib/validation/contact-schema.ts` with Zod schema
  - Add Japanese error messages for all validation rules
  - Integrate schema with React Hook Form using zodResolver
  - Add real-time field validation on blur
  - _Requirements: 4.3_

- [x] 3.3 Set up form submission
  - Create API route `app/api/contact/route.ts` for form handling
  - Integrate email service (Resend or similar) for sending notifications
  - Add success and error state handling in form component
  - Implement loading state with disabled submit button
  - _Requirements: 4.4_
  - _Note: Email service integration is stubbed out and ready for production API key_

- [x] 4. Build homepage with all sections
  - Implement homepage layout with all content sections
  - Connect components to content data
  - Add scroll animations and interactions
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.5_

- [x] 4.1 Create homepage structure
  - Create `app/page.tsx` with all homepage sections
  - Import and render Hero, Problem Statement, Value Propositions, Social Proof, and CTA sections
  - Load content from `content/homepage.json`
  - Add proper semantic HTML structure with sections and headings
  - _Requirements: 1.1, 1.3, 9.1_

- [x] 4.2 Implement problem statement section
  - Create `components/sections/ProblemStatement.tsx`
  - Render 3 problem cards in responsive grid
  - Add scroll-triggered staggered animations
  - _Requirements: 2.1, 2.2_

- [x] 4.3 Implement value propositions section
  - Create `components/sections/ValuePropositions.tsx`
  - Render 3 value cards (Connect, Active, Collective) with color variants
  - Add hover interactions and animations
  - _Requirements: 2.2, 2.3_

- [x] 4.4 Add scroll animations
  - Implement scroll-triggered animations using Framer Motion's `whileInView`
  - Add fade-in and slide-up effects for sections
  - Respect `prefers-reduced-motion` user preference
  - _Requirements: 1.5_

- [x] 5. Create About page
  - Build About page with company story and philosophy
  - Balance practical and philosophical content
  - Add visual elements and formatting
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5.1 Implement About page structure
  - Create `app/about/page.tsx` with introduction, philosophy, and vision sections
  - Load content from `content/about.json`
  - Use single-column layout with max-width for readability
  - Add proper heading hierarchy and semantic HTML
  - _Requirements: 3.1, 3.2, 9.1_

- [x] 5.2 Add philosophical content section
  - Create section explaining "Third Reality" concept accessibly
  - Use pull quotes or highlighted text for key concepts
  - Add visual diagrams or illustrations if helpful
  - Maintain 70/30 practical-to-philosophical ratio
  - _Requirements: 3.2, 3.3, 3.5_

- [x] 6. Create Contact page
  - Build Contact page with form and information
  - Implement form submission flow
  - Add success and error states
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6.1 Implement Contact page layout
  - Create `app/contact/page.tsx` with two-column layout (form + info)
  - Add page heading and description
  - Make layout responsive (stack on mobile)
  - _Requirements: 4.1_

- [x] 6.2 Add contact information section
  - Create `components/sections/ContactInfo.tsx` with consultation details
  - Add "What to expect" information
  - Include response time expectations
  - _Requirements: 4.1_
  - _Note: Information integrated directly into Contact page layout_

- [x] 6.3 Integrate contact form
  - Import and render ContactForm component
  - Handle form submission success with confirmation message
  - Handle form submission errors with user-friendly messages
  - Add loading state during submission
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 7. Create Privacy Policy page
  - Build Privacy Policy page with legal content
  - Add table of contents for navigation
  - Ensure readability and accessibility
  - _Requirements: 8.4_

- [x] 7.1 Implement Privacy Policy page
  - Create `app/privacy/page.tsx` with privacy policy content
  - Add table of contents with anchor links
  - Use clear headings and sections
  - Include contact information for privacy inquiries
  - _Requirements: 8.4, 9.1_

- [ ] 8. Implement responsive design
  - Ensure all components work across device sizes
  - Test and refine mobile, tablet, and desktop layouts
  - Optimize touch targets for mobile
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8.1 Implement mobile navigation
  - Add hamburger menu button for mobile screens
  - Create slide-in mobile menu with Framer Motion
  - Ensure menu closes on navigation or outside click
  - Add proper focus management and keyboard support
  - _Requirements: 5.2, 10.3_
  - _Note: Already implemented in Navigation component_

- [ ] 8.2 Test responsive layouts
  - Test all pages at breakpoints: 320px, 768px, 1024px, 1280px
  - Verify grid layouts collapse appropriately on mobile
  - Check typography scaling across screen sizes
  - Ensure images are responsive and optimized
  - _Requirements: 5.1, 5.3_

- [ ] 8.3 Optimize touch interactions
  - Ensure all buttons and links have minimum 44x44px touch targets
  - Add appropriate spacing between interactive elements
  - Test form inputs on mobile devices
  - _Requirements: 5.4_

- [ ] 9. Implement SEO optimization
  - Add meta tags and Open Graph data
  - Generate sitemap and robots.txt
  - Implement structured data
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 9.1 Add meta tags to all pages
  - Create `components/seo/PageMeta.tsx` component using next-seo
  - Add unique title, description, and keywords for each page
  - Add Open Graph tags for social media sharing
  - Add Twitter Card tags
  - _Requirements: 9.2, 9.4_

- [ ] 9.2 Implement structured data
  - Create `lib/seo/structured-data.ts` with JSON-LD schemas
  - Add Organization schema to homepage
  - Add WebPage schema to all pages
  - Inject structured data into page head
  - _Requirements: 9.1_

- [ ] 9.3 Generate sitemap and robots.txt
  - Create `app/sitemap.ts` to generate dynamic sitemap
  - Create `app/robots.ts` for robots.txt configuration
  - Ensure all public pages are included in sitemap
  - _Requirements: 9.3_

- [ ] 9.4 Add image alt text
  - Ensure all images have descriptive alt text
  - Use empty alt="" for decorative images
  - Add alt text to content JSON files
  - _Requirements: 9.5_

- [ ] 10. Implement accessibility features
  - Ensure WCAG 2.1 Level AA compliance
  - Add keyboard navigation support
  - Implement ARIA labels and roles
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 10.1 Implement keyboard navigation
  - Ensure all interactive elements are keyboard accessible
  - Add visible focus indicators to all focusable elements
  - Implement skip-to-content link at page top
  - Test tab order follows logical flow
  - _Requirements: 10.3, 10.5_

- [ ] 10.2 Add ARIA labels and roles
  - Add ARIA labels to icon-only buttons
  - Add ARIA live regions for dynamic content (form feedback)
  - Add ARIA attributes to form fields (aria-required, aria-invalid, aria-describedby)
  - Use semantic HTML with proper landmark regions
  - _Requirements: 10.4_

- [ ] 10.3 Verify color contrast
  - Test all text and UI elements meet 4.5:1 contrast ratio
  - Test large text meets 3:1 contrast ratio
  - Use browser DevTools or online tools to verify
  - Adjust colors if needed to meet requirements
  - _Requirements: 10.2_

- [ ]\* 10.4 Run accessibility audit
  - Run axe DevTools or Lighthouse accessibility audit
  - Fix any critical or serious accessibility issues
  - Test with screen reader (NVDA, JAWS, or VoiceOver)
  - _Requirements: 10.1_

- [ ] 11. Optimize performance
  - Implement image optimization
  - Minimize bundle sizes
  - Add caching strategies
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 11.1 Optimize images
  - Use Next.js Image component for all images
  - Provide appropriate sizes for different viewports
  - Implement lazy loading for below-the-fold images
  - Compress images to target <100KB per image
  - _Requirements: 7.3, 7.4_

- [ ] 11.2 Minimize JavaScript bundle
  - Remove unused dependencies
  - Use dynamic imports for heavy components
  - Configure Tailwind to purge unused CSS
  - Verify bundle size is under 200KB gzipped
  - _Requirements: 7.5_

- [ ] 11.3 Run performance audit
  - Run Lighthouse performance audit on all pages
  - Verify desktop score >90, mobile score >80
  - Check First Contentful Paint <1.5s
  - Check Time to Interactive <3.5s
  - _Requirements: 7.1, 7.2_

- [ ] 12. Set up deployment configuration
  - Configure Netlify deployment
  - Set up environment variables
  - Add security headers
  - _Requirements: 1.5_

- [ ] 12.1 Configure Netlify
  - Create or update `netlify.toml` with build configuration
  - Set build command to `npm run build` in frontend workspace
  - Set publish directory to `apps/frontend/out`
  - Add redirects for client-side routing
  - _Requirements: 1.5_

- [ ] 12.2 Set up environment variables
  - Add `NEXT_PUBLIC_SITE_URL` to Netlify environment
  - Add `NEXT_PUBLIC_CONTACT_EMAIL` for contact information
  - Add `RESEND_API_KEY` or email service API key
  - Create `.env.example` file documenting required variables
  - _Requirements: 6.4_

- [ ] 12.3 Add security headers
  - Configure security headers in `netlify.toml`
  - Add X-Frame-Options, X-Content-Type-Options, Referrer-Policy
  - Test headers are applied in production
  - _Requirements: 1.5_

- [ ] 12.3. Write tests for components and pages
  - Create unit tests for components
  - Add E2E tests for critical user flows
  - Test form validation and submission
  - _Requirements: 4.3, 4.4_

- [ ]\* 13.1 Write component unit tests
  - Create tests for Hero, Card, Button, Navigation, Footer components
  - Test component rendering with different props
  - Test accessibility with jest-axe
  - _Requirements: 10.1_

- [ ]\* 13.2 Write form tests
  - lidation with valid and invalid inputs
  - Test form submission success and error states
  - Test loading states and disabled buttons
  - _Requirements: 4.3, 4.4_

- [ ]\* 13.3 Write E2E tests
  - Crlaywright test for homepage user journey
  - Create test for contact form submission flow
  - Create test for navigation across pages
  - Add visual regression tests for key pages
  - _Requirements: 1.5, 4.4_

- [ ] 14. Populate content and final polish
  - Add all final content to JSON files
  - Review and refine copy
  - Add image visual assets
  - _Requirements: 6.1, 6.3_

- [ ] 14.1 Add final content
  - Populate `content/homepage.json` with final copy
  - Populate `content/about.json` with company story and philosophy
  - Add contact page content and consultation details
  - Add privacy policy content
  - _Requirements: 6.1, 6.3_

- [ ] 14.2 Add visual assets
  - Create or source hero background image
  - Create or source icons for problem and value cards
  - Add company logo to navigation
  - Optimize all images for web
  - _Requirements: 7.3, 9.5_

- [ ] 14.3 Final review and polish
  - Review all pages for consistency and quality
  - Check all links work correctly
  - Verify responsive design on real devices
  - Test form submission end-to-end
  - Fix any remaining issues
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

## Implementation Notes

### Task Execution Order

The tasks are designed to be executed in sequence, with each task building on previous work:

1. **Tasks 1-2**: Foundation (design system, components)
2. **Tasks 3-7**: Page implementation (forms, pages)
3. **Tasks 8-10**: Cross-cutting concerns (responsive, SEO, accessibility)
4. **Tasks 11-12**: Optimization and deployment
5. **Tasks 13-14**: Testing and polish

### Optional Tasks

Tasks marked with `*` are optional and focus on testing. While important for production quality, they can be skipped for a faster MVP if needed. However, at minimum:

- Task 10.4 (accessibility audit) is highly recommended
- Task 11.3 (performance audit) is highly recommended
- Task 13.3 (E2E tests for critical flows) is recommended

### Estimated Timeline

- **Week 1** (Tasks 1-7): Foundation, components, and core pages
- **Week 2** (Tasks 8-14): Responsive design, optimization, testing, and polish

### Dependencies

- **Email Service**: Task 3.3 requires an email service API key (Resend, SendGrid, or similar)
- **Content**: Tasks 14.1-14.2 require final content and images from stakeholders
- **Deployment**: Task 12 requires Netlify account and access

### Success Criteria

The implementation is complete when:

- ✅ All non-optional tasks are completed
- ✅ All pages are accessible and functional
- ✅ Lighthouse scores meet targets (Performance >90 desktop, >80 mobile)
- ✅ WCAG 2.1 Level AA compliance verified
- ✅ Contact form successfully sends emails
- ✅ Site is deployed and accessible at production URL
- ✅ All content is populated and reviewed
- ✅ Responsive design works on mobile, tablet, and desktop

## Phase 2 Enhancements (Future)

After Phase 1 MVP is complete and live, consider these enhancements:

- [ ] Add blog/news section with CMS integration
- [ ] Add testimonials carousel with Version 0 participant feedback
- [ ] Implement newsletter signup with email service integration
- [ ] Add more sophisticated animations and micro-interactions
- [ ] Integrate analytics (Google Analytics, Plausible, or similar)
- [ ] Add A/B testing framework for conversion optimization
- [ ] Create interactive demos or tools
- [ ] Add multi-language support (English translation)
- [ ] Implement advanced SEO features (blog post schema, FAQ schema)
- [ ] Add social media feed integration

Thents can be prioritized based on user feedback and business needs after
