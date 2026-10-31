import React from 'react'
import { cn } from '@/utils/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hoverEffect = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-[var(--ui-surface)] dark:bg-[var(--ui-text)] rounded-2xl border border-[var(--ui-border)]/80 dark:border-[var(--ui-text-muted)] p-5 sm:p-6 shadow-sm shadow-slate-200/50 dark:shadow-none transition-all duration-200',
        hoverEffect && 'hover:shadow-md hover:border-[var(--ui-border-strong)] dark:hover:border-[var(--ui-text-muted)] hover:-translate-y-0.5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
