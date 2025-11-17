'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import { ValueCard } from '@/components/ui/ValueCard';
import type { ValueCard as ValueCardType } from '@/types/content';

interface ValuePropositionsProps {
  title: string;
  values: ValueCardType[];
}

export function ValuePropositions({ title, values }: ValuePropositionsProps) {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <section className="py-20 bg-white" aria-labelledby="values-heading">
      <Container>
        <motion.h2
          id="values-heading"
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl font-bold text-center text-[#111827] mb-12"
        >
          {title}
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <ValueCard key={value.id} {...value} index={index} />
          ))}
        </div>
      </Container>
    </section>
  );
}
