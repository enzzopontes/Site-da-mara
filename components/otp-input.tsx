"use client"

import React, { useRef, useEffect } from "react"

interface OtpInputProps {
  value: string
  onChange: (val: string) => void
  onComplete?: (code: string) => void
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

  // Divide o valor em 6 caracteres
  const digits = Array.from({ length: 6 }, (_, index) => value[index] || "")

  useEffect(() => {
    if (autoFocus && inputsRef.current[0] && !disabled) {
      inputsRef.current[0]?.focus()
    }
  }, [autoFocus, disabled])

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === "Backspace") {
      e.preventDefault()
      if (digits[index]) {
        // Se já tem valor na posição atual, limpa ela
        const newDigits = [...digits]
        newDigits[index] = ""
        const newVal = newDigits.join("")
        onChange(newVal)
      } else if (index > 0) {
        // Se está vazia, limpa a anterior e move o foco
        const newDigits = [...digits]
        newDigits[index - 1] = ""
        const newVal = newDigits.join("")
        onChange(newVal)
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
    if (disabled) return
    const rawVal = e.target.value.replace(/\D/g, "")

    if (!rawVal) {
      const newDigits = [...digits]
      newDigits[index] = ""
      onChange(newDigits.join(""))
      return
    }

    // Se o usuário digitou ou colou um caractere no campo
    const char = rawVal[rawVal.length - 1]
    const newDigits = [...digits]
    newDigits[index] = char
    const nextVal = newDigits.join("")
    onChange(nextVal)

    // Move o foco para o próximo campo
    if (index < 5) {
      inputsRef.current[index + 1]?.focus()
    }

    // Se completou 6 dígitos, dispara onComplete
    if (nextVal.length === 6 && onComplete) {
      onComplete(nextVal)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pastedData) return

    onChange(pastedData)

    // Foca no próximo índice vazio ou no último
    const nextIndex = Math.min(pastedData.length, 5)
    inputsRef.current[nextIndex]?.focus()

    if (pastedData.length === 6 && onComplete) {
      onComplete(pastedData)
    }
  }

  return (
    <div
      role="group"
      aria-label="Código de verificação de 6 dígitos"
      className="flex items-center justify-between gap-1.5 sm:gap-2.5 max-w-sm mx-auto w-full my-2"
    >
      {Array.from({ length: 6 }).map((_, idx) => {
        const isCurrentActive =
          !disabled && (digits[idx] !== "" || (idx === 0 && !value) || value.length === idx)

        return (
          <input
            key={idx}
            ref={(el) => {
              inputsRef.current[idx] = el
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={idx === 0 ? "one-time-code" : "off"}
            value={digits[idx] || ""}
            disabled={disabled}
            aria-label={`Dígito ${idx + 1} de 6`}
            data-vaul-no-drag="true"
            onChange={(e) => handleChange(idx, e)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={`w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-black rounded-2xl border-2 transition-all duration-200 outline-none select-none ${
              error
                ? "border-red-400 bg-red-50/50 text-red-600 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                : isCurrentActive
                  ? "border-[#E3A008] bg-white text-[#1A1A1A] shadow-sm ring-4 ring-[#E3A008]/15"
                  : "border-[#ECE7E0] bg-[#F7F5F0] text-[#1A1A1A] hover:border-[#D6CEC4]"
            } ${disabled ? "opacity-50 cursor-not-allowed bg-gray-100" : ""}`}
          />
        )
      })}
    </div>
  )
}
