import React from 'react'
import {
  BORDER_WIDTH_OPTIONS,
  BUTTON_STYLE_OPTIONS,
  CONTENT_WIDTH_OPTIONS,
  FIELD_STYLE_OPTIONS,
  FOCUS_STYLE_OPTIONS,
  LABEL_CASE_OPTIONS,
  LABEL_PLACEMENT_OPTIONS,
  REQUIRED_STYLE_OPTIONS,
  DENSITY_OPTIONS,
  FONT_SCALE_OPTIONS,
  RADIUS_OPTIONS,
  SHADOW_OPTIONS,
  TABLE_DENSITY_OPTIONS,
  VALIDATION_STYLE_OPTIONS,
  TABLE_ROW_STYLE_OPTIONS,
  DIALOG_STYLE_OPTIONS,
  ALERT_STYLE_OPTIONS,
  COLOR_MODE_OPTIONS,
  type ThemePreset,
  useAppearance,
} from '@/theme'
import AccentPicker from './components/AccentPicker'
import FontPicker from './components/FontPicker'
import LivePreview from './components/LivePreview'
import OptionCards from './components/OptionCards'
import PresetManager from './components/PresetManager'
import ThemeGallery from './components/ThemeGallery'
import ThemeStudio from './components/ThemeStudio'
import { AppearanceLanguageProvider, useAppearanceLanguage } from './appearance-language'
import {
  FiSun,
  FiMoon,
  FiMonitor,
  FiSliders,
  FiType,
  FiCheckCircle,
  FiSquare,
  FiDroplet,
  FiGrid,
  FiMessageSquare,
  FiBell,
  FiBookmark,
  FiRotateCcw,
  FiActivity,
} from 'react-icons/fi'
import { MdOutlinePalette } from 'react-icons/md'

interface SectionCardProps {
  icon: React.ReactNode
  title: string
  description?: string
  badge?: React.ReactNode
  children: React.ReactNode
}

const SectionCard: React.FC<SectionCardProps> = ({
  icon,
  title,
  description,
  badge,
  children,
}) => (
  <section className="ui-card p-4 sm:p-5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-xs">
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3.5 border-b border-[var(--ui-border)]/60">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-lg bg-[var(--primary-color-light)] text-[var(--primary-color)] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-[var(--ui-text)] tracking-tight leading-tight">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-[var(--ui-text-muted)] mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {badge}
    </div>
    {children}
  </section>
)

/**
 * Appearance settings.
 *
 * Everything here writes to the AppearanceProvider, which persists to
 * localStorage and applies CSS variables to <html>. Changes are live — there
 * is no save step, and nothing is sent to the server.
 */
const AppearanceSettingsContent: React.FC = () => {
  const {
    state,
    resolved,
    activeTheme,
    setTheme,
    setOverrides,
    resetOverrides,
    resetAll,
    hasOverrides,
    customThemes,
    deleteCustomTheme,
  } = useAppearance()

  // Set by the gallery's Edit action; the studio picks it up.
  const [editingTheme, setEditingTheme] = React.useState<ThemePreset | null>(null)

  const preset = activeTheme
  const o = state.overrides
  const { language, setLanguage, t } = useAppearanceLanguage()
  const configurationOptions: Record<string, readonly { id: string; label: string }[]> = {
    'Color mode': COLOR_MODE_OPTIONS,
    Density: DENSITY_OPTIONS,
    'Font size': FONT_SCALE_OPTIONS,
    'Content width': CONTENT_WIDTH_OPTIONS,
    Radius: RADIUS_OPTIONS,
    Border: BORDER_WIDTH_OPTIONS,
    Elevation: SHADOW_OPTIONS,
    'Table rows': TABLE_DENSITY_OPTIONS,
    'Table row appearance': TABLE_ROW_STYLE_OPTIONS,
    'Field style': FIELD_STYLE_OPTIONS,
    Labels: LABEL_PLACEMENT_OPTIONS,
    Focus: FOCUS_STYLE_OPTIONS,
    Buttons: BUTTON_STYLE_OPTIONS,
    Validation: VALIDATION_STYLE_OPTIONS,
    Dialogs: DIALOG_STYLE_OPTIONS,
    Alerts: ALERT_STYLE_OPTIONS,
  }

  return (
    <div className="ui-page mx-auto w-full" lang={language}>
      {/* ---------------- Master Top Header ---------------- */}
      <header className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[var(--ui-surface)] border border-[var(--ui-border)] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[var(--primary-color-light)] text-[var(--primary-color)] flex items-center justify-center">
              <MdOutlinePalette size={18} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary-color)]">
              {t('DESIGN SYSTEM & THEMING')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--ui-text)]">
            {t('Appearance')}
          </h1>
          <p className="mt-0.5 max-w-2xl text-[13px] leading-relaxed text-[var(--ui-text-muted)]">
            {t(
              'Controls the look of every form, button and table in the dashboard. Settings apply instantly to this admin panel.'
            )}
          </p>
        </div>

        {/* Toolbar controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Language Switcher */}
          <div
            className="flex rounded-xl border border-[var(--ui-border)] p-1 bg-[var(--ui-surface-sunken)] shadow-2xs"
            aria-label="Language / ভাষা"
          >
            <button
              type="button"
              onClick={() => setLanguage('bn')}
              aria-pressed={language === 'bn'}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                language === 'bn'
                  ? 'bg-[var(--primary-color)] text-[var(--ui-on-accent)] shadow-xs'
                  : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'
              }`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              aria-pressed={language === 'en'}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-[var(--primary-color)] text-[var(--ui-on-accent)] shadow-xs'
                  : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'
              }`}
            >
              English
            </button>
          </div>

          {/* Reduce motion toggle */}
          <button
            type="button"
            onClick={() => setOverrides({ reduceMotion: !resolved.reduceMotion })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              resolved.reduceMotion
                ? 'border-[var(--primary-color)] bg-[var(--primary-color-light)] text-[var(--primary-color)]'
                : 'border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text-muted)] hover:border-[var(--ui-border-strong)]'
            }`}
          >
            <FiActivity size={13} />
            <span>{t('Reduce motion')}</span>
          </button>

          {/* Reset buttons */}
          {hasOverrides && (
            <button
              type="button"
              onClick={resetOverrides}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-muted)] hover:border-[var(--ui-border-strong)] text-xs font-medium text-[var(--ui-text)] transition-all cursor-pointer shadow-xs"
            >
              <span>{t('Reset to theme defaults')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] hover:bg-[var(--ui-surface-muted)] hover:border-[var(--ui-border-strong)] text-xs font-medium text-[var(--ui-text-subtle)] hover:text-[var(--ui-text)] transition-all cursor-pointer shadow-xs"
            title="Reset everything to factory default"
          >
            <FiRotateCcw size={12} />
            <span>{t('Restore defaults')}</span>
          </button>
        </div>
      </header>

      <div className="mt-[var(--ui-section-gap)] grid grid-cols-1 gap-[var(--ui-section-gap)] xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {/* ---------------- Controls ---------------- */}
        <div className="flex flex-col gap-[var(--ui-section-gap)]">
          {/* Color Mode */}
          <SectionCard
            icon={<FiSun size={17} />}
            title={t('Color mode')}
            description={t(
              'Switch between daylight surfaces, low-glare dark mode, or automatic synchronization with your OS preference.'
            )}
            badge={
              <span className="text-xs font-bold capitalize text-[var(--primary-color)] bg-[var(--primary-color-light)] px-3 py-1 rounded-full border border-[var(--primary-color)]/20 shadow-2xs">
                {resolved.colorMode === 'system'
                  ? `${t('System')} (${resolved.resolvedColorMode})`
                  : t(resolved.colorMode === 'dark' ? 'Dark' : 'Light')}
              </span>
            }
          >
            <OptionCards
              legend={t('Appearance mode')}
              options={COLOR_MODE_OPTIONS}
              value={resolved.colorMode}
              isInherited={o.colorMode === undefined}
              columns={3}
              onChange={(colorMode) => setOverrides({ colorMode })}
            />
          </SectionCard>

          {/* Theme Presets */}
          <SectionCard
            icon={<MdOutlinePalette size={18} />}
            title={t('Theme')}
            description={t(
              'Each theme sets its own palette, shape and density. Pick one as a starting point, then adjust anything below.'
            )}
            badge={
              <span className="text-xs font-bold text-[var(--primary-color)] bg-[var(--primary-color-light)] px-3 py-1 rounded-full border border-[var(--primary-color)]/20 shadow-2xs">
                Active: {preset.name}
              </span>
            }
          >
            <div className="mt-1">
              <ThemeGallery
                value={resolved.themeId}
                onChange={setTheme}
                customThemes={customThemes}
                onEdit={setEditingTheme}
                onDelete={(t) => {
                  const confirmation =
                    language === 'bn'
                      ? `“${t.name}” থিমটি মুছবেন? মুছে ফেললে আর ফেরত আনা যাবে না।`
                      : `Delete the theme "${t.name}"? This cannot be undone.`
                  if (window.confirm(confirmation)) {
                    deleteCustomTheme(t.id)
                  }
                }}
              />
            </div>
          </SectionCard>

          {/* Theme Studio */}
          <SectionCard
            icon={<FiSliders size={18} />}
            title={t('Theme studio')}
            description={t('Create custom palettes or auto-extract colors from company logo.')}
          >
            <ThemeStudio editing={editingTheme} onEditingChange={setEditingTheme} />
          </SectionCard>

          {/* Density & Typography */}
          <SectionCard
            icon={<FiType size={18} />}
            title={t('Density & typography')}
            description={t('Control height drives every input, select and button at once.')}
          >
            <div className="flex flex-col gap-5">
              <OptionCards
                legend={t('Control height')}
                options={DENSITY_OPTIONS}
                value={resolved.density}
                isInherited={o.density === undefined}
                onChange={(density) => setOverrides({ density })}
              />
              <OptionCards
                legend={t('Base font size')}
                options={FONT_SCALE_OPTIONS}
                value={resolved.fontScale}
                columns={4}
                onChange={(fontScale) => setOverrides({ fontScale })}
              />
            </div>
          </SectionCard>

          {/* Font Family */}
          <SectionCard
            icon={<FiType size={18} />}
            title={t('Font family')}
            description={t('Switch global font stacks across English and Bengali typography.')}
          >
            <FontPicker
              value={resolved.fontFamily}
              onChange={(fontFamily) => setOverrides({ fontFamily })}
            />
          </SectionCard>

          {/* Field & Label Style */}
          <SectionCard
            icon={<FiCheckCircle size={18} />}
            title={t('Field & label style')}
            description={t(
              'How every input is drawn and where its label sits. Inline labels fall back to stacked on phone-width screens.'
            )}
          >
            <div className="flex flex-col gap-5">
              <OptionCards
                legend={t('Field style')}
                options={FIELD_STYLE_OPTIONS}
                value={resolved.fieldStyle}
                isInherited={o.fieldStyle === undefined}
                columns={4}
                onChange={(fieldStyle) => setOverrides({ fieldStyle })}
              />
              <OptionCards
                legend={t('Label placement')}
                options={LABEL_PLACEMENT_OPTIONS}
                value={resolved.labelPlacement}
                columns={2}
                onChange={(labelPlacement) => setOverrides({ labelPlacement })}
              />
              <OptionCards
                legend={t('Label case')}
                options={LABEL_CASE_OPTIONS}
                value={resolved.labelCase}
                columns={2}
                onChange={(labelCase) => setOverrides({ labelCase })}
              />
              <OptionCards
                legend={t('Required indicator')}
                options={REQUIRED_STYLE_OPTIONS}
                value={resolved.requiredStyle}
                onChange={(requiredStyle) => setOverrides({ requiredStyle })}
              />
              <OptionCards
                legend={t('Focus indicator')}
                options={FOCUS_STYLE_OPTIONS}
                value={resolved.focusStyle}
                columns={4}
                onChange={(focusStyle) => setOverrides({ focusStyle })}
              />
              <OptionCards
                legend={t('Primary button style')}
                options={BUTTON_STYLE_OPTIONS}
                value={resolved.buttonStyle}
                onChange={(buttonStyle) => setOverrides({ buttonStyle })}
              />
              <OptionCards
                legend={t('Validation feedback')}
                description={t('Choose how invalid fields and their messages appear.')}
                options={VALIDATION_STYLE_OPTIONS}
                value={resolved.validationStyle}
                onChange={(validationStyle) => setOverrides({ validationStyle })}
              />
            </div>
          </SectionCard>

          {/* Shape & Borders */}
          <SectionCard
            icon={<FiSquare size={18} />}
            title={t('Shape & borders')}
            description={t('Tune corner radius, border weight and elevation independently of the theme.')}
          >
            <div className="flex flex-col gap-5">
              <OptionCards
                legend={t('Corner radius')}
                options={RADIUS_OPTIONS}
                value={resolved.radius}
                isInherited={o.radius === undefined}
                columns={4}
                onChange={(radius) => setOverrides({ radius })}
              />
              <OptionCards
                legend={t('Border weight')}
                options={BORDER_WIDTH_OPTIONS}
                value={resolved.borderWidth}
                isInherited={o.borderWidth === undefined}
                onChange={(borderWidth) => setOverrides({ borderWidth })}
              />
              <OptionCards
                legend={t('Elevation')}
                options={SHADOW_OPTIONS}
                value={resolved.shadow}
                isInherited={o.shadow === undefined}
                onChange={(shadow) => setOverrides({ shadow })}
              />
            </div>
          </SectionCard>

          {/* Accent Colour */}
          <SectionCard
            icon={<FiDroplet size={18} />}
            title={t('Accent colour')}
            description={t('Overrides the theme accent. Hover, light and dark shades are derived automatically.')}
          >
            <AccentPicker
              effective={resolved.palette.accent}
              override={o.accent}
              onChange={(accent) => setOverrides({ accent })}
            />
          </SectionCard>

          {/* Table & Layout */}
          <SectionCard
            icon={<FiGrid size={18} />}
            title={t('Table & layout')}
            description={t('Row height and content width for data screens, separate from form density.')}
          >
            <div className="flex flex-col gap-5">
              <OptionCards
                legend={t('Page content width')}
                options={CONTENT_WIDTH_OPTIONS}
                value={resolved.contentWidth}
                isInherited={o.contentWidth === undefined}
                columns={3}
                onChange={(contentWidth) => setOverrides({ contentWidth })}
              />
              <OptionCards
                legend={t('Table row height')}
                options={TABLE_DENSITY_OPTIONS}
                value={resolved.tableDensity}
                isInherited={o.tableDensity === undefined}
                onChange={(tableDensity) => setOverrides({ tableDensity })}
              />
              <OptionCards
                legend={t('Table row appearance')}
                options={TABLE_ROW_STYLE_OPTIONS}
                value={resolved.tableRowStyle}
                onChange={(tableRowStyle) => setOverrides({ tableRowStyle })}
              />
            </div>
          </SectionCard>

          {/* Dialogs */}
          <SectionCard
            icon={<FiMessageSquare size={18} />}
            title={t('Dialogs')}
            description={t('Adjust the shared modal and confirmation dialog treatment.')}
          >
            <OptionCards
              legend={t('Dialog appearance')}
              options={DIALOG_STYLE_OPTIONS}
              value={resolved.dialogStyle}
              onChange={(dialogStyle) => setOverrides({ dialogStyle })}
            />
          </SectionCard>

          {/* Alerts & Notifications */}
          <SectionCard
            icon={<FiBell size={18} />}
            title={t('Alerts & notifications')}
            description={t('Choose how success, error, and loading notifications are presented.')}
          >
            <OptionCards
              legend={t('Notification appearance')}
              options={ALERT_STYLE_OPTIONS}
              value={resolved.alertStyle}
              onChange={(alertStyle) => setOverrides({ alertStyle })}
            />
          </SectionCard>

          {/* Saved Configurations */}
          <SectionCard
            icon={<FiBookmark size={18} />}
            title={t('Saved configurations')}
            description={t('Export, import, and manage your custom design presets.')}
          >
            <PresetManager />
          </SectionCard>
        </div>

        {/* ---------------- Preview ---------------- */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <LivePreview />

          <div className="ui-card mt-[var(--ui-section-gap)] p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-[var(--ui-text)]">{t('Current configuration')}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              {[
                ['Color mode', resolved.colorMode],
                ['Theme', preset.name],
                ['Density', resolved.density],
                ['Font', resolved.fontFamily],
                ['Font size', resolved.fontScale],
                ['Content width', resolved.contentWidth],
                ['Radius', resolved.radius],
                ['Border', resolved.borderWidth],
                ['Elevation', resolved.shadow],
                ['Table rows', resolved.tableDensity],
                ['Table row appearance', resolved.tableRowStyle],
                ['Field style', resolved.fieldStyle],
                ['Labels', resolved.labelPlacement],
                ['Focus', resolved.focusStyle],
                ['Buttons', resolved.buttonStyle],
                ['Validation', resolved.validationStyle],
                ['Dialogs', resolved.dialogStyle],
                ['Alerts', resolved.alertStyle],
                ['Accent colour', resolved.palette.accent],
              ].map(([label, value]) => (
                <React.Fragment key={label}>
                  <dt className="text-[var(--ui-text-subtle)]">{t(label)}</dt>
                  <dd className="truncate font-medium capitalize text-[var(--ui-text)]">
                    {t(configurationOptions[label]?.find((option) => option.id === value)?.label ?? value)}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
            {hasOverrides && (
              <p className="mt-3 border-t border-[var(--ui-border)] pt-3 text-[12px] text-[var(--ui-text-subtle)]">
                {language === 'bn'
                  ? `থিমের বাইরে ${Object.keys(o).length}টি সেটিংস বদলানো হয়েছে: `
                  : `${Object.keys(o).length} setting${Object.keys(o).length === 1 ? '' : 's'} overridden from the `}
                <span className="font-medium">{preset.name}</span>
                {language === 'en' ? ' theme.' : ' থিম।'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const AppearanceSettings: React.FC = () => (
  <AppearanceLanguageProvider>
    <AppearanceSettingsContent />
  </AppearanceLanguageProvider>
)

export default AppearanceSettings
