import React from 'react'
import { cn } from '@/utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  size?: 'sm' | 'md'
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  size = 'md',
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-primary-muted text-primary dark:text-primary-light border border-primary/20',
    success: 'bg-[var(--ui-success-light)] text-[var(--ui-success-dark)] dark:bg-[var(--ui-success-dark)]/60 dark:text-[var(--ui-success-light)] border border-[var(--ui-success-border)] dark:border-[var(--ui-success-dark)]/50',
    warning: 'bg-[var(--ui-warning-light)] text-[var(--ui-warning-dark)] dark:bg-[var(--ui-warning-dark)]/60 dark:text-[var(--ui-warning-light)] border border-[var(--ui-warning-border)] dark:border-[var(--ui-warning-dark)]/50',
    danger: 'bg-[var(--ui-danger-light)] text-[var(--ui-danger-dark)] dark:bg-[var(--ui-danger-dark)]/60 dark:text-[var(--ui-danger-light)] border border-[var(--ui-danger-border)] dark:border-[var(--ui-danger-dark)]/50',
    neutral: 'bg-[var(--ui-surface-sunken)] text-[var(--ui-text)] dark:bg-[var(--ui-text)] dark:text-[var(--ui-text-subtle)] border border-[var(--ui-border)] dark:border-[var(--ui-text-muted)]',
  }

  const sizeStyles = {
    sm: 'text-[11px] px-2.5 py-0.5 rounded-full font-medium',
    md: 'text-xs px-3 py-1 rounded-full font-medium',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 leading-none transition-colors',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
