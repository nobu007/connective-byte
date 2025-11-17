'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { siteConfig } from '@/content/site-config';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-sm'
      }`}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-[#1e3a8a] hover:text-[#10b981] transition-colors">
            {siteConfig.name}
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden md:flex items-center space-x-8" role="list">
            {siteConfig.navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-[#10b981] ${
                    pathname === item.href ? 'text-[#10b981]' : 'text-[#4b5563]'
                  }`}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-[#4b5563] hover:text-[#10b981] transition-colors"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeMenu}
                className="fixed inset-0 bg-black/50 md:hidden"
                style={{ top: '64px' }}
              />

              {/* Menu */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="fixed right-0 top-16 bottom-0 w-64 bg-white shadow-xl md:hidden"
              >
                <ul className="flex flex-col p-4 space-y-4" role="list">
                  {siteConfig.navigation.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={closeMenu}
                        className={`block px-4 py-2 text-base font-medium rounded-lg transition-colors ${
                          pathname === item.href
                            ? 'bg-[#10b981]/10 text-[#10b981]'
                            : 'text-[#4b5563] hover:bg-[#f3f4f6]'
                        }`}
                        aria-current={pathname === item.href ? 'page' : undefined}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
