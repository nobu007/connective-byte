'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Container } from '@/components/layout/Container';
import { ProblemCard } from '@/components/ui/ProblemCard';
import type { ProblemCard as ProblemCardType } from '@/types/content';

interface ProblemStatementProps {
  title: string;
  problems: ProblemCardType[];
}

export function ProblemStatement({ title, problems }: ProblemStatementProps) {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <section className="py-20 bg-[#f9fafb]" aria-labelledby="problems-heading">
      <Container>
        <motion.h2
          id="problems-heading"
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
          {problems.map((problem, index) => (
            <ProblemCard key={index} {...problem} index={index} />
          ))}
        </div>
      </Container>
    </section>
  );
}
