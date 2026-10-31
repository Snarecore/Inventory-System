import React from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  /** Optional trailing adornment (unit, action, status). */
  suffix?: React.ReactNode
  /** Helper text shown under the field when there is no error. */
  hint?: string
}

/**
 * Token-driven text input.
 *
 * Sizing, radius, border weight, colour and font all come from the appearance
 * tokens (see src/index.css + src/theme), so this restyles with the active
 * theme. Anything passed via `className` still wins — the .ui-* classes live in
 * the components layer, which Tailwind utilities sort after.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, suffix, type = 'text', id, ...props }, ref) => {
    const autoId = React.useId()
    const inputId = id ?? autoId
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

    return (
      <div className="ui-field">
        {label && (
          <label htmlFor={inputId} className="ui-label">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && <span className="ui-field-icon">{icon}</span>}
          <input
            id={inputId}
            type={type}
            ref={ref}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'ui-control',
              icon && 'ui-control-with-icon',
              suffix && 'ui-control-with-suffix',
              className
            )}
            {...props}
          />
          {suffix && <span className="ui-field-suffix">{suffix}</span>}
        </div>

        {error ? (
          <p id={`${inputId}-error`} className="ui-error">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="ui-help">
            {hint}
          </p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'
