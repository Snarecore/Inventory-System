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

const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <section className="ui-card p-4 sm:p-5">{children}</section>
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
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--ui-text)]">{t('Appearance')}</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-5 text-[var(--ui-text-muted)]">
            {t('Controls the look of every form, button and table in the application. Settings apply instantly and are saved to this browser only — they do not affect other users.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[var(--ui-border)] p-1" aria-label="ভাষা / Language">
            <button type="button" onClick={() => setLanguage('bn')} aria-pressed={language === 'bn'} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${language === 'bn' ? 'bg-[var(--primary-color)] text-[var(--ui-on-accent)]' : 'text-[var(--ui-text-muted)]'}`}>বাংলা</button>
            <button type="button" onClick={() => setLanguage('en')} aria-pressed={language === 'en'} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${language === 'en' ? 'bg-[var(--primary-color)] text-[var(--ui-on-accent)]' : 'text-[var(--ui-text-muted)]'}`}>English</button>
          </div>
          <label className="mr-1 inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={resolved.reduceMotion}
              onChange={(e) => setOverrides({ reduceMotion: e.target.checked })}
              className="h-4 w-4 cursor-pointer accent-[var(--primary-color)]"
            />
            <span className="text-[13px] text-[var(--ui-text-muted)]">{t('Reduce motion')}</span>
          </label>
          {hasOverrides && (
            <button type="button" onClick={resetOverrides} className="ui-btn ui-btn-secondary">
              {t('Reset to theme defaults')}
            </button>
          )}
          <button type="button" onClick={resetAll} className="ui-btn ui-btn-ghost">
            {t('Restore defaults')}
          </button>
        </div>
      </header>

      <div className="mt-[var(--ui-section-gap)] grid grid-cols-1 gap-[var(--ui-section-gap)] xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {/* ---------------- Controls ---------------- */}
        <div className="flex flex-col gap-[var(--ui-section-gap)]">
          <Section>
            <h2 className="text-sm font-semibold text-[var(--ui-text)]">{t('Theme')}</h2>
            <p className="mt-1 text-[13px] text-[var(--ui-text-muted)]">
              {t('Each theme sets its own palette, shape and density. Pick one as a starting point, then adjust anything below.')}
            </p>
            <div className="mt-3">
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
          </Section>

          <Section>
            <ThemeStudio editing={editingTheme} onEditingChange={setEditingTheme} />
          </Section>

          <Section>
            <h2 className="text-sm font-semibold text-[var(--ui-text)]">{t('Density & typography')}</h2>
            <p className="mt-1 text-[13px] text-[var(--ui-text-muted)]">
              {t('Control height drives every input, select and button at once.')}
            </p>

            <div className="mt-4 flex flex-col gap-5">
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
          </Section>

          <Section>
            <FontPicker
              value={resolved.fontFamily}
              onChange={(fontFamily) => setOverrides({ fontFamily })}
            />
          </Section>

          <Section>
            <h2 className="text-sm font-semibold text-[var(--ui-text)]">{t('Field & label style')}</h2>
            <p className="mt-1 text-[13px] text-[var(--ui-text-muted)]">
              {t('How every input is drawn and where its label sits. Inline labels fall back to stacked on phone-width screens.')}
            </p>

            <div className="mt-4 flex flex-col gap-5">
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
          </Section>

          <Section>
            <h2 className="text-sm font-semibold text-[var(--ui-text)]">{t('Shape & borders')}</h2>
            <p className="mt-1 text-[13px] text-[var(--ui-text-muted)]">
              {t('Tune corner radius, border weight and elevation independently of the theme.')}
            </p>

            <div className="mt-4 flex flex-col gap-5">
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
          </Section>

          <Section>
            <AccentPicker
              effective={resolved.palette.accent}
              override={o.accent}
              onChange={(accent) => setOverrides({ accent })}
            />
          </Section>

          <Section>
            <h2 className="text-sm font-semibold text-[var(--ui-text)]">{t('Table & layout')}</h2>
            <p className="mt-1 text-[13px] text-[var(--ui-text-muted)]">
              {t('Row height and content width for data screens, separate from form density.')}
            </p>
            <div className="mt-4 flex flex-col gap-5">
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
          </Section>

          <Section>
            <h2 className="text-sm font-semibold text-[var(--ui-text)]">{t('Dialogs')}</h2>
            <p className="mt-1 text-[13px] text-[var(--ui-text-muted)]">
              {t('Adjust the shared modal and confirmation dialog treatment.')}
            </p>
            <div className="mt-4">
              <OptionCards
                legend={t('Dialog appearance')}
                options={DIALOG_STYLE_OPTIONS}
                value={resolved.dialogStyle}
                onChange={(dialogStyle) => setOverrides({ dialogStyle })}
              />
            </div>
          </Section>

          <Section>
            <h2 className="text-sm font-semibold text-[var(--ui-text)]">{t('Alerts & notifications')}</h2>
            <p className="mt-1 text-[13px] text-[var(--ui-text-muted)]">
              {t('Choose how success, error, and loading notifications are presented.')}
            </p>
            <div className="mt-4">
              <OptionCards
                legend={t('Notification appearance')}
                options={ALERT_STYLE_OPTIONS}
                value={resolved.alertStyle}
                onChange={(alertStyle) => setOverrides({ alertStyle })}
              />
            </div>
          </Section>
          <Section>
            <PresetManager />
          </Section>
        </div>

        {/* ---------------- Preview ---------------- */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <LivePreview />

          <div className="ui-card mt-[var(--ui-section-gap)] p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-[var(--ui-text)]">{t('Current configuration')}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              {[
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
