import React from 'react'
import { Container } from '@/components/common'
import {
  HiOutlineDocumentText,
  HiOutlineCalculator,
  HiOutlineCube,
  HiOutlineUserGroup,
  HiOutlineChartBar,
  HiOutlineShieldCheck,
  HiOutlineTrendingUp,
  HiOutlineHome,
  HiOutlineShoppingCart,
  HiOutlineClipboardList,
  HiOutlineCog,
} from 'react-icons/hi'
import type { FeatureItem } from '@/types'

const features: FeatureItem[] = [
  {
    title: 'বিক্রয় ও ক্রয় ব্যবস্থাপনা',
    description: 'ইনভয়েস তৈরি, ক্রয় ও সরবরাহকারীর তথ্য সংরক্ষণ।',
    icon: HiOutlineDocumentText,
  },
  {
    title: 'খরচ ও আয় হিসাব',
    description: 'সব ধরনের খরচ ও আয়ের রেকর্ড রাখুন।',
    icon: HiOutlineCalculator,
  },
  {
    title: 'স্টক ও ইনভেন্টরি',
    description: 'পণ্যের পরিমাণ ও স্টক নিয়ন্ত্রণ সহজে করুন।',
    icon: HiOutlineCube,
  },
  {
    title: 'কাস্টমার ও সাপ্লায়ার ম্যানেজমেন্ট',
    description: 'গ্রাহক ও সরবরাহকারীর তথ্য সংরক্ষণ ও পরিচালনা করুন।',
    icon: HiOutlineUserGroup,
  },
  {
    title: 'রিপোর্ট ও বিশ্লেষণ',
    description: 'বিক্রয়, আয়-ব্যয় ও অন্যান্য রিপোর্ট দেখুন সহজে।',
    icon: HiOutlineChartBar,
  },
  {
    title: 'নিরাপদ ও সুরক্ষিত',
    description: 'আপনার ডেটা সর্বদা নিরাপদ, নিয়মিত ব্যাকআপ সুবিধা।',
    icon: HiOutlineShieldCheck,
  },
]

// Mock data for sales summary chart with increasing trend
const chartBars = [
  { height: '20%', active: false },
  { height: '28%', active: false },
  { height: '24%', active: false },
  { height: '38%', active: false },
  { height: '32%', active: false },
  { height: '50%', active: false },
  { height: '45%', active: false },
  { height: '62%', active: false },
  { height: '56%', active: false },
  { height: '72%', active: false },
  { height: '66%', active: false },
  { height: '82%', active: false },
  { height: '76%', active: false },
  { height: '90%', active: false },
  { height: '85%', active: false },
  { height: '100%', active: true },
]

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="relative py-4 sm:py-8 overflow-hidden scroll-mt-24">
      {/* Ambient background decoration matching banner theme */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-[#f4f9fd] via-[#e6f4fe]/60 to-transparent blur-3xl pointer-events-none -z-10" />

      <Container className="space-y-10 sm:space-y-14">
        {/* Top Header & Visual Mockup Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Heading & Description */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-5 text-left">
            {/* Badge matching banner badge */}
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#e6f4fe] px-3.5 py-1 text-xs font-semibold text-[#009fe3] border border-sky-200/80 shadow-xs">
              <span>কেন ক্যাশ বই?</span>
            </div>

            {/* Main Title matching Banner heading typography */}
            <h2 className="text-2xl sm:text-3xl lg:text-[40px] font-extrabold text-[#0d2a4a] leading-[1.25] tracking-tight">
              আপনার ব্যবসার হিসাবের{' '}
              <span className="text-[#009fe3] block sm:inline">
                সব কিছু এক জায়গায়
              </span>
            </h2>

            {/* Subtitle / Description */}
            <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
              ইনভয়েস, বিক্রয়, ক্রয়, স্টক, নগদ, ব্যাংক, বকেয়া - সবকিছু সহজে পরিচালনা করুন ক্যাশ বই-এর মাধ্যমে।
            </p>
          </div>

          {/* Right Column: Dashboard Mockup Card matching banner colors */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl bg-white border border-sky-100 p-4 sm:p-5 shadow-md shadow-sky-100/60">
              {/* Card Inner Grid with mini-sidebar & main dashboard */}
              <div className="flex gap-3 sm:gap-4">
                {/* Mini Left Sidebar */}
                <div className="flex flex-col items-center justify-between py-2.5 px-1.5 rounded-xl bg-[#f8fbfe] border border-sky-100/80 text-slate-400 gap-3">
                  <div className="w-6 h-6 rounded-md bg-[#e6f4fe] text-[#009fe3] flex items-center justify-center">
                    <HiOutlineHome className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400">
                    <HiOutlineShoppingCart className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400">
                    <HiOutlineClipboardList className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400">
                    <HiOutlineChartBar className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400">
                    <HiOutlineCog className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 space-y-3.5">
                  {/* Top Header of the Widget */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#0d2a4a]">
                        বিক্রয় সারাংশ
                      </h4>
                      <p className="text-[10px] sm:text-xs text-slate-400">
                        সর্বশেষ আপডেট: আজ
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold bg-[#e6f4fe] text-[#009fe3] border border-sky-200/80">
                      গত ৩০ দিন
                    </span>
                  </div>

                  {/* Summary Value & Growth */}
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-xl sm:text-2xl font-extrabold text-[#0d2a4a] tracking-tight">
                        ৳ ৯,২৬,০০০
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-0.5">
                        <HiOutlineTrendingUp className="w-3.5 h-3.5" />
                        <span>+১৮.৪% পূর্বের মাসের তুলনায়</span>
                      </div>
                    </div>
                  </div>

                  {/* Bar Chart Visual */}
                  <div className="relative pt-2">
                    {/* Background faint guide lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                      <div className="border-b border-dashed border-slate-200 w-full" />
                      <div className="border-b border-dashed border-slate-200 w-full" />
                      <div className="border-b border-dashed border-slate-200 w-full" />
                    </div>

                    {/* Bars Container */}
                    <div className="relative h-28 sm:h-32 flex items-end justify-between gap-1 sm:gap-1.5 px-1">
                      {chartBars.map((bar, index) => (
                        <div
                          key={index}
                          className="flex-1 flex flex-col items-center justify-end h-full"
                        >
                          <div
                            style={{ height: bar.height }}
                            className={`w-full rounded-t-[3px] ${
                              bar.active
                                ? 'bg-[#154674]'
                                : 'bg-[#009fe3]'
                            }`}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Horizontal Axis bottom line */}
                    <div className="border-t border-slate-200 mt-1.5 flex justify-between text-[9px] sm:text-[10px] text-slate-400 pt-1 font-medium">
                      <span>১ তারিখ</span>
                      <span>১৫ তারিখ</span>
                      <span>৩০ তারিখ</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Feature Cards Grid */}
        {/* Note: In each card, the icon and title are placed side by side as requested */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {features.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="group bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-lg hover:shadow-sky-100/70 hover:border-[#009fe3]/60 transition-all duration-200 flex flex-col justify-start"
              >
                {/* Icon & Title Side-by-Side Row */}
                <div className="flex items-center gap-3.5 sm:gap-4 mb-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#e0f2fe] text-[#009fe3] border border-sky-100 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-[#009fe3] group-hover:text-white transition-all duration-200 shadow-xs">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="font-bold text-[#0d2a4a] text-base sm:text-[17px] group-hover:text-[#154674] transition-colors leading-snug">
                    {item.title}
                  </h3>
                </div>

                {/* Description below the icon+title header */}
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
