import React from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

/**
 * OptimizedImage component that serves WebP/AVIF with fallbacks
 * Automatically generates source paths for different formats
 */
export function OptimizedImage({ src, alt, width, height, className = '', priority = false }: OptimizedImageProps) {
  // Extract base path without extension
  const basePath = src.replace(/\.(jpg|jpeg|png)$/i, '');
  const extension = src.match(/\.(jpg|jpeg|png)$/i)?.[0] || '.jpg';

  return (
    <picture>
      {/* AVIF format - best compression */}
      <source srcSet={`${basePath}.avif`} type="image/avif" />

      {/* WebP format - good compression, wide support */}
      <source srcSet={`${basePath}.webp`} type="image/webp" />

      {/* Fallback to original format */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
      />
    </picture>
  );
}
