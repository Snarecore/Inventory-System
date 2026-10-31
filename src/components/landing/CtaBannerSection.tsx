import React from 'react'
import { Link } from 'react-router-dom'
import { Container, Button } from '@/components/common'
import { HiOutlineArrowNarrowRight } from 'react-icons/hi'

export const CtaBannerSection: React.FC = () => {
  return (
    <Container as="section" id="get-started" className="scroll-mt-28">
      <div
        id="contact"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-from via-primary to-brand-to px-6 py-14 sm:px-12 sm:py-20 text-white shadow-xl shadow-primary/20 text-center"
      >
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            ক্যাশ বই দিয়ে আপনার হিসাব রাখুন নির্ভুল
          </h2>
          <p className="text-sm sm:text-base text-white/90 leading-relaxed font-normal">
            সহজ, দ্রুত এবং সম্পূর্ণ নিরাপদ ডিজিটাল ক্যাশ হিসাব খাতা। এখনই শুরু করুন।
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <Link to="/download">
              <Button
                size="lg"
                className="bg-[var(--ui-surface)] text-[var(--ui-text)] hover:bg-[var(--ui-surface-sunken)] shadow-lg font-semibold"
                icon={<HiOutlineArrowNarrowRight />}
              >
                ফ্রি ডাউনলোড করুন
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Container>
  )
}
