import React from 'react'
import { THEME_LIST, type ThemePreset, type ThemeRef } from '@/theme'
import { useAppearanceTranslation } from '../appearance-language'

interface ThemeGalleryProps {
  value: ThemeRef
  onChange: (id: ThemeRef) => void
  /** User-made themes, shown in their own group with edit/delete actions. */
  customThemes?: ThemePreset[]
  onEdit?: (theme: ThemePreset) => void
  onDelete?: (theme: ThemePreset) => void
}

const RADIUS_PX: Record<string, string> = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '14px',
}

const BORDER_PX: Record<string, string> = {
  hairline: '1px',
  standard: '1.5px',
  strong: '2px',
}

/** A miniature of the theme, drawn in that theme's own colours and shape. */
const ThemeSwatch: React.FC<{ theme: ThemePreset }> = ({ theme }) => {
  const p = theme.palette
  const radius = RADIUS_PX[theme.defaults.radius] ?? '8px'
  const borderW = BORDER_PX[theme.defaults.borderWidth] ?? '1px'
  const underlined = theme.defaults.fieldStyle === 'underlined'
  const filled = theme.defaults.fieldStyle === 'filled'

  return (
    <div className="p-3" style={{ backgroundColor: p.surfaceSunken }}>
      <div
        className="p-3"
        style={{
          backgroundColor: p.surface,
          border: `${borderW} solid ${p.border}`,
          borderRadius: radius,
        }}
      >
        <div className="h-1.5 w-12" style={{ backgroundColor: p.accent, borderRadius: radius }} />
        {/* Field, drawn in this theme's field style */}
        <div
          className="mt-2.5 h-6 w-full"
          style={
            underlined
              ? { borderBottom: `${borderW} solid ${p.borderStrong}` }
              : {
                  border: `${borderW} solid ${filled ? 'transparent' : p.border}`,
                  borderRadius: radius,
                  backgroundColor: filled ? p.surfaceSunken : p.surfaceMuted,
                }
          }
        />
        <div className="mt-2 flex gap-1.5">
          <div className="h-5 w-14" style={{ backgroundColor: p.accent, borderRadius: radius }} />
          <div
            className="h-5 w-10"
            style={{
              border: `${borderW} solid ${p.borderStrong}`,
              borderRadius: radius,
              backgroundColor: p.surface,
            }}
          />
        </div>
      </div>
    </div>
  )
}

const ThemeCard: React.FC<{
  theme: ThemePreset
  selected: boolean
  onSelect: () => void
  onEdit?: () => void
  onDelete?: () => void
}> = ({ theme, selected, onSelect, onEdit, onDelete }) => (
  <ThemeCardContent theme={theme} selected={selected} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} />
)

const ThemeCardContent: React.FC<{
  theme: ThemePreset
  selected: boolean
  onSelect: () => void
  onEdit?: () => void
  onDelete?: () => void
}> = ({ theme, selected, onSelect, onEdit, onDelete }) => {
  const t = useAppearanceTranslation()
  return (
  <div
    className={`overflow-hidden border transition ${
      selected
        ? 'border-[var(--primary-color)] shadow-[0_0_0_3px_var(--ui-focus-ring)]'
        : 'border-[var(--ui-border)] hover:border-[var(--ui-border-strong)]'
    }`}
    style={{ borderRadius: 'var(--ui-radius-lg)' }}
  >
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className="block w-full cursor-pointer p-0 text-left"
    >
      <ThemeSwatch theme={theme} />
    </button>

    <div className="border-t border-[var(--ui-border)] bg-[var(--ui-surface)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-semibold text-[var(--ui-text)]">
          {theme.name}
        </span>
        {selected && (
          <span className="shrink-0 rounded-full bg-[var(--primary-color)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ui-on-accent)]">
            {t('Active')}
          </span>
        )}
      </div>

      {theme.description && (
        <p className="mt-1 text-[12px] leading-4 text-[var(--ui-text-subtle)]">
          {t(theme.description)}
        </p>
      )}

      {(onEdit || onDelete) && (
        <div className="mt-2 flex gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="cursor-pointer text-[12px] font-semibold text-[var(--primary-color)] underline-offset-2 hover:underline"
            >
              {t('Edit')}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="cursor-pointer text-[12px] text-[var(--ui-danger)] underline-offset-2 hover:underline"
            >
              {t('Delete')}
            </button>
          )}
        </div>
      )}
    </div>
  </div>
  )
}

export const ThemeGallery: React.FC<ThemeGalleryProps> = ({
  value,
  onChange,
  customThemes = [],
  onEdit,
  onDelete,
}) => {
  const t = useAppearanceTranslation()
  return (
  <div className="flex flex-col gap-5">
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-text-subtle)]">
        {t('Built-in')}
      </p>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {THEME_LIST.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            selected={theme.id === value}
            onSelect={() => onChange(theme.id)}
          />
        ))}
      </div>
    </div>

    {customThemes.length > 0 && (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-text-subtle)]">
          {t('Your themes')}
        </p>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {customThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              selected={theme.id === value}
              onSelect={() => onChange(theme.id)}
              onEdit={onEdit ? () => onEdit(theme) : undefined}
              onDelete={onDelete ? () => onDelete(theme) : undefined}
            />
          ))}
        </div>
      </div>
    )}
  </div>
  )
}

export default ThemeGallery
