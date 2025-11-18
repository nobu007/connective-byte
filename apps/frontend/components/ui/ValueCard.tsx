'use client';

import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { Check } from 'lucide-react';
import { Card } from './Card';
import { useTrackEvent } from '@/lib/analytics/useTrackEvent';
import type { ValueCard as ValueCardType } from '@/types/content';

interface ValueCardProps extends ValueCardType {
  index: number;
}

const colorClasses: Record<string, { bg: string; icon: string; border: string; text: string }> = {
  blue: {
    bg: 'bg-[#1e3a8a]/10',
    icon: 'text-[#1e3a8a]',
    border: 'border-[#1e3a8a]',
    text: 'text-[#1e3a8a]',
  },
  green: {
    bg: 'bg-[#10b981]/10',
    icon: 'text-[#10b981]',
    border: 'border-[#10b981]',
    text: 'text-[#10b981]',
  },
  orange: {
    bg: 'bg-[#f97316]/10',
    icon: 'text-[#f97316]',
    border: 'border-[#f97316]',
    text: 'text-[#f97316]',
  },
};

export function ValueCard({ icon, title, subtitle, description, benefits, color, index }: ValueCardProps) {
  const trackEvent = useTrackEvent();
  const IconComponent = Icons[icon as keyof typeof Icons] as React.ComponentType<{ size?: number; className?: string }>;
  const colors = colorClasses[color];

  const handleCardClick = () => {
    trackEvent('Value Card Click', { card: title });
  };

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
      onClick={handleCardClick}
      className="cursor-pointer"
    >
      <Card className={`border-t-4 ${colors.border} h-full`}>
        <div className="flex flex-col h-full">
          <div className={`w-16 h-16 rounded-full ${colors.bg} flex items-center justify-center mb-4`}>
            {IconComponent && <IconComponent size={32} className={colors.icon} />}
          </div>

          <h3 className={`text-2xl font-bold mb-2 ${colors.text}`}>{title}</h3>
          <p className="text-lg font-semibold text-[#111827] mb-3">{subtitle}</p>
          <p className="text-[#4b5563] leading-relaxed mb-6">{description}</p>

          <ul className="space-y-2 mt-auto" role="list">
            {benefits.map((benefit, idx) => (
              <li key={idx} className="flex items-start">
                <Check size={20} className={`${colors.icon} mr-2 flex-shrink-0 mt-0.5`} />
                <span className="text-[#4b5563]">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </motion.div>
  );
}
