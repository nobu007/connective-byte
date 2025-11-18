'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import { useTrackEvent } from '@/lib/analytics/useTrackEvent';
import type { CTASection as CTASectionType } from '@/types/content';

interface CTASectionProps extends CTASectionType {
  variant?: 'default' | 'gradient' | 'minimal';
}

export function CTASection({ headline, description, steps, ctaText, ctaLink, variant = 'gradient' }: CTASectionProps) {
  const trackEvent = useTrackEvent();

  const handleCTAClick = () => {
    trackEvent('CTA Click', { location: 'final-cta' });
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <section
      className={`py-20 ${
        variant === 'gradient'
          ? 'bg-gradient-to-r from-[#f97316] to-[#a855f7]'
          : variant === 'default'
            ? 'bg-[#1e3a8a]'
            : 'bg-[#f3f4f6]'
      }`}
      aria-labelledby="cta-heading"
    >
      <Container maxWidth="md">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          variants={{
            animate: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="text-center"
        >
          <motion.h2
            id="cta-heading"
            variants={fadeInUp}
            className={`text-3xl sm:text-4xl font-bold mb-6 ${variant === 'minimal' ? 'text-[#111827]' : 'text-white'}`}
          >
            {headline}
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className={`text-lg mb-12 leading-relaxed ${variant === 'minimal' ? 'text-[#4b5563]' : 'text-white/90'}`}
          >
            {description}
          </motion.p>

          {/* Steps */}
          <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`p-6 rounded-lg ${
                  variant === 'minimal' ? 'bg-white shadow-md' : 'bg-white/10 backdrop-blur-sm'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold ${
                    variant === 'minimal' ? 'bg-[#10b981] text-white' : 'bg-white text-[#f97316]'
                  }`}
                >
                  {index + 1}
                </div>
                <p className={`font-medium ${variant === 'minimal' ? 'text-[#111827]' : 'text-white'}`}>{step}</p>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Button
              href={ctaLink}
              variant={variant === 'minimal' ? 'primary' : 'secondary'}
              size="lg"
              className={variant === 'minimal' ? '' : 'bg-white text-[#f97316] hover:bg-white/90'}
              onClick={handleCTAClick}
            >
              {ctaText}
            </Button>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
