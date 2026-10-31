import React, { useRef, useState } from 'react'
import {
  createPreset,
  downloadPresets,
  loadPresets,
  parseImport,
  persistPresets,
  THEME_PRESETS,
  useAppearance,
  type SavedPreset,
} from '@/theme'
import { showErrorToast, showSuccessToast } from '@/utils/toast-utils'
import { useAppearanceLanguage } from '../appearance-language'

/**
 * Save the current configuration under a name, re-apply it later, and move
 * configurations between browsers as a JSON file. Everything stays local.
 */
export const PresetManager: React.FC = () => {
  const { language, t } = useAppearanceLanguage()
  const { state, setTheme, setOverrides, resetOverrides } = useAppearance()
  const [presets, setPresets] = useState<SavedPreset[]>(() => loadPresets())
  const [name, setName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const commit = (next: SavedPreset[]) => {
    setPresets(next)
    persistPresets(next)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      showErrorToast(language === 'bn' ? 'আগে সেটিংসের একটি নাম লিখুন।' : 'Give the preset a name first.')
      return
    }
    if (presets.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      showErrorToast(language === 'bn' ? 'এই নামে সেটিংস আগে থেকেই সেভ করা আছে।' : 'A preset with that name already exists.')
      return
    }
    commit([createPreset(trimmed, state), ...presets])
    setName('')
    showSuccessToast(language === 'bn' ? `"${trimmed}" নামে সেটিংস সেভ হয়েছে।` : `Saved "${trimmed}"`)
  }

  const handleApply = (preset: SavedPreset) => {
    // Clear first so keys absent from the preset fall back to theme defaults
    // instead of lingering from the current configuration.
    resetOverrides()
    setTheme(preset.state.themeId)
    setOverrides(preset.state.overrides)
    showSuccessToast(language === 'bn' ? `"${preset.name}" সেটিংস চালু হয়েছে।` : `Applied "${preset.name}"`)
  }

  const handleDelete = (preset: SavedPreset) => {
    commit(presets.filter((p) => p.id !== preset.id))
  }

  const handleImport = async (file: File) => {
    const text = await file.text()
    const { presets: imported, error } = parseImport(text)
    if (error) {
      showErrorToast(error)
      return
    }
    // Imported names are suffixed when they collide rather than overwriting.
    const existing = new Set(presets.map((p) => p.name.toLowerCase()))
    const deduped = imported.map((p) =>
      existing.has(p.name.toLowerCase()) ? { ...p, name: `${p.name} (imported)` } : p
    )
    commit([...deduped, ...presets])
    showSuccessToast(language === 'bn' ? `${deduped.length}টি সেটিংস ইমপোর্ট হয়েছে।` : `Imported ${deduped.length} preset${deduped.length === 1 ? '' : 's'}`)
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-[var(--ui-text)]">{t('Saved configurations')}</h2>
      <p className="mt-1 text-[13px] text-[var(--ui-text-muted)]">
        {t('Store the current setup under a name, or move it to another browser as a file. Saved here, not on the server.')}
      </p>

      <form onSubmit={handleSave} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="ui-field min-w-[12rem] flex-1">
          <label htmlFor="preset-name" className="ui-label">
            {t('Preset name')}
          </label>
          <input
            id="preset-name"
            className="ui-control"
            value={name}
            maxLength={60}
            placeholder={t('e.g. Accounts desk — compact')}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button type="submit" className="ui-btn ui-btn-primary">
          {t('Save current')}
        </button>
      </form>

      {presets.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {presets.map((preset) => {
            const themeName = THEME_PRESETS[preset.state.themeId]?.name ?? preset.state.themeId
            const count = Object.keys(preset.state.overrides).length
            return (
              <li
                key={preset.id}
                className="flex flex-wrap items-center gap-2 border border-[var(--ui-border)] p-2.5"
                style={{ borderRadius: 'var(--ui-radius)' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--ui-text)]">
                    {preset.name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--ui-text-subtle)]">
                    {t(themeName)}
                      {count > 0 && (language === 'bn' ? ` · ${count}টি বদলানো সেটিংস` : ` · ${count} override${count === 1 ? '' : 's'}`)}
                    {' · '}
                    {new Date(preset.savedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleApply(preset)}
                  className="ui-btn ui-btn-secondary"
                >
                  {t('Apply')}
                </button>
                <button
                  type="button"
                  onClick={() => downloadPresets([preset], `${preset.name}.json`)}
                  className="ui-btn ui-btn-ghost"
                >
                  {t('Export')}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(preset)}
                  className="ui-btn ui-btn-ghost text-[var(--ui-danger)]"
                  aria-label={`${t('Delete')} ${preset.name}`}
                >
                  {t('Delete')}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--ui-border)] pt-4">
        <button
          type="button"
          className="ui-btn ui-btn-secondary"
          disabled={!presets.length}
          onClick={() => downloadPresets(presets)}
        >
          {t('Export all')}
        </button>
        <button
          type="button"
          className="ui-btn ui-btn-secondary"
          onClick={() => fileRef.current?.click()}
        >
          {t('Import file')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleImport(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

export default PresetManager
