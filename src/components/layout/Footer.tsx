import React from 'react'
import { Link } from 'react-router-dom'
import { Container } from '@/components/common'
import logoImg from '@/assets/logo.jpeg'

const currentYear = new Date().getFullYear()

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200/90 bg-white py-12 transition-colors">
      <Container className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="ক্যাশ বই"
            className="h-9 w-auto object-contain"
          />
        </Link>

        {/* Links via React Router Link */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-600">
          <Link to="/" className="hover:text-primary transition-colors">
            হোম
          </Link>
          <Link to="/personal" className="hover:text-primary transition-colors">
            পার্সোনাল
          </Link>
          <Link to="/business" className="hover:text-primary transition-colors">
            বিজনেস
          </Link>
          <Link to="/packages" className="hover:text-primary transition-colors">
            প্যাকেজ
          </Link>
          <Link to="/blog" className="hover:text-primary transition-colors">
            ব্লগ
          </Link>
          <Link to="/contact" className="hover:text-primary transition-colors">
            যোগাযোগ
          </Link>
        </div>

        {/* Copyright */}
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <span>© {currentYear} ক্যাশ বই। সর্বস্বত্ব সংরক্ষিত।</span>
        </div>
      </Container>
    </footer>
  )
}
