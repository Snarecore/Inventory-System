import React, { useRef, useState } from 'react'
import {
  BORDER_WIDTH_OPTIONS,
  DENSITY_OPTIONS,
  FIELD_STYLE_OPTIONS,
  PALETTE_KEYS,
  PALETTE_LABELS,
  RADIUS_OPTIONS,
  SHADOW_OPTIONS,
  TABLE_DENSITY_OPTIONS,
  blankTheme,
  contrastRatio,
  downloadThemes,
  extractPalette,
  extractPaletteFromImage,
  gradeContrast,
  isValidHex,
  normalizeHex,
  parseThemeImport,
  useAppearance,
  type ThemePalette,
  type ThemePreset,
} from '@/theme'
import { showErrorToast, showSuccessToast } from '@/utils/toast-utils'
import { useAppearanceLanguage } from '../appearance-language'

const PLACEHOLDER = `Paste colours from any theme you own — CSS variables, JSON, or a list of hex codes:

:root {
  --bs-primary: #0d6efd;
  --bs-body-bg: #ffffff;
  --bs-body-color: #212529;
  --bs-border-color: #dee2e6;
}`

interface ThemeStudioProps {
  /** Set by the gallery's Edit action to open that theme. */
  editing: ThemePreset | null
  onEditingChange: (theme: ThemePreset | null) => void
}

export const ThemeStudio: React.FC<ThemeStudioProps> = ({ editing, onEditingChange }) => {
  const { language, t } = useAppearanceLanguage()
  const { customThemes, saveCustomTheme, setTheme, replaceCustomThemes } = useAppearance()
  const [draft, setDraft] = useState<ThemePreset | null>(editing)
  const [paste, setPaste] = useState('')
  const [pasteInfo, setPasteInfo] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const [swatches, setSwatches] = useState<{ hex: string; pct: number }[]>([])

  // Adopt a theme handed in from the gallery's Edit button.
  const [lastEditing, setLastEditing] = useState<ThemePreset | null>(editing)
  if (editing !== lastEditing) {
    setLastEditing(editing)
    setDraft(editing)
  }

  const start = (base?: ThemePreset) => {
    const next = base
      ? { ...base, palette: { ...base.palette } }
      : blankTheme(language === 'bn' ? 'আমার থিম' : 'My theme')
    setDraft(next)
    onEditingChange(null)
  }

  const close = () => {
    setDraft(null)
    onEditingChange(null)
  }

  const patchPalette = (key: keyof ThemePalette, hex: string) => {
    setDraft((d) => (d ? { ...d, palette: { ...d.palette, [key]: hex } } : d))
  }

  const handleExtract = () => {
    const { palette, found, namedRoles, error } = extractPalette(paste)
    if (error) {
      setPasteInfo(null)
      showErrorToast(error)
      return
    }
    setDraft((d) => {
      const base = d ?? blankTheme(language === 'bn' ? 'ইমপোর্ট করা থিম' : 'Imported theme')
      return { ...base, palette }
    })
    setPasteInfo(
      language === 'bn'
        ? `${found.length}টি রং পাওয়া গেছে${namedRoles.length ? ` · নাম দেখে মিলেছে: ${namedRoles.join(', ')}` : ' · রঙের ধরন অনুমান করা হয়েছে'}`
        : `Found ${found.length} colour${found.length === 1 ? '' : 's'}` +
          (namedRoles.length ? ` · matched by name: ${namedRoles.join(', ')}` : ' · roles inferred')
    )
  }

  const handleLogo = async (file: File) => {
    const r = await extractPaletteFromImage(file)
    if (r.error) {
      showErrorToast(r.error)
      return
    }
    setSwatches(r.swatches)
    setDraft((d) => {
      const base = d ?? blankTheme(file.name.replace(/\.\w+$/, '') || 'Logo theme')
      return { ...base, palette: r.palette }
    })
    setPasteInfo(
      language === 'bn'
        ? `${r.swatches.length}টি প্রধান রং নেওয়া হয়েছে${r.palette.accentSecondary ? ' · দ্বিতীয় একটি ব্র্যান্ডের রংও পাওয়া গেছে' : ''}`
        : `Sampled ${r.swatches.length} dominant colours` +
          (r.palette.accentSecondary ? ' · found a secondary brand colour' : '')
    )
  }

  const handleSave = () => {
    if (!draft) return
    if (!draft.name.trim()) {
      showErrorToast(language === 'bn' ? 'থিমের একটি নাম দিন।' : 'Give the theme a name.')
      return
    }
    const invalid = PALETTE_KEYS.filter((k) => !isValidHex(draft.palette[k]))
    if (invalid.length) {
      showErrorToast(language === 'bn' ? `রঙের কোড ঠিক নয়: ${invalid.map((k) => PALETTE_LABELS[k]).join(', ')}` : `Invalid colour for: ${invalid.map((k) => PALETTE_LABELS[k]).join(', ')}`)
      return
    }
    const saved = saveCustomTheme({
      ...draft,
      name: draft.name.trim(),
      palette: PALETTE_KEYS.reduce((acc, k) => {
        acc[k] = normalizeHex(draft.palette[k])
        return acc
      }, {} as ThemePalette),
    })
    setTheme(saved.id)
    showSuccessToast(language === 'bn' ? `"${saved.name}" থিমটি সেভ করে চালু করা হয়েছে।` : `Saved and applied "${saved.name}"`)
    close()
  }

  const handleImportFile = async (file: File) => {
    const { themes, error } = parseThemeImport(await file.text())
    if (error) {
      showErrorToast(error)
      return
    }
    const existing = new Set(customThemes.map((t) => t.id))
    const merged = [...customThemes, ...themes.filter((t) => !existing.has(t.id))]
    replaceCustomThemes(merged)
    showSuccessToast(language === 'bn' ? `${themes.length}টি থিম ইমপোর্ট হয়েছে।` : `Imported ${themes.length} theme${themes.length === 1 ? '' : 's'}`)
  }

  const accentRatio = draft ? contrastRatio(draft.palette.accent, draft.palette.surface) : 0
  const textRatio = draft ? contrastRatio(draft.palette.text, draft.palette.surface) : 0

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ui-text)]">{t('Theme studio')}</h2>
          <p className="mt-1 max-w-xl text-[13px] leading-5 text-[var(--ui-text-muted)]">
            {t('Build your own theme, or paste the colours from a theme you own to convert it. Only colour values are read — no CSS or assets are copied.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!draft && (
            <button type="button" className="ui-btn ui-btn-primary" onClick={() => start()}>
              {t('New theme')}
            </button>
          )}
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            onClick={() => fileRef.current?.click()}
          >
            {t('Import')}
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            disabled={!customThemes.length}
            onClick={() => downloadThemes(customThemes)}
          >
            {t('Export all')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleImportFile(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {!draft && (
        <p className="mt-3 text-[13px] text-[var(--ui-text-subtle)]">
          {customThemes.length
            ? language === 'bn'
              ? `${customThemes.length}টি নিজের থিম সেভ করা আছে। ওপরে কোনো থিম এডিট করুন, অথবা নতুন থিম বানান।`
              : `${customThemes.length} custom theme${customThemes.length === 1 ? '' : 's'} saved. Use Edit on a card above, or start a new one.`
            : t('No custom themes yet.')}
        </p>
      )}

      {draft && (
        <div className="mt-4 flex flex-col gap-5 border-t border-[var(--ui-border)] pt-4">
          {/* Identity */}
          <div className="grid grid-cols-1 gap-[var(--ui-field-gap)] sm:grid-cols-2">
            <div className="ui-field">
              <label htmlFor="ts-name" className="ui-label ui-label-required">
                {t('Theme name')}
              </label>
              <input
                id="ts-name"
                className="ui-control"
                value={draft.name}
                maxLength={48}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="ui-field">
              <label htmlFor="ts-desc" className="ui-label">
                {t('Description')}
              </label>
              <input
                id="ts-desc"
                className="ui-control"
                value={draft.description}
                maxLength={160}
                placeholder={t('Where this theme suits best')}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
          </div>

          {/* Paste-to-extract */}
          <div>
            <label htmlFor="ts-paste" className="ui-label">
              {t('Extract colours from pasted text')}
            </label>
            <textarea
              id="ts-paste"
              className="ui-control ui-control-multiline mt-1.5 font-mono text-[12px]"
              rows={6}
              placeholder={PLACEHOLDER}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="button" className="ui-btn ui-btn-subtle" onClick={handleExtract}>
                {t('Extract palette')}
              </button>
              {pasteInfo && <span className="ui-help">{pasteInfo}</span>}
            </div>
          </div>

          {/* Extract from a logo image */}
          <div>
            <p className="ui-label">{t('Or pick the colours out of a logo')}</p>
            <p className="ui-help mt-0.5">
              {t('Reads the dominant colours straight from the image in your browser. Nothing is uploaded.')}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="ui-btn ui-btn-subtle"
                onClick={() => logoRef.current?.click()}
              >
                {t('Choose logo image')}
              </button>
              {swatches.length > 0 && (
                <div
                  className="flex overflow-hidden border border-[var(--ui-border)]"
                  style={{ borderRadius: 'var(--ui-radius-sm)' }}
                  title={t('Dominant colours by area')}
                >
                  {swatches.map((s) => (
                    <span
                      key={s.hex}
                      className="h-7"
                      title={`${s.hex} — ${s.pct.toFixed(1)}%`}
                      style={{
                        backgroundColor: s.hex,
                        width: `${Math.max(14, Math.min(64, s.pct))}px`,
                      }}
                    />
                  ))}
                </div>
              )}
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleLogo(f)
                  e.target.value = ''
                }}
              />
            </div>
          </div>

          {/* Palette */}
          <div>
            <p className="ui-label mb-2">{t('Palette')}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PALETTE_KEYS.map((key) => {
                const hex = draft.palette[key]
                const ok = isValidHex(hex)
                return (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={t(PALETTE_LABELS[key])}
                      value={ok ? normalizeHex(hex) : '#000000'}
                      onChange={(e) => patchPalette(key, e.target.value)}
                      className="h-9 w-10 shrink-0 cursor-pointer border border-[var(--ui-border)] bg-[var(--ui-surface)] p-1"
                      style={{ borderRadius: 'var(--ui-radius-sm)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`ts-${key}`}
                        className="block truncate text-[11px] text-[var(--ui-text-subtle)]"
                      >
                        {t(PALETTE_LABELS[key])}
                      </label>
                      <input
                        id={`ts-${key}`}
                        className={`ui-control font-mono text-[12px] ${ok ? '' : 'is-invalid'}`}
                        style={{ height: 'calc(var(--ui-control-h) - 8px)' }}
                        value={hex}
                        spellCheck={false}
                        onChange={(e) => patchPalette(key, e.target.value)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Contrast guard */}
          <div className="flex flex-wrap gap-4 text-[12px]">
            {[
              { label: t('Text on surface'), ratio: textRatio, min: 4.5 },
              { label: t('Accent on surface'), ratio: accentRatio, min: 3 },
            ].map((c) => {
              const grade = gradeContrast(c.ratio)
              const bad = c.ratio < c.min
              return (
                <span key={c.label} className="flex items-center gap-2">
                  <span className="text-[var(--ui-text-muted)]">{c.label}</span>
                  <span className="font-mono text-[var(--ui-text-subtle)]">
                    {c.ratio.toFixed(2)}:1
                  </span>
                  <span
                    className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{
                      borderRadius: 'var(--ui-radius-sm)',
                      color: bad ? 'var(--ui-danger)' : 'var(--ui-success)',
                      backgroundColor: `color-mix(in srgb, ${
                        bad ? 'var(--ui-danger)' : 'var(--ui-success)'
                      } 14%, transparent)`,
                    }}
                  >
                    {t(grade)}
                  </span>
                </span>
              )
            })}
          </div>

          {/* Shape defaults */}
          <div>
            <p className="ui-label mb-2">{t('Default shape & density for this theme')}</p>
            <div className="grid grid-cols-1 gap-[var(--ui-field-gap)] sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ['density', t('Density'), DENSITY_OPTIONS],
                  ['radius', t('Radius'), RADIUS_OPTIONS],
                  ['borderWidth', t('Border'), BORDER_WIDTH_OPTIONS],
                  ['shadow', t('Elevation'), SHADOW_OPTIONS],
                  ['tableDensity', t('Table rows'), TABLE_DENSITY_OPTIONS],
                  ['fieldStyle', t('Field style'), FIELD_STYLE_OPTIONS],
                ] as const
              ).map(([key, label, options]) => (
                <div key={key} className="ui-field">
                  <label htmlFor={`ts-${key}`} className="ui-label">
                    {label}
                  </label>
                  <select
                    id={`ts-${key}`}
                    className="ui-control ui-select"
                    value={draft.defaults[key]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        defaults: { ...draft.defaults, [key]: e.target.value },
                      })
                    }
                  >
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {t(o.label)}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-[var(--ui-border)] pt-4">
            <button type="button" className="ui-btn ui-btn-primary" onClick={handleSave}>
              {t('Save & apply')}
            </button>
            <button type="button" className="ui-btn ui-btn-ghost" onClick={close}>
              {t('Cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ThemeStudio
