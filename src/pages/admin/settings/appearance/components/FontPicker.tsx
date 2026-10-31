import React, { useEffect, useMemo, useState } from 'react'
import {
  FONT_CATEGORY_LABELS,
  FONT_CATEGORY_ORDER,
  FONT_LIST,
  ensureFontLoaded,
  type FontCategory,
  type FontDefinition,
  type FontFamilyId,
} from '@/theme'
import { useAppearanceLanguage } from '../appearance-language'

interface FontPickerProps {
  value: FontFamilyId
  onChange: (id: FontFamilyId) => void
}

const LATIN_SAMPLE = 'Invoice 10432 — Total 12,500.00'
const BENGALI_SAMPLE = 'ক্যাশ বই — চালান ১২,৫০০.০০ ৳'

const SOURCE_BADGE: Record<FontDefinition['source'], { label: string; tone: string }> = {
  system: { label: 'System', tone: 'var(--ui-success)' },
  google: { label: 'Google', tone: 'var(--ui-text-subtle)' },
  cdn: { label: 'CDN', tone: 'var(--ui-warning)' },
}

export const FontPicker: React.FC<FontPickerProps> = ({ value, onChange }) => {
  const { language, t } = useAppearanceLanguage()
  const [query, setQuery] = useState('')
  const [showBengali, setShowBengali] = useState(false)

  // Load every web font on this screen so each card previews in its own face.
  // Without this the list would render entirely in the fallback.
  useEffect(() => {
    FONT_LIST.forEach((f) => ensureFontLoaded(f.id))
  }, [])

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matches = FONT_LIST.filter(
      (f) => !q || f.label.toLowerCase().includes(q) || f.bestUse.toLowerCase().includes(q)
    )
    return FONT_CATEGORY_ORDER.map((category) => ({
      category,
      fonts: matches.filter((f) => f.category === category),
    })).filter((g) => g.fonts.length > 0)
  }, [query])

  const sample = showBengali ? BENGALI_SAMPLE : LATIN_SAMPLE

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ui-text)]">{t('Font family')}</h2>
          <p className="mt-1 text-[13px] text-[var(--ui-text-muted)]">
            {language === 'bn'
              ? `${FONT_LIST.length}টি ফন্টের নমুনা দেখুন। অনলাইন ফন্ট বাছাই করলেই শুধু ডাউনলোড হবে।`
              : `${FONT_LIST.length} faces, each previewed in its own typeface. Web fonts download only when selected.`}
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showBengali}
            onChange={(e) => setShowBengali(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-[var(--primary-color)]"
          />
          <span className="text-[13px] text-[var(--ui-text-muted)]">{t('Bengali sample')}</span>
        </label>
      </div>

      <div className="ui-field mt-3">
        <label htmlFor="font-search" className="sr-only">
          {t('Search fonts')}
        </label>
        <input
          id="font-search"
          className="ui-control"
          placeholder={t('Search by name or use — e.g. tables, Bengali, reports')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {grouped.length === 0 && (
        <p className="mt-4 text-[13px] text-[var(--ui-text-subtle)]">
          {t('No font matches')} “{query}”.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-5">
        {grouped.map(({ category, fonts }) => (
          <fieldset key={category}>
            <legend className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-text-subtle)]">
              {t(FONT_CATEGORY_LABELS[category as FontCategory])}
            </legend>

            <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
              {fonts.map((font) => {
                const selected = font.id === value
                const badge = SOURCE_BADGE[font.source]
                return (
                  <button
                    key={font.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange(font.id)}
                    className={`cursor-pointer border p-3 text-left transition ${
                      selected
                        ? 'border-[var(--primary-color)] bg-[var(--primary-color-light)]'
                        : 'border-[var(--ui-border)] bg-[var(--ui-surface)] hover:border-[var(--ui-border-strong)]'
                    }`}
                    style={{ borderRadius: 'var(--ui-radius)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[13px] font-semibold ${
                          selected ? 'text-[var(--primary-color)]' : 'text-[var(--ui-text)]'
                        }`}
                      >
                        {font.label}
                      </span>
                      <span
                        className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          borderRadius: 'var(--ui-radius-sm)',
                          color: badge.tone,
                          backgroundColor: `color-mix(in srgb, ${badge.tone} 12%, transparent)`,
                        }}
                      >
                        {t(badge.label)}
                      </span>
                    </div>

                    {/* Rendered in the font itself */}
                    <p
                      className="mt-1.5 truncate text-[15px] leading-6 text-[var(--ui-text)]"
                      style={{ fontFamily: font.stack }}
                    >
                      {sample}
                    </p>

                    <p className="mt-1 text-[12px] leading-4 text-[var(--ui-text-subtle)]">
                      {t(font.bestUse)}
                      {font.note && (
                        <span className="block text-[var(--ui-warning)]">{t(font.note)}</span>
                      )}
                    </p>
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  )
}

export default FontPicker
