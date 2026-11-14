'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { siteConfig } from '@/content/site-config';
import { useAuth } from '@/components/auth/AuthProvider';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { status, user, logout } = useAuth();
  // セッション復元中は何も出さない（ログイン↔アカウント表示のちらつき防止）
  const showAuthSlot = status !== 'loading';

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

  // trailingSlash: true (next.config) renders /about as /about/ in pathname,
  // so compare with and without the trailing slash (home excepted)
  const isActive = (href: string) => pathname === href || (href !== '/' && pathname === `${href}/`);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-sm'
      }`}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Image
              src="/images/logo.svg"
              alt={siteConfig.name}
              width={180}
              height={40}
              priority
              className="h-8 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <ul className="hidden md:flex items-center space-x-8" role="list">
            {siteConfig.navigation.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-[#10b981] ${
                    isActive(item.href) ? 'text-[#10b981]' : 'text-[#4b5563]'
                  }`}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>

          {/* Auth Slot (Desktop) */}
          <div className="hidden md:flex items-center space-x-4 ml-8">
            {!showAuthSlot ? null : status === 'authenticated' && user ? (
              <>
                <Link
                  href="/mypage/"
                  className={`text-sm font-medium transition-colors hover:text-[#10b981] ${
                    isActive('/mypage') ? 'text-[#10b981]' : 'text-[#4b5563]'
                  }`}
                >
                  マイページ
                </Link>
                <button
                  onClick={() => void logout()}
                  className="inline-flex items-center text-sm font-medium text-[#4b5563] hover:text-[#10b981] transition-colors"
                >
                  <LogOut size={14} className="mr-1" />
                  ログアウト
                </button>
              </>
            ) : (
              <Link
                href="/login/"
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#10b981] text-white hover:bg-[#059669] transition-colors"
              >
                ログイン
              </Link>
            )}
          </div>

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
                          isActive(item.href) ? 'bg-[#10b981]/10 text-[#10b981]' : 'text-[#4b5563] hover:bg-[#f3f4f6]'
                        }`}
                        aria-current={isActive(item.href) ? 'page' : undefined}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}

                  {showAuthSlot &&
                    (status === 'authenticated' && user ? (
                      <>
                        <li className="border-t border-gray-200 pt-4">
                          <Link
                            href="/mypage/"
                            onClick={closeMenu}
                            className={`block px-4 py-2 text-base font-medium rounded-lg transition-colors ${
                              isActive('/mypage')
                                ? 'bg-[#10b981]/10 text-[#10b981]'
                                : 'text-[#4b5563] hover:bg-[#f3f4f6]'
                            }`}
                          >
                            マイページ
                          </Link>
                        </li>
                        <li>
                          <button
                            onClick={() => {
                              closeMenu();
                              void logout();
                            }}
                            className="flex items-center w-full px-4 py-2 text-base font-medium rounded-lg text-[#4b5563] hover:bg-[#f3f4f6] transition-colors"
                          >
                            <LogOut size={16} className="mr-2" />
                            ログアウト
                          </button>
                        </li>
                      </>
                    ) : (
                      <li className="border-t border-gray-200 pt-4">
                        <Link
                          href="/login/"
                          onClick={closeMenu}
                          className="block text-center px-4 py-2 text-base font-semibold rounded-lg bg-[#10b981] text-white hover:bg-[#059669] transition-colors"
                        >
                          ログイン
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
