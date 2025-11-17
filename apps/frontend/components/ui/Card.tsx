import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = true }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-lg shadow-md p-6
        ${hover ? 'transition-all duration-300 hover:shadow-xl hover:-translate-y-1' : ''}
        ${className}
      `
        .trim()
        .replace(/\s+/g, ' ')}
    >
      {children}
    </div>
  );
}
