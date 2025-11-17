import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
}

const variantClasses = {
  primary: 'bg-[#f97316] text-white hover:bg-[#ea580c] shadow-lg hover:shadow-xl',
  secondary: 'bg-[#10b981] text-white hover:bg-[#059669] shadow-lg hover:shadow-xl',
  outline: 'border-2 border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white',
};

const sizeClasses = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export function Button({
  children,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ariaLabel,
}: ButtonProps) {
  const baseClasses = `
    inline-flex items-center justify-center
    font-semibold rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#10b981]
    disabled:opacity-50 disabled:cursor-not-allowed
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${className}
  `
    .trim()
    .replace(/\s+/g, ' ');

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: disabled ? 1 : 1.05 },
    tap: { scale: disabled ? 1 : 0.95 },
  };

  if (href && !disabled) {
    return (
      <motion.div variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap" className="inline-block">
        <Link href={href} className={baseClasses} aria-label={ariaLabel}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      variants={buttonVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
      aria-label={ariaLabel}
    >
      {children}
    </motion.button>
  );
}
