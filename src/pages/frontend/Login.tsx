import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HiOutlineUser, HiOutlineArrowLeft, HiOutlineCheck, HiOutlineShieldCheck } from 'react-icons/hi'
import { RiDeleteBack2Line } from 'react-icons/ri'
import logoImg from '@/assets/logo.jpeg'
import { PhoneStepSchema, PinStepSchema } from '@/features/auth/login/login.schema'
import { loginApi } from '@/features/auth/login/login.api'
import { LoginSuccessResponse } from '@/features/auth/login/login.types'
import { isSessionValid, saveLoginSession } from '@/utils/auth-storage'
import { showErrorToast, showSuccessToast } from '@/utils/toast-utils'

const PIN_LENGTH = 4

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/admin'

  // If user is already authenticated, redirect straight to dashboard
  useEffect(() => {
    if (isSessionValid()) {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  // Step State (1: Phone / Identifier, 2: 4-digit PIN)
  const [step, setStep] = useState<1 | 2>(1)
  const [identifier, setIdentifier] = useState('01317020309')
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

  // Step 1: Submit Phone Number Handler
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanNumber = identifier.trim().replace(/[\s-]/g, '')
    const validation = PhoneStepSchema.safeParse({ phone: cleanNumber, rememberMe })

    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Please enter a valid mobile number'
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
            ? 'Account not found for this mobile number.'
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

      // 3. Fallback to user-login endpoint
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eaf3f9] via-[#dcebf5] to-[#cfe2f0] flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans antialiased text-slate-800">
      
      {/* Outer Card Container (Reduced height and compact sleek layout with reduced rounded corners) */}
      <div className="relative w-full max-w-[860px] bg-white rounded-xl sm:rounded-2xl shadow-[0_25px_60px_-10px_rgba(0,119,182,0.22),0_0_0_1px_rgba(255,255,255,0.9)] overflow-hidden flex flex-col md:flex-row min-h-0 sm:min-h-[450px]">
        
        {/* ================= LEFT HERO PANEL (Vibrant Brand Blue Gradient) ================= */}
        <div className="relative w-full md:w-[46%] bg-gradient-to-br from-[#063566] via-[#085a9c] to-[#009fe3] text-white p-6 sm:p-7 md:p-8 flex flex-col justify-center items-center text-center overflow-hidden">
          
          {/* Luminous Glow Overlays */}
          <div className="absolute -top-14 -left-14 w-52 h-52 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-[#00d2ff]/25 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-white/5 blur-3xl pointer-events-none" />

          {/* Organic Curved Wave Divider for MD+ */}
          <div className="hidden md:block absolute -right-[1px] top-0 bottom-0 w-20 pointer-events-none overflow-hidden h-full z-10">
            <svg
              className="h-full w-full text-white fill-current"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path d="M0,0 C65,22 65,78 0,100 L100,100 L100,0 Z" />
            </svg>
          </div>

          {/* Left Panel Content Container */}
          <div className="z-10 my-auto w-full max-w-[340px] pr-5 sm:pr-7 md:pr-9 flex flex-col justify-center">
            {/* Top: Logo (Centered) */}
            <div className="flex items-center justify-center mb-5">
              <div className="h-12 sm:h-13 px-4 sm:px-5 rounded-xl sm:rounded-2xl bg-white shadow-[0_10px_25px_rgba(0,0,0,0.25)] ring-4 ring-white/40 flex items-center justify-center">
                <img
                  src={logoImg}
                  alt="Cash Boi Logo"
                  className="h-8 sm:h-9 w-auto object-contain"
                />
              </div>
            </div>

            {/* Description (Full white) */}
            <p className="text-xs text-white leading-relaxed font-normal mb-4 text-left">
              Manage your business finances efficiently. Access invoices, sales, expenses, and comprehensive insights from one unified dashboard.
            </p>

            {/* Feature Points */}
            <div className="space-y-2.5 pt-0.5">
              <div className="flex items-center gap-2 text-xs text-white font-medium">
                <span className="shrink-0 w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400 text-amber-400 flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </span>
                <span className="text-white">Real-time financial tracking</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white font-medium">
                <span className="shrink-0 w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400 text-amber-400 flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </span>
                <span className="text-white">Secure business data</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-white font-medium">
                <span className="shrink-0 w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400 text-amber-400 flex items-center justify-center text-[10px] font-bold shadow-xs">
                  ✓
                </span>
                <span className="text-white">Instant reporting & analytics</span>
              </div>
            </div>
          </div>

        </div>

        {/* ================= RIGHT FORM PANEL (Compact Y-Axis Spacing) ================= */}
        <div className="relative w-full md:w-[54%] bg-white p-6 sm:p-7 md:p-8 flex flex-col justify-center">
          
          <div className="relative z-10 my-auto">
            {/* Header (Reduced bottom margin) */}
            <div className="text-center mb-5 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-semibold text-[#085a9c] tracking-tight">
                Login to Account
              </h1>
              <p className="text-xs text-black mt-1 font-normal">
                {step === 1
                  ? 'Enter your mobile number to continue'
                  : 'Enter your 4-digit PIN code to proceed'}
              </p>
            </div>

            {/* Step 1: Mobile Number Input Form */}
            {step === 1 && (
              <form onSubmit={handleContinue} className="space-y-3 max-w-sm mx-auto">
                <div>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 flex items-center pointer-events-none text-[#009fe3]">
                      <HiOutlineUser className="w-4.5 h-4.5" />
                    </div>
                    <input
                      type="tel"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Mobile Number..."
                      disabled={isCheckingUser}
                      className="w-full rounded-full bg-[#e8f4fc] hover:bg-[#e0effa] focus:bg-white border-2 border-transparent focus:border-[#009fe3] pl-11 pr-4 py-2.5 sm:py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#009fe3]/20 transition-all font-semibold disabled:opacity-60 shadow-inner"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between px-1.5 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                        rememberMe
                          ? 'bg-[#009fe3] border-[#009fe3] shadow-xs'
                          : 'bg-white border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {rememberMe && <HiOutlineCheck className="w-3 h-3 text-white stroke-[3]" />}
                    </div>
                    <span className="text-xs text-black font-medium">
                      Remember me
                    </span>
                  </label>
                </div>

                {/* Submit / Continue Button */}
                <div className="pt-1.5">
                  <button
                    type="submit"
                    disabled={isCheckingUser}
                    className="w-full rounded-full bg-gradient-to-r from-[#009fe3] via-[#0878c7] to-[#085a9c] text-white font-bold py-2.5 sm:py-3 text-sm tracking-wider shadow-md shadow-[#009fe3]/30 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed uppercase"
                  >
                    {isCheckingUser ? (
                      <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'CONTINUE'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: 4-Digit PIN Input Form */}
            {step === 2 && (
              <form onSubmit={handleLoginSubmit} className="space-y-4 max-w-sm mx-auto">
                {/* 4 Digit PIN Input Boxes */}
                <div className="pt-0.5">
                  <label className="block text-center text-xs font-bold uppercase tracking-wider text-black mb-2.5">
                    ENTER 4-DIGIT PIN
                  </label>
                  <div className="flex justify-center gap-2.5 sm:gap-3">
                    {pin.map((digit, idx) => {
                      const isCurrent = focusedIndex === idx
                      return (
                        <input
                          key={idx}
                          ref={pinInputRefs[idx]}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          disabled={isLoggingIn}
                          value={digit}
                          onFocus={() => setFocusedIndex(idx)}
                          onChange={(e) => handlePinChange(idx, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(idx, e)}
                          onPaste={handlePinPaste}
                          className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-2xl transition-all duration-200 outline-none ${
                            isCurrent
                              ? 'border-2 border-[#009fe3] bg-white text-[#085a9c] shadow-md shadow-[#009fe3]/25 ring-4 ring-[#009fe3]/20'
                              : digit
                              ? 'border-2 border-[#009fe3]/50 bg-[#e8f4fc] text-[#085a9c]'
                              : 'border-2 border-transparent bg-[#e8f4fc] text-slate-800 hover:bg-[#e0effa]'
                          } ${isLoggingIn ? 'opacity-60 cursor-not-allowed' : ''}`}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Back / Clear Controls */}
                <div className="flex items-center justify-between text-xs font-semibold px-1.5">
                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={() => {
                      setStep(1)
                      setPin(Array(PIN_LENGTH).fill(''))
                    }}
                    className="inline-flex items-center gap-1.5 text-[#009fe3] hover:text-[#085a9c] cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <HiOutlineArrowLeft className="w-3.5 h-3.5" />
                    <span>Change number</span>
                  </button>

                  <button
                    type="button"
                    disabled={isLoggingIn}
                    onClick={handleClearPin}
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <RiDeleteBack2Line className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>

                {/* Submit / Login Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full rounded-full bg-gradient-to-r from-[#009fe3] via-[#0878c7] to-[#085a9c] text-white font-bold py-2.5 sm:py-3 text-sm tracking-wider shadow-md shadow-[#009fe3]/30 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed uppercase"
                  >
                    {isLoggingIn ? (
                      <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'LOG IN'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Bottom Developed & Maintained Footer */}
            <div className="text-center mt-4 pt-1">
              <p className="text-[11px] sm:text-xs font-medium text-black">
                Developed and Maintaince by{' '}
                <a
                  href="https://www.webnstech.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-500 font-semibold cursor-pointer"
                >
                  webens technology ltd
                </a>
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
