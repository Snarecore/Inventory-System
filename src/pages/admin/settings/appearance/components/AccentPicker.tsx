import React, { useEffect, useState } from 'react'
import {
  contrastRatio,
  deriveAccentRamp,
  gradeContrast,
  isValidHex,
  normalizeHex,
  readableOn,
} from '@/theme'
import { useAppearanceTranslation } from '../appearance-language'

interface AccentPickerProps {
  /** Currently applied accent (theme accent, or the override when set). */
  effective: string
  /** The override, if one is active. */
  override?: string
  onChange: (hex: string | undefined) => void
}

/** The official brand colours, offered first and by name. */
const BRAND_SWATCHES = [
  { hex: '#06336b', name: 'Catalina Blue' },
  { hex: '#079cdb', name: 'Cerulean' },
  { hex: '#1793cc', name: 'Curious Blue' },
  { hex: '#edf2f4', name: 'Mystic' },
]

const SWATCHES = [
  { hex: '#334155', name: 'Slate' },
  { hex: '#c74634', name: 'Redwood' },
  { hex: '#0f766e', name: 'Teal' },
  { hex: '#111827', name: 'Near black' },
  { hex: '#4338ca', name: 'Indigo' },
  { hex: '#9f1239', name: 'Maroon' },
  { hex: '#b45309', name: 'Amber' },
]

/**
 * WCAG contrast of the accent against the surfaces it is actually used on:
 * button text sitting on the accent, and accent-coloured text on white.
 */
const ContrastReadout: React.FC<{ accent: string }> = ({ accent }) => {
  const t = useAppearanceTranslation()
  const onAccent = readableOn(accent)
  const checks = [
    { label: t('Button text on accent'), ratio: contrastRatio(accent, onAccent) },
    { label: t('Accent text on white'), ratio: contrastRatio(accent, '#ffffff') },
  ]

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {checks.map((c) => {
        const grade = gradeContrast(c.ratio)
        const failing = grade === 'Fail'
        return (
          <div key={c.label} className="flex items-center justify-between gap-3 text-[12px]">
            <span className="text-[var(--ui-text-muted)]">{c.label}</span>
            <span className="flex items-center gap-2">
              <span className="font-mono text-[var(--ui-text-subtle)]">
                {c.ratio.toFixed(2)}:1
              </span>
              <span
                className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  borderRadius: 'var(--ui-radius-sm)',
                  backgroundColor: failing
                    ? 'color-mix(in srgb, var(--ui-danger) 14%, transparent)'
                    : 'color-mix(in srgb, var(--ui-success) 14%, transparent)',
                  color: failing ? 'var(--ui-danger)' : 'var(--ui-success)',
                }}
              >
                {grade}
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

export const AccentPicker: React.FC<AccentPickerProps> = ({ effective, override, onChange }) => {
  const t = useAppearanceTranslation()
  const [draft, setDraft] = useState(effective)

  // Keep the text field in step when the theme (and so the accent) changes.
  useEffect(() => {
    setDraft(effective)
  }, [effective])

  const valid = isValidHex(draft)
  const ramp = valid ? deriveAccentRamp(draft) : null

  const commit = (hex: string) => {
    if (isValidHex(hex)) onChange(normalizeHex(hex))
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-[var(--ui-text)]">{t('Accent colour')}</h3>
        {!override && (
          <span className="rounded-full bg-[var(--ui-surface-sunken)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--ui-text-subtle)]">
            {t('From theme')}
          </span>
        )}
      </div>
      <p className="mt-1 text-[13px] text-[var(--ui-text-muted)]">
        {t('Overrides the theme accent. Hover, light and dark shades are derived automatically.')}
      </p>

      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-text-subtle)]">
          {t('Brand colours')}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {BRAND_SWATCHES.map(({ hex, name }) => (
            <button
              key={hex}
              type="button"
              title={`${name} ${hex}`}
              aria-label={`${t('Use')} ${name} ${hex}`}
              onClick={() => {
                setDraft(hex)
                commit(hex)
              }}
              className={`flex cursor-pointer items-center gap-2 border py-1 pl-1 pr-2.5 transition ${
                normalizeHex(effective) === normalizeHex(hex)
                  ? 'border-[var(--ui-text)]'
                  : 'border-[var(--ui-border)] hover:border-[var(--ui-border-strong)]'
              }`}
              style={{ borderRadius: 'var(--ui-radius-sm)' }}
            >
              <span
                className="h-6 w-6 shrink-0 border border-[var(--ui-text)]/10"
                style={{ backgroundColor: hex, borderRadius: 'calc(var(--ui-radius-sm) - 1px)' }}
              />
              <span className="text-[12px] font-medium text-[var(--ui-text)]">{name}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-text-subtle)]">
        {t('Other')}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {SWATCHES.map(({ hex, name }) => (
          <button
            key={hex}
            type="button"
            title={`${name} ${hex}`}
            aria-label={`${t('Use')} ${name} ${hex}`}
            onClick={() => {
              setDraft(hex)
              commit(hex)
            }}
            className={`h-8 w-8 cursor-pointer border-2 transition ${
              normalizeHex(effective) === normalizeHex(hex)
                ? 'border-[var(--ui-text)]'
                : 'border-transparent hover:border-[var(--ui-border-strong)]'
            }`}
            style={{ backgroundColor: hex, borderRadius: 'var(--ui-radius-sm)' }}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="ui-field w-auto">
          <label htmlFor="accent-hex" className="ui-label">
            {t('Hex value')}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="accent-hex"
              type="color"
              value={valid ? normalizeHex(draft) : '#01306b'}
              onChange={(e) => {
                setDraft(e.target.value)
                commit(e.target.value)
              }}
              className="h-[var(--ui-control-h)] w-12 cursor-pointer border border-[var(--ui-border)] bg-[var(--ui-surface)] p-1"
              style={{ borderRadius: 'var(--ui-radius)' }}
            />
            <input
              className={`ui-control w-32 font-mono ${draft && !valid ? 'is-invalid' : ''}`}
              value={draft}
              spellCheck={false}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => commit(draft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commit(draft)
                }
              }}
            />
          </div>
        </div>

        {override && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="ui-btn ui-btn-secondary"
          >
            {t('Use theme accent')}
          </button>
        )}
      </div>

      {draft && !valid && <p className="ui-error mt-2">{t('Enter a 6-digit hex colour, e.g. #01306B')}</p>}

      {ramp && (
        <ContrastReadout accent={ramp.accent} />
      )}

      {ramp && (
        <div className="mt-3 flex overflow-hidden" style={{ borderRadius: 'var(--ui-radius-sm)' }}>
          {(['accentDark', 'accentHover', 'accent', 'accentMuted', 'accentLight'] as const).map(
            (key) => (
              <div key={key} className="h-7 flex-1" style={{ backgroundColor: ramp[key] }} />
            )
          )}
        </div>
      )}
    </div>
  )
}

export default AccentPicker
