import React, { useState } from 'react'
import { useAppearanceLanguage } from '../appearance-language'

type PreviewTab = 'form' | 'table' | 'actions' | 'dialog'

const TABS: { id: PreviewTab; label: string }[] = [
  { id: 'form', label: 'Form' },
  { id: 'table', label: 'Table' },
  { id: 'actions', label: 'Buttons' },
  { id: 'dialog', label: 'Dialog' },
]

const ROWS = [
  ['INV-10432', 'Ammaah Optics', 'Paid', '৳ 12,500.00'],
  ['INV-10433', 'Ma Telecom', 'Due', '৳ 3,180.00'],
  ['INV-10434', 'Rahim Stores', 'Partial', '৳ 48,900.00'],
]

/**
 * Renders the real primitives rather than mock-ups, so this is exactly what
 * forms, tables and buttons will look like under the current settings.
 */
export const LivePreview: React.FC = () => {
  const { language, t } = useAppearanceLanguage()
  const [tab, setTab] = useState<PreviewTab>('form')
  const [text, setText] = useState('Ammaah Optics')
  const [amount, setAmount] = useState('12,500.00')

  return (
    <div className="ui-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--ui-text)]">{t('Live preview')}</h3>
        <span className="text-[11px] uppercase tracking-wide text-[var(--ui-text-subtle)]">
          {t('Real components')}
        </span>
      </div>

      {/* Tabs */}
      <div
        className="mt-3 flex gap-1 border border-[var(--ui-border)] p-1"
        role="tablist"
        style={{ borderRadius: 'var(--ui-radius)' }}
      >
        {TABS.map((tabOption) => (
          <button
            key={tabOption.id}
            type="button"
            role="tab"
            aria-selected={tab === tabOption.id}
            onClick={() => setTab(tabOption.id)}
            className={`flex-1 cursor-pointer px-2 py-1.5 text-[12px] font-medium transition ${
              tab === tabOption.id
                ? 'bg-[var(--primary-color)] text-[var(--ui-on-accent)]'
                : 'text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-muted)]'
            }`}
            style={{ borderRadius: 'calc(var(--ui-radius) - 2px)' }}
          >
            {t(tabOption.label)}
          </button>
        ))}
      </div>

      {/* ---------------- Form ---------------- */}
      {tab === 'form' && (
        <div className="mt-4 flex flex-col gap-[var(--ui-field-gap)]">
          <div className="ui-field">
            <label htmlFor="pv-name" className="ui-label">
              {t('Customer name')}
            </label>
            <input
              id="pv-name"
              className="ui-control"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label htmlFor="pv-amount" className="ui-label ui-label-required">
              {t('Invoice amount')}
            </label>
            <input
              id="pv-amount"
              className="ui-control text-right"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="ui-field">
            <label htmlFor="pv-type" className="ui-label">
              {t('Payment method')}
            </label>
            <select id="pv-type" className="ui-control ui-select" defaultValue="cash">
              <option value="cash">{t('Cash')}</option>
              <option value="bank">{t('Bank transfer')}</option>
              <option value="mobile">{t('Mobile banking')}</option>
            </select>
          </div>

          <div className="ui-field">
            <label htmlFor="pv-disabled" className="ui-label">
              {t('Reference (read-only)')}
            </label>
            <input id="pv-disabled" className="ui-control" defaultValue="PO-2291" readOnly />
          </div>

          <div className="ui-field">
            <label htmlFor="pv-error" className="ui-label ui-label-required">
              {t('Discount')}
            </label>
            <input id="pv-error" className="ui-control is-invalid" defaultValue="-45" />
            <p className="ui-error">{t('Discount cannot be negative')}</p>
          </div>

          <div className="ui-field">
            <label htmlFor="pv-note" className="ui-label">
              {t('Note')}
            </label>
            <textarea
              id="pv-note"
              className="ui-control ui-control-multiline"
              defaultValue="Delivered against PO-2291. Balance settles next cycle."
            />
            <p className="ui-help">{t('Shown on the printed invoice.')}</p>
          </div>
        </div>
      )}

      {/* ---------------- Table ---------------- */}
      {tab === 'table' && (
        <div
          className="mt-4 overflow-hidden border border-[var(--ui-border)]"
          style={{ borderRadius: 'var(--ui-radius)' }}
        >
          <table className="ui-table w-full border-collapse">
            <thead>
              <tr>
                <th>{t('Invoice')}</th>
                <th>{t('Customer')}</th>
                <th>{t('Status')}</th>
                <th className="text-right">{t('Amount')}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([inv, cust, status, amt]) => (
                <tr key={inv} className="border-t border-[var(--ui-border)]">
                  <td className="font-medium text-[var(--ui-text)]">{inv}</td>
                  <td className="text-[var(--ui-text-muted)]">{cust}</td>
                  <td>
                    <span
                      className="inline-block px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        borderRadius: 'var(--ui-radius-sm)',
                        backgroundColor:
                          status === 'Paid'
                            ? 'color-mix(in srgb, var(--ui-success) 14%, transparent)'
                            : status === 'Due'
                              ? 'color-mix(in srgb, var(--ui-danger) 12%, transparent)'
                              : 'color-mix(in srgb, var(--ui-warning) 16%, transparent)',
                        color:
                          status === 'Paid'
                            ? 'var(--ui-success)'
                            : status === 'Due'
                              ? 'var(--ui-danger)'
                              : 'var(--ui-warning)',
                      }}
                    >
                      {t(status)}
                    </span>
                  </td>
                  <td className="text-right font-semibold text-[var(--ui-text)]">{amt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------- Buttons ---------------- */}
      {tab === 'actions' && (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p className="ui-label mb-2">{t('Variants')}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="ui-btn ui-btn-primary">
                {t('Save invoice')}
              </button>
              <button type="button" className="ui-btn ui-btn-secondary">
                {t('Cancel')}
              </button>
              <button type="button" className="ui-btn ui-btn-subtle">
                {t('Duplicate')}
              </button>
              <button type="button" className="ui-btn ui-btn-danger">
                {t('Delete')}
              </button>
              <button type="button" className="ui-btn ui-btn-ghost">
                {t('More')}
              </button>
              <button type="button" className="ui-btn ui-btn-primary" disabled>
                {t('Disabled')}
              </button>
            </div>
          </div>

          <div>
            <p className="ui-label mb-2">{t('Selection controls')}</p>
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 cursor-pointer accent-[var(--primary-color)]"
                />
                <span className="text-[13px] text-[var(--ui-text-muted)]">{t('Mark as paid')}</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="pv-radio"
                  defaultChecked
                  className="h-4 w-4 cursor-pointer accent-[var(--primary-color)]"
                />
                <span className="text-[13px] text-[var(--ui-text-muted)]">{t('Cash')}</span>
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="pv-radio"
                  className="h-4 w-4 cursor-pointer accent-[var(--primary-color)]"
                />
                <span className="text-[13px] text-[var(--ui-text-muted)]">{t('Credit')}</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Dialog ---------------- */}
      {tab === 'dialog' && (
        <div
          className="mt-4 p-5"
          style={{
            backgroundColor: 'var(--ui-surface-sunken)',
            borderRadius: 'var(--ui-radius)',
          }}
        >
          <div className="ui-card mx-auto max-w-sm overflow-hidden">
            <div className="border-b border-[var(--ui-border)] px-4 py-3">
              <h4 className="text-[15px] font-semibold text-[var(--ui-text)]">{t('Delete invoice?')}</h4>
            </div>
            <div className="px-4 py-4">
              <p className="text-[13px] leading-5 text-[var(--ui-text-muted)]">
                {language === 'bn'
                  ? 'INV-10434 মুছে যাবে এবং কাস্টমারের হিসাবও বদলে যাবে। মুছে ফেললে আর ফেরত আনা যাবে না।'
                  : 'INV-10434 will be removed and the customer ledger adjusted. This cannot be undone.'}
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--ui-border)] bg-[var(--ui-surface-muted)] px-4 py-3">
              <button type="button" className="ui-btn ui-btn-secondary">
                {t('Cancel')}
              </button>
              <button type="button" className="ui-btn ui-btn-danger">
                {t('Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LivePreview
