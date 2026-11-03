import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import logoImg from '@/assets/logo.jpeg'
import {
  IdentifierStepSchema,
  PinStepSchema,
  isEmailIdentifier,
  normalizeIdentifier,
} from '@/features/auth/login/login.schema'
import { loginApi } from '@/features/auth/login/login.api'
import { LoginSuccessResponse } from '@/features/auth/login/login.types'
import { isSessionValid, saveLoginSession } from '@/utils/auth-storage'
import { showErrorToast, showSuccessToast } from '@/utils/toast-utils'

const PIN_LENGTH = 4

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedRedirect = searchParams.get('redirect')
  const redirectUrl =
    requestedRedirect?.startsWith('/') &&
    !requestedRedirect.startsWith('//') &&
    !requestedRedirect.startsWith('/\\')
      ? requestedRedirect
      : '/admin'

  // If user is already authenticated, redirect straight to dashboard
  useEffect(() => {
    if (isSessionValid()) {
      navigate(redirectUrl, { replace: true })
    }
  }, [navigate, redirectUrl])

  // Step State (1: Phone / Identifier, 2: 4-digit PIN)
  const [step, setStep] = useState<1 | 2>(1)
  const [identifier, setIdentifier] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [userData, setUserData] = useState<LoginSuccessResponse | null>(null)
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''))
  const [focusedIndex, setFocusedIndex] = useState<number>(0)
  const [isCheckingUser, setIsCheckingUser] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // PIN input element references
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  // Step 1: Submit identifier (mobile number or email)
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanNumber = normalizeIdentifier(identifier)
    const validation = IdentifierStepSchema.safeParse({ identifier: cleanNumber, rememberMe })

    if (!validation.success) {
      const firstError =
        validation.error.errors[0]?.message || 'Please enter a valid mobile number or email address'
      showErrorToast(firstError)
      return
    }

    setIdentifier(cleanNumber)
    setIsCheckingUser(true)

    try {
      const res = await loginApi.checkUser(cleanNumber)
      if (
        (res as any).error ||
        String(res.status).toLowerCase() === 'error'
      ) {
        const errorMsg =
          (res as any).msg === 'Phone number is available'
            ? 'No account found for this mobile number or email.'
            : (res as any).msg || (res as any).message || 'Account verification failed.'
        showErrorToast(errorMsg)
        return
      }

      setUserData(res as LoginSuccessResponse)
      setPin(Array(PIN_LENGTH).fill(''))
      setFocusedIndex(0)
      setStep(2)
      setTimeout(() => {
        pinInputRefs[0]?.current?.focus()
      }, 50)
    } catch (err: any) {
      showErrorToast(err?.message || 'Failed to verify account.')
    } finally {
      setIsCheckingUser(false)
    }
  }

  // Step 2: Handle single PIN digit change
  const handlePinChange = (index: number, value: string) => {
    const cleanedVal = value.replace(/\D/g, '')

    if (!cleanedVal) {
      const newPin = [...pin]
      newPin[index] = ''
      setPin(newPin)
      return
    }

    const char = cleanedVal.slice(-1)
    const newPin = [...pin]
    newPin[index] = char
    setPin(newPin)

    // Auto-advance to next input
    if (index < PIN_LENGTH - 1) {
      setFocusedIndex(index + 1)
      pinInputRefs[index + 1]?.current?.focus()
    } else {
      // If 4th digit entered, auto-submit if complete
      const fullPin = newPin.join('')
      if (fullPin.length === PIN_LENGTH) {
        submitLogin(fullPin)
      }
    }
  }

  // Step 2: Keyboard navigation (Backspace, Left/Right arrows)
  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (pin[index] === '' && index > 0) {
        setFocusedIndex(index - 1)
        pinInputRefs[index - 1]?.current?.focus()
      } else {
        const newPin = [...pin]
        newPin[index] = ''
        setPin(newPin)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setFocusedIndex(index - 1)
      pinInputRefs[index - 1]?.current?.focus()
    } else if (e.key === 'ArrowRight' && index < PIN_LENGTH - 1) {
      setFocusedIndex(index + 1)
      pinInputRefs[index + 1]?.current?.focus()
    }
  }

  // Step 2: Paste clipboard PIN
  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH)
    if (!pastedData) return

    const newPin = Array(PIN_LENGTH).fill('')
    for (let i = 0; i < pastedData.length; i++) {
      newPin[i] = pastedData[i]
    }
    setPin(newPin)

    if (pastedData.length === PIN_LENGTH) {
      setFocusedIndex(PIN_LENGTH - 1)
      pinInputRefs[PIN_LENGTH - 1]?.current?.focus()
      submitLogin(pastedData)
    } else {
      const nextIndex = Math.min(pastedData.length, PIN_LENGTH - 1)
      setFocusedIndex(nextIndex)
      pinInputRefs[nextIndex]?.current?.focus()
    }
  }

  // Clear all PIN boxes
  const handleClearPin = () => {
    setPin(Array(PIN_LENGTH).fill(''))
    setFocusedIndex(0)
    pinInputRefs[0]?.current?.focus()
  }

  // Step 2: Submit PIN to backend
  const submitLogin = async (pinCode: string) => {
    const pinValidation = PinStepSchema.safeParse({ pin: pinCode })
    if (!pinValidation.success) {
      const pinErr = pinValidation.error.errors[0]?.message || 'Please enter 4-digit PIN'
      showErrorToast(pinErr)
      return
    }

    setIsLoggingIn(true)

    try {
      // 1. Direct PIN validation against retrieved user profile
      if (userData && userData.pin) {
        if (userData.pin === pinCode) {
          saveLoginSession(userData, rememberMe)
          showSuccessToast('Login successful!')
          setTimeout(() => {
            navigate(redirectUrl, { replace: true })
          }, 600)
          return
        } else {
          showErrorToast('Invalid PIN. Please try again.')
          setPin(Array(PIN_LENGTH).fill(''))
          setFocusedIndex(0)
          setTimeout(() => {
            pinInputRefs[0]?.current?.focus()
          }, 50)
          return
        }
      }

      // 2. Fallback check via checkUser
      const checkRes = await loginApi.checkUser(identifier)
      if (
        !(checkRes as any).error &&
        String(checkRes.status).toLowerCase() === 'success' &&
        (checkRes as LoginSuccessResponse).pin
      ) {
        const userRes = checkRes as LoginSuccessResponse
        if (userRes.pin === pinCode) {
          saveLoginSession(userRes, rememberMe)
          showSuccessToast('Login successful!')
          setTimeout(() => {
            navigate(redirectUrl, { replace: true })
          }, 600)
          return
        } else {
          showErrorToast('Invalid PIN. Please try again.')
          setPin(Array(PIN_LENGTH).fill(''))
          setFocusedIndex(0)
          setTimeout(() => {
            pinInputRefs[0]?.current?.focus()
          }, 50)
          return
        }
      }

      // 3. Fallback to standard login
      const response = await loginApi.loginUser({
        authentication: {
          phone_number: identifier,
          password: pinCode,
          pin: pinCode,
        },
        fcm_token: 'web_client_token',
        login_version: '1.0.1',
      })

      if (
        (response as any).error ||
        String(response.status).toLowerCase() === 'error' ||
        !('token' in response) ||
        !response.token
      ) {
        const rawMsg = (response as any).msg || (response as any).message
        const errorMsg =
          rawMsg === 'Invalid password'
            ? 'Invalid PIN. Please try again.'
            : rawMsg || 'Login failed. Please check credentials.'
        showErrorToast(errorMsg)
        setPin(Array(PIN_LENGTH).fill(''))
        setFocusedIndex(0)
        setTimeout(() => {
          pinInputRefs[0]?.current?.focus()
        }, 50)
        return
      }

      saveLoginSession(response as LoginSuccessResponse, rememberMe)
      showSuccessToast('Login successful!')
      setTimeout(() => {
        navigate(redirectUrl, { replace: true })
      }, 600)
    } catch (err: any) {
      showErrorToast(err?.message || 'Failed to login. Please try again.')
      setPin(Array(PIN_LENGTH).fill(''))
      setFocusedIndex(0)
      setTimeout(() => {
        pinInputRefs[0]?.current?.focus()
      }, 50)
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitLogin(pin.join(''))
  }


  // Identity line shown on the PIN step, built from the checkUser response
  const accountName = userData?.fullName?.trim() || ''
  const businessName = userData?.businessName?.trim() || ''

  // Partially mask the identifier so the user can confirm it without exposing it
  const maskedIdentifier = (() => {
    if (!identifier) return ''
    if (isEmailIdentifier(identifier)) {
      const [name, domain] = identifier.split('@')
      const head = name.slice(0, 2)
      return `${head}${'•'.repeat(Math.max(name.length - 2, 1))}@${domain}`
    }
    return identifier.length > 4
      ? `${'•'.repeat(identifier.length - 4)}${identifier.slice(-4)}`
      : identifier
  })()

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[var(--ui-surface-sunken)] px-4 py-6 sm:px-6 sm:py-10">
      {/* page-level ambient wash */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(1,48,107,0.07),transparent_60%)]" />

      <div className="relative grid w-full max-w-[64rem] overflow-hidden rounded-2xl border border-[var(--ui-border)]/70 bg-[var(--ui-surface)] shadow-[0_28px_80px_-36px_rgba(15,23,42,0.4)] lg:grid-cols-2">
        {/* ===================== Brand panel ===================== */}
        <aside className="relative hidden flex-col justify-center overflow-hidden bg-gradient-to-br from-[var(--ui-text)] via-[var(--primary-color-dark)] to-[var(--primary-color)] px-12 py-14 lg:flex">
          <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="pointer-events-none absolute right-0 top-20 h-px w-24 bg-gradient-to-r from-transparent to-[var(--ui-surface)]/30" />

          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
              Business Management Suite
            </p>
            <h2 className="mt-4 text-[2rem] font-bold leading-tight tracking-tight text-white">
              Welcome to Cash&nbsp;Boi
            </h2>
            <p className="mt-4 max-w-sm text-[15px] leading-7 text-white/60">
              Run sales, purchases, inventory and accounts from one system —
              with every transaction posted to the ledger as it happens.
            </p>

            <ul className="mt-10 space-y-4 border-t border-[var(--ui-surface)]/10 pt-8">
              {[
                { title: 'Sales & purchases', detail: 'Quotations, orders, invoices, returns' },
                { title: 'Inventory control', detail: 'Products, categories, live stock' },
                { title: 'Parties & collections', detail: 'Customer and supplier ledgers' },
                { title: 'Financial reporting', detail: 'Sales, purchase and account reports' },
              ].map((item) => (
                <li key={item.title} className="flex gap-3.5">
                  <span className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-[var(--primary-color-muted)]/40 bg-[var(--ui-accent-2)]/15">
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-[var(--ui-accent-2)]" aria-hidden="true">
                      <path
                        d="M1.5 6.2 4.4 9 10.5 2.8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{item.title}</span>
                    <span className="block text-[13px] leading-5 text-white/45">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative mt-12 text-[11px] text-white/30">
            &copy; {new Date().getFullYear()} Cash Boi. All rights reserved.
          </p>
        </aside>

        {/* ===================== Sign-in panel ===================== */}
        <section className="flex flex-col justify-center bg-[var(--ui-surface)] px-6 py-12 sm:px-12 sm:py-14">
          <div className="mx-auto w-full max-w-[21rem]">
            {/* logo */}
            <div className="flex justify-center">
              <img src={logoImg} alt="Cash Boi" className="h-12 w-auto object-contain" />
            </div>

            {/* step indicator */}
            <div
              className="mt-7 flex items-center justify-center gap-2"
              role="group"
              aria-label={`Step ${step} of 2`}
            >
              <span className="h-2 w-2 rounded-full bg-[var(--primary-color)]" />
              <span
                className={`h-px w-10 transition-colors ${step === 2 ? 'bg-[var(--primary-color)]' : 'bg-[var(--ui-border)]'}`}
              />
              <span
                className={`h-2 w-2 rounded-full transition-colors ${
                  step === 2 ? 'bg-[var(--primary-color)]' : 'bg-[var(--ui-border-strong)]'
                }`}
              />
            </div>

            {/* heading */}
            <h1 className="mt-6 text-center text-[1.6rem] font-bold tracking-tight text-[var(--ui-text)]">
              {step === 1 ? 'Login to Account' : 'Enter your PIN'}
            </h1>
            <p className="mt-2 text-center text-sm leading-6 text-[var(--ui-text-muted)]">
              {step === 1 ? (
                'Enter your mobile number or email to continue'
              ) : accountName || businessName ? (
                <>
                  Welcome back
                  {accountName ? `, ${accountName}` : ''}
                  {businessName ? (
                    <span className="mt-0.5 block text-[13px] text-[var(--ui-text-subtle)]">{businessName}</span>
                  ) : null}
                </>
              ) : (
                'Enter your 4-digit PIN to continue'
              )}
            </p>

            {/* ---------- Step 1: identifier ---------- */}
            {step === 1 && (
              <form onSubmit={handleContinue} className="mt-9 space-y-5">
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-text-muted)]"
                  >
                    Mobile / Email <span className="text-[var(--ui-danger)]">*</span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ui-text-subtle)]">
                      <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden="true">
                        <path
                          d="M10 10.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM3.6 17.2c0-2.9 2.9-5.2 6.4-5.2s6.4 2.3 6.4 5.2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <input
                      id="login-identifier"
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="01XXXXXXXXX or name@company.com"
                      disabled={isCheckingUser}
                      autoComplete="username"
                      autoFocus
                      inputMode="email"
                      className="h-12 w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/70 pl-11 pr-4 text-sm text-[var(--ui-text)] outline-none transition placeholder:text-[var(--ui-text-subtle)] hover:border-[var(--ui-border-strong)] focus:border-[var(--primary-color)] focus:bg-[var(--ui-surface)] focus:ring-[3px] focus:ring-[var(--primary-color)]/12 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                </div>

                <label className="flex w-fit cursor-pointer select-none items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-[var(--ui-border-strong)] accent-[var(--primary-color)]"
                  />
                  <span className="text-[13px] text-[var(--ui-text-muted)]">Remember me</span>
                </label>

                <button
                  type="submit"
                  disabled={isCheckingUser}
                  className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--primary-color)] text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-color-hover)] focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-color)]/25 disabled:cursor-not-allowed disabled:bg-[var(--ui-text-subtle)]"
                >
                  {isCheckingUser ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ui-surface)]/35 border-t-white" />
                      Checking
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>
            )}

            {/* ---------- Step 2: PIN ---------- */}
            {step === 2 && (
              <form onSubmit={handleLoginSubmit} className="mt-9 space-y-5">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/70 px-3.5 py-2.5">
                  <span className="truncate text-[13px] font-medium tracking-wide text-[var(--ui-text)]">
                    {maskedIdentifier}
                  </span>
                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={() => {
                      setStep(1)
                      setPin(Array(PIN_LENGTH).fill(''))
                    }}
                    className="shrink-0 cursor-pointer text-[13px] font-semibold text-[var(--primary-color)] underline-offset-2 transition hover:underline disabled:opacity-50"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ui-text-muted)]">
                      4-digit PIN <span className="text-[var(--ui-danger)]">*</span>
                    </span>
                    <button
                      type="button"
                      disabled={isLoggingIn}
                      onClick={handleClearPin}
                      className="cursor-pointer text-[13px] text-[var(--ui-text-subtle)] underline-offset-2 transition hover:text-[var(--primary-color)] hover:underline disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex gap-3">
                    {pin.map((digit, idx) => {
                      const isCurrent = focusedIndex === idx
                      return (
                        <input
                          key={idx}
                          ref={pinInputRefs[idx]}
                          type="password"
                          inputMode="numeric"
                          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                          aria-label={`PIN digit ${idx + 1}`}
                          maxLength={1}
                          disabled={isLoggingIn}
                          value={digit}
                          onFocus={() => setFocusedIndex(idx)}
                          onChange={(e) => handlePinChange(idx, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(idx, e)}
                          onPaste={handlePinPaste}
                          className={`h-14 min-w-0 flex-1 rounded-lg border text-center text-xl font-semibold text-[var(--ui-text)] outline-none transition ${
                            isCurrent
                              ? 'border-[var(--primary-color)] bg-[var(--ui-surface)] ring-[3px] ring-[var(--primary-color)]/12'
                              : digit
                                ? 'border-[var(--primary-color)]/45 bg-[var(--ui-surface)]'
                                : 'border-[var(--ui-border)] bg-[var(--ui-surface-muted)]/70 hover:border-[var(--ui-border-strong)]'
                          } ${isLoggingIn ? 'cursor-not-allowed opacity-60' : ''}`}
                        />
                      )
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--primary-color)] text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-color-hover)] focus:outline-none focus:ring-[3px] focus:ring-[var(--primary-color)]/25 disabled:cursor-not-allowed disabled:bg-[var(--ui-text-subtle)]"
                >
                  {isLoggingIn ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ui-surface)]/35 border-t-white" />
                      Signing in
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
              </form>
            )}

            <p className="mt-8 text-center text-[13px] text-[var(--ui-text-subtle)]">
              Trouble signing in? Contact your account administrator.
            </p>

            <div className="mt-6 border-t border-[var(--ui-border)] pt-5 text-center text-[11px] text-[var(--ui-text-subtle)]">
              Developed &amp; maintained by{' '}
              <a
                href="https://www.webnstech.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--primary-color)] underline-offset-2 hover:underline"
              >
                Webens Technology Ltd.
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
