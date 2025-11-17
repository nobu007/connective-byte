'use client';

import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Card } from './Card';
import type { ProblemCard as ProblemCardType } from '@/types/content';

interface ProblemCardProps extends ProblemCardType {
  index: number;
}

export function ProblemCard({ icon, title, description, index }: ProblemCardProps) {
  const IconComponent = Icons[icon as keyof typeof Icons] as React.ComponentType<{ size?: number; className?: string }>;

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#ef4444]/10 flex items-center justify-center mb-4">
            {IconComponent && <IconComponent size={32} className="text-[#ef4444]" />}
          </div>
          <h3 className="text-xl font-bold text-[#111827] mb-3">{title}</h3>
          <p className="text-[#4b5563] leading-relaxed">{description}</p>
        </div>
      </Card>
    </motion.div>
  );
}
