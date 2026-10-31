import React from 'react'
import type { ScaleOption } from '@/theme'
import { useAppearanceTranslation } from '../appearance-language'

interface OptionCardsProps<T extends string> {
  /** Accessible group name. */
  legend: string
  description?: string
  options: ScaleOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Shown when the value comes from the theme rather than an explicit choice. */
  isInherited?: boolean
  columns?: 2 | 3 | 4
}

/**
 * A radio group rendered as selectable cards. Used for every scalar setting on
 * the appearance page so the controls read consistently.
 */
export function OptionCards<T extends string>({
  legend,
  description,
  options,
  value,
  onChange,
  isInherited = false,
  columns = 3,
}: OptionCardsProps<T>) {
  const t = useAppearanceTranslation()
  const gridCols =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-3'

  return (
    <fieldset>
      <legend className="flex items-center gap-2 text-sm font-semibold text-[var(--ui-text)]">
        {legend}
        {isInherited && (
          <span className="rounded-full bg-[var(--ui-surface-sunken)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--ui-text-subtle)]">
            {t('From theme')}
          </span>
        )}
      </legend>
      {description && <p className="mt-1 text-[13px] text-[var(--ui-text-muted)]">{description}</p>}

      <div className={`mt-3 grid grid-cols-1 gap-2 ${gridCols}`}>
        {options.map((option) => {
          const selected = option.id === value
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              className={`cursor-pointer border p-3 text-left transition ${
                selected
                  ? 'border-[var(--primary-color)] bg-[var(--primary-color-light)]'
                  : 'border-[var(--ui-border)] bg-[var(--ui-surface)] hover:border-[var(--ui-border-strong)]'
              }`}
              style={{ borderRadius: 'var(--ui-radius)' }}
            >
              <span
                className={`block text-[13px] font-semibold ${
                  selected ? 'text-[var(--primary-color)]' : 'text-[var(--ui-text)]'
                }`}
              >
                {t(option.label)}
              </span>
              <span className="mt-0.5 block text-[12px] leading-4 text-[var(--ui-text-subtle)]">
                {t(option.hint)}
              </span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export default OptionCards
