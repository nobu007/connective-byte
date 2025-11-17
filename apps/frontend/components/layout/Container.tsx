import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const maxWidthClasses = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-[1400px]',
  full: 'max-w-full',
};

export function Container({ children, className = '', maxWidth = 'lg' }: ContainerProps) {
  return <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${maxWidthClasses[maxWidth]} ${className}`}>{children}</div>;
}
