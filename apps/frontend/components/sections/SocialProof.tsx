'use client';

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import type { SocialProof as SocialProofType } from '@/types/content';

interface SocialProofProps extends SocialProofType {}

export function SocialProof({ participantCount, programName, badge, description }: SocialProofProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    const controls = animate(count, participantCount, {
      duration: 2,
      ease: 'easeOut',
    });

    const unsubscribe = rounded.on('change', (latest) => {
      setDisplayCount(latest);
    });

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [participantCount, count, rounded]);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <section className="py-16 bg-white" aria-labelledby="social-proof-heading">
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
          <motion.div
            variants={fadeInUp}
            className="inline-block bg-gradient-to-r from-[#f97316] to-[#a855f7] text-white px-6 py-2 rounded-full text-sm font-semibold mb-8"
          >
            {badge}
          </motion.div>

          <motion.h2
            id="social-proof-heading"
            variants={fadeInUp}
            className="text-3xl sm:text-4xl font-bold text-[#111827] mb-4"
          >
            {programName}
          </motion.h2>

          <motion.div variants={fadeInUp} className="mb-6">
            <div className="text-6xl sm:text-7xl font-bold text-[#10b981] mb-2">
              {displayCount}
              <span className="text-3xl sm:text-4xl ml-2">名</span>
            </div>
            <p className="text-[#4b5563] text-lg">が参加しています</p>
          </motion.div>

          <motion.p variants={fadeInUp} className="text-[#4b5563] leading-relaxed max-w-2xl mx-auto">
            {description}
          </motion.p>
        </motion.div>
      </Container>
    </section>
  );
}
