import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Container } from '@/components/common'
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineArrowNarrowRight, HiOutlinePlay, HiOutlineUsers, HiOutlineShieldCheck, HiOutlineStar, HiOutlineSupport, HiOutlineCheckCircle } from 'react-icons/hi'

// Banner images placeholder references
import bannerOne from '@/assets/bannerOne.webp'
import bannerTwo from '@/assets/bannerTwo.svg'
import bannerThree from '@/assets/bannerThree.svg'

export interface BannerSlide {
  id: number
  badge: string
  titleLine1: string
  titleLine2: string
  titleHighlight: string
  description: string
  primaryBtnText: string
  primaryBtnTo: string
  secondaryBtnText: string
  secondaryBtnTo: string
  image: string
  imageAlt: string
}

const slides: BannerSlide[] = [
  {
    id: 1,
    badge: 'বাংলাদেশের ছোট ব্যবসার জন্য',
    titleLine1: 'সহজ হিসাব',
    titleLine2: 'স্মার্ট ব্যবস্থাপনা',
    titleHighlight: 'ক্যাশ বই',
    description:
      'আপনার ব্যবসার সব ধরনের লেনদেন, আয়-ব্যয়, বকেয়া এবং রিপোর্ট এখন এক প্ল্যাটফর্মে। সহজে হিসাব রাখুন, ব্যবসা বাড়ান।',
    primaryBtnText: 'এখনই শুরু করুন',
    primaryBtnTo: '/download',
    secondaryBtnText: 'ডেমো দেখুন',
    secondaryBtnTo: '/demo',
    image: bannerOne,
    imageAlt: 'ক্যাশ বই সফটওয়্যার ড্যাশবোর্ড ও মোবাইল অ্যাপ',
  },
  {
    id: 2,
    badge: 'স্বয়ংক্রিয় বকেয়া খাতা ও এসএমএস',
    titleLine1: 'বাকি খাতা',
    titleLine2: 'স্বয়ংক্রিয় রিমাইন্ডার',
    titleHighlight: 'তাগাদা মেসেজ',
    description:
      'কাস্টমারদের কাছে বকেয়া আদায়ের স্বয়ংক্রিয় SMS তাগাদা পাঠান। হিসাব রাখুন নির্ভুল এবং বাকি আদায় করুন ৩ গুণ দ্রুত।',
    primaryBtnText: 'ফ্রি ডাউনলোড',
    primaryBtnTo: '/download',
    secondaryBtnText: 'প্যাকেজ দেখুন',
    secondaryBtnTo: '/packages',
    image: bannerTwo,
    imageAlt: 'ক্যাশ বই বকেয়া আদায় ও SMS রিমাইন্ডার',
  },
  {
    id: 3,
    badge: 'ব্যবসায়িক লাভ-ক্ষতির পূর্ণাঙ্গ রিপোর্ট',
    titleLine1: 'লাভ-ক্ষতি',
    titleLine2: 'সঠিক অ্যানালিটিক্স',
    titleHighlight: 'PDF রিপোর্ট',
    description:
      'প্রতিদিনের ক্যাশ ব্যালেন্স, মাসিক আয়-ব্যয় এবং লাভ-ক্ষতির নিখুঁত হিসাব এক ক্লিকে ডাউনলোড করুন এবং সঠিক সিদ্ধান্ত নিন।',
    primaryBtnText: 'রেজিস্ট্রেশন করুন',
    primaryBtnTo: '/login',
    secondaryBtnText: 'যোগাযোগ করুন',
    secondaryBtnTo: '/contact',
    image: bannerThree,
    imageAlt: 'ক্যাশ বই অ্যানালিটিক্স ও লাভ ক্ষতির হিসাব',
  },
]

const trustStats = [
  {
    icon: HiOutlineUsers,
    value: '10,000+',
    label: 'সন্তুষ্ট ব্যবহারকারী',
  },
  {
    icon: HiOutlineShieldCheck,
    value: '99.9%',
    label: 'নির্ভরযোগ্য',
  },
  {
    icon: HiOutlineStar,
    value: '4.8★',
    label: 'গড় রেটিং',
  },
  {
    icon: HiOutlineSupport,
    value: '24/7',
    label: 'সাপোর্ট',
  },
]

export const HeroSlider: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }, [])

  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      nextSlide()
    }, 6000)
    return () => clearInterval(timer)
  }, [isPaused, nextSlide])

  const slide = slides[currentSlide]

  return (
    <Container as="section">
      {/* Main Banner Card */}
      <div
        className="relative overflow-hidden rounded-2xl bg-[var(--primary-color-light)] border border-[var(--primary-color-muted)]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Soft Background Tint */}
        <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-bl from-[var(--primary-color-muted)]/50 via-[var(--primary-color-light)]/20 to-transparent pointer-events-none" />

        {/* Floating Tag Top-Right */}
        <div className="absolute top-5 right-6 hidden md:flex items-center gap-2 text-xs font-semibold text-[var(--primary-color-dark)] bg-[var(--ui-surface)] px-3.5 py-1.5 rounded-lg border border-[var(--ui-border)]">
          <HiOutlineCheckCircle className="h-4 w-4 text-[var(--primary-color)]" />
          <span>সব হিসাব এক জায়গায়</span>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 px-6 pt-10 pb-6 sm:px-10 sm:pt-12 sm:pb-8 lg:pt-14 lg:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Text & CTAs */}
            <div className="lg:col-span-6 space-y-5 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-color-light)] px-3.5 py-1 text-xs font-semibold text-[var(--primary-color)] border border-[var(--primary-color-muted)]/80">
                <span>{slide.badge}</span>
              </div>

              {/* Headings */}
              <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold tracking-tight text-[var(--primary-color-dark)] leading-[1.25]">
                {slide.titleLine1} 
                {slide.titleLine2} <br />
                <span className="text-[var(--primary-color)]">{slide.titleHighlight}</span>
              </h1>

              {/* Description */}
              <p className="text-sm sm:text-base text-[var(--ui-text-muted)] max-w-xl leading-relaxed">
                {slide.description}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {/* Primary Button */}
                <Link
                  to={slide.primaryBtnTo}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] text-white px-4 py-2.5 text-sm font-semibold border border-[var(--primary-color)] transition-colors cursor-pointer"
                >
                  <span>{slide.primaryBtnText}</span>
                  <HiOutlineArrowNarrowRight className="h-4 w-4" />
                </Link>

                {/* Secondary Button */}
                <Link
                  to={slide.secondaryBtnTo}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--primary-color)] text-[var(--primary-color)] bg-[var(--ui-surface)] hover:bg-[var(--primary-color-light)] px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
                >
                  <span>{slide.secondaryBtnText}</span>
                  <HiOutlinePlay className="h-3.5 w-3.5 fill-current" />
                </Link>
              </div>
            </div>

            {/* Right Column: Slide Mockup Image with Compact Bottom-Right Arrows */}
            <div className="lg:col-span-6 flex flex-col justify-center items-center relative">
              <div className="w-full max-w-lg lg:max-w-none">
                <img
                  src={slide.image}
                  alt={slide.imageAlt}
                  className="w-full h-auto max-h-[350px] object-contain"
                />
              </div>

              {/* Compact Arrow Buttons positioned at the bottom right */}
              <div className="w-full flex justify-end items-center gap-1.5 pt-2">
                <button
                  onClick={prevSlide}
                  aria-label="Previous Slide"
                  className="h-7 w-7 rounded-lg bg-[var(--ui-surface)] border border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:text-[var(--primary-color)] hover:border-[var(--primary-color-muted)] flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                >
                  <HiOutlineChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={nextSlide}
                  aria-label="Next Slide"
                  className="h-7 w-7 rounded-lg bg-[var(--ui-surface)] border border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:text-[var(--primary-color)] hover:border-[var(--primary-color-muted)] flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                >
                  <HiOutlineChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Stats Bar with Vertical Divider Lines */}
        <div className="relative z-10 border-t border-[var(--primary-color-muted)] bg-[var(--ui-surface)] px-6 py-5 sm:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--ui-border)]">
            {trustStats.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3.5 py-3 md:py-0 ${
                    idx > 0 ? 'md:pl-6 lg:pl-8' : ''
                  } ${idx % 2 === 1 ? 'pl-4 md:pl-6 lg:pl-8' : ''}`}
                >
                  <div className="h-10 w-10 rounded-xl bg-[var(--primary-color-light)] text-[var(--primary-color)] flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-bold text-[var(--primary-color-dark)] leading-tight">
                      {item.value}
                    </div>
                    <div className="text-xs text-[var(--ui-text-muted)] font-medium">
                      {item.label}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Container>
  )
}
