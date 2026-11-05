"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Copy, X } from "lucide-react"

export interface TopToastProps {
  id?: string | number
  message: string
  subMessage?: string
  isOpen: boolean
  onClose: () => void
  duration?: number
}

export function TopToast({
  message,
  subMessage,
  isOpen,
  onClose,
  duration = 3500,
}: TopToastProps) {
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isEntering, setIsEntering] = useState(false)

  useEffect(() => {
    let dismissTimer: NodeJS.Timeout
    let exitTimer: NodeJS.Timeout

    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setIsEntering(true))

      dismissTimer = setTimeout(() => {
        setIsEntering(false)
        exitTimer = setTimeout(() => {
          setShouldRender(false)
          onClose()
        }, 300)
      }, duration)
    } else {
      setIsEntering(false)
      exitTimer = setTimeout(() => setShouldRender(false), 300)
    }

    return () => {
      clearTimeout(dismissTimer)
      clearTimeout(exitTimer)
    }
  }, [isOpen, message, duration, onClose])

  if (!shouldRender) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-4 inset-x-0 z-[100] flex justify-center px-4 pointer-events-none"
    >
      <div
        className={`pointer-events-auto max-w-md w-full bg-[#1F1B16] text-white rounded-2xl shadow-2xl border border-white/10 px-4 py-3 flex items-center justify-between gap-3 transform transition-all duration-300 ease-out ${
          isEntering ? "translate-y-0 opacity-100 scale-100" : "-translate-y-6 opacity-0 scale-95"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[#16A34A]/20 text-[#16A34A] flex items-center justify-center shrink-0 border border-[#16A34A]/30">
            <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white truncate flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5 text-[#E3A008]" />
              {message}
            </span>
            {subMessage && (
              <span className="text-xs text-[#A8A29E] truncate">{subMessage}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            setIsEntering(false)
            setTimeout(() => {
              setShouldRender(false)
              onClose()
            }, 300)
          }}
          className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
          aria-label="Fechar notificação"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
