import React from 'react'
import {
  HeroSlider,
  FeaturesSection,
} from '@/components/landing'

export const Home: React.FC = () => {
  return (
    <div className="space-y-12 sm:space-y-16 py-4 sm:py-8">
      <HeroSlider />
      <FeaturesSection />
    </div>
  )
}
