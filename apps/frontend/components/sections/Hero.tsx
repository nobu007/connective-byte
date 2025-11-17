'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import type { HeroContent } from '@/types/content';

interface HeroProps extends HeroContent {
  variant?: 'default' | 'minimal' | 'gradient';
}

export function Hero({ headline, subheadline, ctaText, ctaLink, variant = 'gradient' }: HeroProps) {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <section
      className={`relative min-h-[90vh] flex items-center justify-center pt-16 ${
        variant === 'gradient' ? 'bg-gradient-to-br from-[#1e3a8a] via-[#1e3a8a] to-[#10b981]' : 'bg-[#1e3a8a]'
      }`}
      aria-labelledby="hero-heading"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <Container className="relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <motion.h1
            id="hero-heading"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight"
          >
            {headline}
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl sm:text-2xl text-white/90 mb-8 leading-relaxed"
          >
            {subheadline}
          </motion.p>

          <motion.div
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Button href={ctaLink} size="lg">
              {ctaText}
            </Button>
          </motion.div>
        </div>
      </Container>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2"
        >
          <div className="w-1 h-2 bg-white/50 rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
}
