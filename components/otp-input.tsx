"use client"

import React, { useRef, useEffect, useState } from "react"

interface OtpInputProps {
  value: string
  onChange: (val: string) => void
  onComplete?: (code: string) => void | Promise<void>
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const isSubmittingRef = useRef(false)

  // Divide o valor em 6 caracteres
  const toSlots = (raw: string) =>
    Array.from({ length: 6 }, (_, index) => (raw[index] && /\d/.test(raw[index]) ? raw[index] : ""))

  const [digits, setDigits] = useState<string[]>(() => toSlots(value))

  useEffect(() => {
    if (value !== digits.join("")) {
      setDigits(toSlots(value))
    }
  }, [value])

  useEffect(() => {
    if (value.length < 6) {
      isSubmittingRef.current = false
    }
  }, [value])

  useEffect(() => {
    if (!disabled) {
      isSubmittingRef.current = false
    }
  }, [disabled])

  useEffect(() => {
    if (autoFocus && inputsRef.current[0] && !disabled) {
      inputsRef.current[0]?.focus()
    }
  }, [autoFocus, disabled])

  const triggerComplete = (code: string) => {
    if (!/^\d{6}$/.test(code) || !onComplete || isSubmittingRef.current || disabled) return
    isSubmittingRef.current = true
    try {
      Promise.resolve(onComplete(code))
        .catch(() => {})
        .finally(() => {
          isSubmittingRef.current = false
        })
    } catch (error) {
      isSubmittingRef.current = false
      throw error
    }
  }

  const updateSlots = (nextSlots: string[]) => {
    setDigits(nextSlots)
    const joined = nextSlots.join("")
    onChange(joined)
    if (nextSlots.every((d) => /^\d$/.test(d))) {
      triggerComplete(joined)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || isSubmittingRef.current) return

    if (e.key === "Backspace") {
      e.preventDefault()
      if (digits[index]) {
        const newDigits = [...digits]
        newDigits[index] = ""
        updateSlots(newDigits)
      } else if (index > 0) {
        const newDigits = [...digits]
        newDigits[index - 1] = ""
        updateSlots(newDigits)
        inputsRef.current[index - 1]?.focus()
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault()
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault()
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isSubmittingRef.current) return
    const rawVal = e.target.value.replace(/\D/g, "")

    if (!rawVal) {
      const newDigits = [...digits]
      newDigits[index] = ""
      updateSlots(newDigits)
      return
    }

    if (rawVal.length > 1) {
      if (digits[index] && rawVal.length === 2) {
        const typedChar = rawVal[0] === digits[index] ? rawVal[1] : rawVal[0]
        const newDigits = [...digits]
        newDigits[index] = typedChar
        updateSlots(newDigits)

        if (index < 5) {
          inputsRef.current[index + 1]?.focus()
        }
        return
      }

      const clipped = rawVal.slice(0, 6)
      updateSlots(toSlots(clipped))
      const nextIndex = Math.min(clipped.length, 6) - 1
      inputsRef.current[nextIndex]?.focus()
      return
    }

    const newDigits = [...digits]
    newDigits[index] = rawVal
    updateSlots(newDigits)

    if (index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled || isSubmittingRef.current) return
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").trim()
    if (!/^\d{6}$/.test(pastedData)) return
    updateSlots(pastedData.split(""))
    inputsRef.current[5]?.focus()
  }

  return (
    <div
      role="group"
      aria-label="Código de verificação de 6 dígitos"
      className="flex items-center justify-between gap-1.5 sm:gap-2.5 max-w-sm mx-auto w-full my-2"
    >
      {Array.from({ length: 6 }).map((_, idx) => {
        const isCurrentActive =
          !disabled &&
          (digits[idx] !== "" ||
            (idx === 0 && digits.every((d) => d === "")) ||
            digits.findIndex((d) => d === "") === idx)

        return (
          <input
            key={idx}
            ref={(el) => {
              inputsRef.current[idx] = el
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete={idx === 0 ? "one-time-code" : "off"}
            value={digits[idx] || ""}
            disabled={disabled}
            aria-label={`Dígito ${idx + 1} de 6`}
            data-vaul-no-drag="true"
            onChange={(e) => handleChange(idx, e)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border transition-all duration-200 outline-none select-none ${
              error
                ? "border-red-400 bg-red-50/50 text-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                : isCurrentActive
                  ? "border-2 border-[#1F1B16] bg-white text-[#1F1B16]"
                  : "border-[#ECE7E0] bg-[#F7F4EF] text-[#1F1B16] hover:border-[#D6CEC4]"
            } ${disabled ? "opacity-50 cursor-not-allowed bg-gray-100" : ""}`}
          />
        )
      })}
    </div>
  )
}
