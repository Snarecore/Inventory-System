import React from 'react'
import { Container, Badge } from '@/components/common'

export interface WorkflowStep {
  step: string
  title: string
  description: string
}

const workflowSteps: WorkflowStep[] = [
  {
    step: '01',
    title: 'Configure Your Global Color',
    description:
      'Customize your brand primary and accent colors in src/index.css with one line of code.',
  },
  {
    step: '02',
    title: 'Customize Your Slides & Content',
    description:
      'Add your banner images, promotions, or headlines directly into the interactive slider and feature cards.',
  },
  {
    step: '03',
    title: 'Launch With Confidence',
    description:
      'Deploy a high-converting, lightweight landing page with optimal speed and production-grade reliability.',
  },
]

export const HowItWorksSection: React.FC = () => {
  return (
    <Container as="section" id="how-it-works" className="scroll-mt-28">
      <div className="rounded-3xl bg-slate-50 border border-slate-200/90 p-8 sm:p-14 space-y-10">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <Badge variant="primary">Workflow</Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            How It Works
          </h2>
          <p className="text-sm text-slate-600">
            Three simple steps to tailor this landing page to your exact brand.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {workflowSteps.map((step) => (
            <div key={step.step} className="space-y-3 relative">
              <span className="text-4xl font-extrabold text-primary/30 font-mono">
                {step.step}
              </span>
              <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </Container>
  )
}
