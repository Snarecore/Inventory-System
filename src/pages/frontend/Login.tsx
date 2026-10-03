import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiOutlineUser, HiOutlineArrowLeft, HiOutlineCheck } from 'react-icons/hi'
import { RiDeleteBack2Line } from 'react-icons/ri'
import logoImg from '@/assets/logo.jpeg'

export const Login: React.FC = () => {
  const navigate = useNavigate()

  // State Management
  const [step, setStep] = useState<1 | 2>(1)
  const [identifier, setIdentifier] = useState('01701085399')
  const [rememberMe, setRememberMe] = useState(true)
  const [pin, setPin] = useState<string[]>(['', '', '', ''])
  const [focusedIndex, setFocusedIndex] = useState<number>(0)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Refs for 4-digit PIN inputs
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  // Focus management when switching to step 2
  useEffect(() => {
    if (step === 2) {
      const emptyIndex = pin.findIndex((digit) => digit === '')
      const targetIndex = emptyIndex === -1 ? 0 : emptyIndex
      setFocusedIndex(targetIndex)
      setTimeout(() => {
        pinInputRefs[targetIndex]?.current?.focus()
      }, 50)
    }
  }, [step])

  // Step 1: Submit handler
  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) {
      setErrorMessage('Please enter your mobile number or email')
      return
    }
    setErrorMessage('')
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setStep(2)
    }, 200)
  }

  // Step 2: PIN input changes
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

    if (index < 3) {
      setFocusedIndex(index + 1)
      pinInputRefs[index + 1]?.current?.focus()
    }
  }

  // Step 2: Handle backspace & arrow navigation
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
    } else if (e.key === 'ArrowRight' && index < 3) {
      setFocusedIndex(index + 1)
      pinInputRefs[index + 1]?.current?.focus()
    }
  }

  // Step 2: Handle pasting multi-digit PIN
  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (!pastedData) return

    const newPin = ['', '', '', '']
    for (let i = 0; i < pastedData.length; i++) {
      newPin[i] = pastedData[i]
    }
    setPin(newPin)

    const nextIndex = Math.min(pastedData.length, 3)
    setFocusedIndex(nextIndex)
    pinInputRefs[nextIndex]?.current?.focus()
  }

  // Clear all PIN digits
  const handleClearPin = () => {
    setPin(['', '', '', ''])
    setErrorMessage('')
    setFocusedIndex(0)
    pinInputRefs[0]?.current?.focus()
  }

  // Final login submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const enteredPin = pin.join('')
    if (enteredPin.length < 4) {
      setErrorMessage('Please enter 4-digit PIN')
      return
    }

    setErrorMessage('')
    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      setIsSuccess(true)
      setTimeout(() => {
        navigate('/')
      }, 1000)
    }, 400)
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-4 sm:p-6 font-sans antialiased text-slate-800">
      {/* Centered Auth Card */}
      <div className="w-full max-w-[390px] bg-white rounded-3xl border border-slate-100 shadow-[0_10px_35px_-10px_rgba(0,0,0,0.06)] px-7 py-8 sm:px-8 sm:py-9 flex flex-col items-center">
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
            className={`w-2 h-2 rounded-full transition-colors ${
              step === 1 ? 'bg-[#1d4ed8]' : 'bg-[#93c5fd]'
            }`}
          />
          <div
            className={`w-7 h-[2px] transition-colors ${
              step === 1 ? 'bg-slate-200' : 'bg-[#93c5fd]'
            }`}
          />
          <div
            className={`w-2 h-2 rounded-full transition-colors ${
              step === 2 ? 'bg-[#1d4ed8]' : 'bg-slate-200'
            }`}
          />
        </div>

        {/* STEP 1: LOGIN TO ACCOUNT */}
        {step === 1 && (
          <div className="w-full">
            {/* Heading */}
            <div className="text-center mb-6">
              <h1 className="text-[21px] sm:text-[22px] font-bold text-slate-900 tracking-tight">
                Login to Account
              </h1>
              <p className="text-[13px] text-slate-500 mt-1 font-normal">
                Enter your mobile number or email to continue
              </p>
            </div>

            <form onSubmit={handleContinue} className="space-y-4">
              {/* Input Field */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  MOBILE / EMAIL <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400">
                    <HiOutlineUser className="w-[18px] h-[18px]" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="01701085399"
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 py-2.5 sm:py-3 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/15 transition-all font-normal"
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

              {/* Error Alert */}
              {errorMessage && (
                <div className="text-xs text-rose-500 font-medium bg-rose-50 border border-rose-100 rounded-lg p-2 text-center">
                  {errorMessage}
                </div>
              )}

              {/* Continue Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 rounded-xl bg-[#0e3a71] hover:bg-[#0a2c56] text-white font-semibold py-3 text-[14px] shadow-sm shadow-[#0e3a71]/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: ENTER YOUR PIN */}
        {step === 2 && (
          <div className="w-full">
            {/* Heading */}
            <div className="text-center mb-6">
              <h1 className="text-[21px] sm:text-[22px] font-bold text-slate-900 tracking-tight">
                Enter your PIN
              </h1>
              <p className="text-[13px] text-slate-500 mt-1 font-normal">
                Welcome back,{' '}
                <span className="text-slate-600 font-medium">
                  {identifier.includes('@') ? identifier.split('@')[0] : 'Shaurav Shaha'}
                </span>{' '}
                · <span className="text-slate-600">Shaha Enterprise</span>
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
                      value={digit}
                      onFocus={() => setFocusedIndex(idx)}
                      onChange={(e) => handlePinChange(idx, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(idx, e)}
                      onPaste={handlePinPaste}
                      className={`w-13 h-14 sm:w-14 sm:h-15 text-center text-xl font-bold rounded-xl transition-all duration-150 outline-none ${
                        isCurrent
                          ? 'border-2 border-[#2563eb] bg-white text-slate-900'
                          : 'border border-slate-200 bg-white text-slate-900'
                      }`}
                    />
                  )
                })}
              </div>

              {/* Action Links */}
              <div className="flex items-center justify-between text-[13px] font-medium px-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1)
                    setErrorMessage('')
                  }}
                  className="inline-flex items-center gap-1 text-[#2563eb] hover:underline cursor-pointer transition-colors"
                >
                  <HiOutlineArrowLeft className="w-3.5 h-3.5" />
                  <span>Change number</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearPin}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  <RiDeleteBack2Line className="w-4 h-4" />
                  <span>Clear</span>
                </button>
              </div>

              {/* Error or Success Message */}
              {errorMessage && (
                <div className="text-xs text-rose-500 font-medium bg-rose-50 border border-rose-100 rounded-lg p-2 text-center">
                  {errorMessage}
                </div>
              )}

              {isSuccess && (
                <div className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-center">
                  ✓ Successfully logged in! Redirecting...
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading || isSuccess}
                className="w-full mt-2 rounded-xl bg-[#0e3a71] hover:bg-[#0a2c56] text-white font-semibold py-3 text-[14px] shadow-sm shadow-[#0e3a71]/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
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
              href="https://webnstechnology.com"
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
