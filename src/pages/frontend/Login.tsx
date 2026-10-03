import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { HiOutlineUser, HiOutlineArrowLeft, HiOutlineCheck } from 'react-icons/hi'
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
      const firstError = validation.error.errors[0]?.message || 'সঠিক মোবাইল নম্বর দিন'
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
            ? 'এই মোবাইল নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি।'
            : (res as any).msg || (res as any).message || 'অ্যাকাউন্ট যাচাই ব্যর্থ হয়েছে।'
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
      showErrorToast(err?.message || 'অ্যাকাউন্ট যাচাই করতে সমস্যা হয়েছে।')
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
      const pinErr = pinValidation.error.errors[0]?.message || '৪ ডিজিটের পিন দিন'
      showErrorToast(pinErr)
      return
    }

    setIsLoggingIn(true)

    try {
      // 1. Direct PIN validation against retrieved user profile
      if (userData && userData.pin) {
        if (userData.pin === pinCode) {
          saveLoginSession(userData, rememberMe)
          showSuccessToast('লগইন সফল হয়েছে! ড্যাশবোর্ডে নেওয়া হচ্ছে...')
          setTimeout(() => {
            navigate(redirectUrl, { replace: true })
          }, 600)
          return
        } else {
          showErrorToast('ভুল পিন দিয়েছেন! সঠিক পিন দিন।')
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
          showSuccessToast('লগইন সফল হয়েছে! ড্যাশবোর্ডে নেওয়া হচ্ছে...')
          setTimeout(() => {
            navigate(redirectUrl, { replace: true })
          }, 600)
          return
        } else {
          showErrorToast('ভুল পিন দিয়েছেন! সঠিক পিন দিন।')
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
        !response.token
      ) {
        const rawMsg = (response as any).msg || (response as any).message
        const errorMsg =
          rawMsg === 'Invalid password'
            ? 'ভুল পিন দিয়েছেন! সঠিক পিন দিন।'
            : rawMsg || 'লগইন ব্যর্থ হয়েছে। নম্বর এবং পিন যাচাই করুন।'
        showErrorToast(errorMsg)
        setPin(Array(PIN_LENGTH).fill(''))
        setFocusedIndex(0)
        setTimeout(() => {
          pinInputRefs[0]?.current?.focus()
        }, 50)
        return
      }

      saveLoginSession(response as LoginSuccessResponse, rememberMe)
      showSuccessToast('লগইন সফল হয়েছে! ড্যাশবোর্ডে নেওয়া হচ্ছে...')
      setTimeout(() => {
        navigate(redirectUrl, { replace: true })
      }, 600)
    } catch (err: any) {
      showErrorToast(err?.message || 'লগইন করতে সমস্যা হয়েছে।')
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
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-4 sm:p-6 font-sans antialiased text-slate-800">
      {/* Centered Auth Card */}
      <div className="w-full max-w-[400px] bg-white rounded-3xl border border-slate-100 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.06)] px-7 py-8 sm:px-8 sm:py-9 flex flex-col items-center">
        {/* Brand Logo */}
        <div className="mb-4 select-none">
          <img
            src={logoImg}
            alt="ক্যাশ বই"
            className="h-11 sm:h-12 w-auto object-contain mx-auto"
          />
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              step === 1 ? 'bg-[#1d4ed8]' : 'bg-[#93c5fd]'
            }`}
          />
          <div
            className={`w-8 h-[2px] transition-colors ${
              step === 1 ? 'bg-slate-200' : 'bg-[#93c5fd]'
            }`}
          />
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              step === 2 ? 'bg-[#1d4ed8]' : 'bg-slate-200'
            }`}
          />
        </div>

        {/* STEP 1: ENTER MOBILE NUMBER */}
        {step === 1 && (
          <div className="w-full">
            {/* Heading */}
            <div className="text-center mb-6">
              <h1 className="text-[21px] sm:text-[22px] font-bold text-slate-900 tracking-tight">
                Login to Account
              </h1>
              <p className="text-[13px] text-slate-500 mt-1 font-normal">
                Enter your mobile number to continue
              </p>
            </div>

            <form onSubmit={handleContinue} className="space-y-4">
              {/* Input Field */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  MOBILE NUMBER <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                    <HiOutlineUser className="w-[18px] h-[18px]" />
                  </div>
                  <input
                    type="tel"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="01317020309"
                    disabled={isCheckingUser}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 sm:py-3 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/15 transition-all font-normal disabled:opacity-60"
                    autoFocus
                  />
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                      rememberMe
                        ? 'bg-[#1d4ed8] border-[#1d4ed8]'
                        : 'bg-white border-slate-300'
                    }`}
                  >
                    {rememberMe && <HiOutlineCheck className="w-3 h-3 text-white stroke-[3]" />}
                  </div>
                  <span className="text-[13px] text-slate-700 font-medium">
                    Remember me
                  </span>
                </label>
              </div>

              {/* Continue Button */}
              <button
                type="submit"
                disabled={isCheckingUser}
                className="w-full mt-2 rounded-xl bg-[#0e3a71] hover:bg-[#0a2c56] text-white font-semibold py-3 text-[14px] shadow-sm shadow-[#0e3a71]/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isCheckingUser ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: ENTER 4-DIGIT PIN */}
        {step === 2 && (
          <div className="w-full">
            {/* Heading */}
            <div className="text-center mb-6">
              <h1 className="text-[21px] sm:text-[22px] font-bold text-slate-900 tracking-tight">
                Enter your PIN
              </h1>
              <p className="text-[13px] text-slate-500 mt-1 font-normal">
                {userData?.fullName ? (
                  <>
                    Welcome back,{' '}
                    <span className="text-slate-700 font-semibold">{userData.fullName}</span>
                    {userData.businessName ? (
                      <> · <span className="text-slate-600">{userData.businessName}</span></>
                    ) : null}
                  </>
                ) : (
                  <>
                    Account Number:{' '}
                    <span className="text-slate-700 font-semibold">{identifier}</span>
                  </>
                )}
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* 4 PIN Boxes */}
              <div className="flex justify-center gap-3 my-2">
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
                      className={`w-13 h-14 sm:w-14 sm:h-15 text-center text-xl font-bold rounded-xl transition-all duration-150 outline-none ${
                        isCurrent
                          ? 'border-2 border-[#2563eb] bg-white text-slate-900 shadow-sm shadow-blue-500/10'
                          : 'border border-slate-200 bg-white text-slate-900'
                      } ${isLoggingIn ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  )
                })}
              </div>

              {/* Action Links */}
              <div className="flex items-center justify-between text-[13px] font-medium px-1">
                <button
                  type="button"
                  disabled={isLoggingIn}
                  onClick={() => {
                    setStep(1)
                    setPin(Array(PIN_LENGTH).fill(''))
                  }}
                  className="inline-flex items-center gap-1 text-[#2563eb] hover:underline cursor-pointer transition-colors disabled:opacity-50"
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
                  <RiDeleteBack2Line className="w-4 h-4" />
                  <span>Clear</span>
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-2 rounded-xl bg-[#0e3a71] hover:bg-[#0a2c56] text-white font-semibold py-3 text-[14px] shadow-sm shadow-[#0e3a71]/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Login'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Card Divider & Footer */}
        <div className="w-full mt-7 pt-5 border-t border-slate-100 text-center">
          <p className="text-[12px] text-slate-400">
            Developed & Maintained by{' '}
            <a
              href="https://www.webnstech.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2563eb] font-medium hover:underline"
            >
              WEBNS Technology Ltd.
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
