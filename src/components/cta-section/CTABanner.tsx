import { MotionDiv } from '@/utils/framer.motion'
import React from 'react'

const CTABanner = () => {
  return (
      <section className="py-20 bg-[var(--ui-text)] text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <MotionDiv>
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              Providing online education &<br />
              career consultancy
            </h2>
          </MotionDiv>
          <MotionDiv className="flex justify-center mb-8">
            <div className="flex space-x-3">
              <div className="w-8 h-8 bg-[var(--ui-danger)] rounded-full"></div>
              <div className="w-8 h-8 bg-[var(--ui-warning)] rounded-full"></div>
              <div className="w-8 h-8 bg-[var(--ui-success)] rounded-full"></div>
              <div className="w-8 h-8 bg-[var(--primary-color)] rounded-full"></div>
            </div>
          </MotionDiv>
          <MotionDiv>
            <button className="bg-[var(--secondary-color)] hover:bg-[var(--secondary-color-light)] text-white px-8 py-4 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 shadow-lg">
              Apply For Meeting →
            </button>
          </MotionDiv>
        </div>
      </section>
  )
}

export default CTABanner