import React from 'react'
import { Container, Card, Badge } from '@/components/common'

export const ThemeShowcaseSection: React.FC = () => {
  return (
    <Container as="section" id="about" className="scroll-mt-28">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        {/* Description & Token badges */}
        <div className="space-y-6">
          <Badge variant="primary">Centralized Palette</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            One Single Place To Customize Your Entire Brand Palette
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            No need to hunt through dozens of files to update styling. All color tokens are centralized in <code>src/index.css</code>. Modify the primary color code and your buttons, gradients, text highlights, and badges adapt instantly across the full site.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <div className="h-6 w-6 rounded-lg bg-primary shrink-0 shadow-xs" />
              <span><code>--color-primary</code> — Primary buttons, links, accents</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-r from-brand-from to-brand-to shrink-0 shadow-xs" />
              <span><code>--color-brand-from / --color-brand-to</code> — Gradients & logo</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700">
              <div className="h-6 w-6 rounded-lg bg-accent shrink-0 shadow-xs" />
              <span><code>--color-accent</code> — Secondary indicators & highlights</span>
            </div>
          </div>
        </div>

        {/* Code Preview Card */}
        <Card className="bg-slate-950 text-white p-6 rounded-2xl border-slate-800 shadow-xl font-mono text-xs overflow-x-auto space-y-4">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-3">
            <span>src/index.css</span>
            <span className="text-emerald-400">Global Theme Tokens</span>
          </div>
          <pre className="text-slate-300 leading-relaxed">
            <code>
{`@theme {
  /* Brand / Primary Color */
  --color-primary: #4f46e5;
  --color-primary-hover: #4338ca;
  --color-primary-light: #eef2ff;
  --color-primary-dark: #3730a3;
  --color-primary-muted: rgba(79, 70, 229, 0.08);

  /* Accent Color */
  --color-accent: #06b6d4;
  --color-accent-hover: #0891b2;

  /* Gradients */
  --color-brand-from: #4f46e5;
  --color-brand-to: #7c3aed;
}`}
            </code>
          </pre>
        </Card>
      </div>
    </Container>
  )
}
