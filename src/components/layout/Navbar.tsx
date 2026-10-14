import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { HiMenu, HiX } from 'react-icons/hi'
import { Container } from '@/components/common'
import logoImg from '@/assets/logo.jpeg'

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Bengali Menu items matching the screenshot
  const navLinks = [
    { name: 'হোম', to: '/' },
    { name: 'পার্সোনাল', to: '/personal' },
    { name: 'বিজনেস', to: '/business' },
    { name: 'প্যাকেজ', to: '/packages' },
    { name: 'ব্লগ', to: '/blog' },
    { name: 'যোগাযোগ', to: '/contact' },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md transition-colors shadow-xs">
      <Container className="flex h-20 items-center justify-between">
        {/* Left: Brand Logo */}
        <Link to="/" className="flex items-center group shrink-0">
          <img
            src={logoImg}
            alt="ক্যাশ বই"
            className="h-10 sm:h-11 w-auto object-contain transition-transform duration-200 group-hover:opacity-95"
          />
        </Link>

        {/* Center: Desktop Navigation via React Router NavLink */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-3 xl:gap-5">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--primary-color-light)] text-[var(--primary-color)] font-semibold'
                    : 'text-slate-700 hover:text-[var(--primary-color)] hover:bg-slate-50'
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>

        {/* Right: 2 Action Buttons via React Router Link */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {/* Button 1: ক্লায়েন্ট লগইন */}
          <Link
            to="/login"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2 lg:py-2.5 text-sm font-semibold text-slate-700 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)] transition-all duration-200 shadow-xs cursor-pointer"
          >
            লগইন
          </Link>

          {/* Button 2: ফ্রি ডাউনলোড */}
          <Link
            to="/download"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] px-4 py-2 lg:py-2.5 text-sm font-semibold text-white shadow-sm shadow-[var(--primary-color)]/20 border border-[var(--primary-color-dark)] transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            ফ্রি ডাউনলোড
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 md:hidden cursor-pointer"
        >
          {mobileMenuOpen ? <HiX className="h-6 w-6" /> : <HiMenu className="h-6 w-6" />}
        </button>
      </Container>

      {/* Mobile Dropdown Menu via React Router NavLink */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 shadow-lg">
          <nav className="flex flex-col space-y-1.5">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `px-4 py-2.5 rounded-xl text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--primary-color-light)] text-[var(--primary-color)] font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}
          </nav>

          {/* Mobile Buttons via React Router Link */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-100">
            <Link
              to="/login"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              লগইন
            </Link>
            <Link
              to="/download"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center rounded-lg bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              ফ্রি ডাউনলোড
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
