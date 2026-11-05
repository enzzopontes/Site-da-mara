"use client"

import React, { useEffect, useState, useRef } from "react"
import { CheckCircle2 } from "lucide-react"

interface SlideDownPaymentBannerProps {
  visible: boolean
  onDismiss?: () => void
}

export function SlideDownPaymentBanner({ visible, onDismiss }: SlideDownPaymentBannerProps) {
  const [mounted, setMounted] = useState(false)
  const [isEntering, setIsEntering] = useState(false)
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    let enterTimer: NodeJS.Timeout | undefined
    let dismissTimer: NodeJS.Timeout | undefined
    let unmountTimer: NodeJS.Timeout | undefined

    if (visible) {
      setMounted(true)
      enterTimer = setTimeout(() => setIsEntering(true), 15)

      dismissTimer = setTimeout(() => {
        setIsEntering(false)
        unmountTimer = setTimeout(() => {
          setMounted(false)
          onDismissRef.current?.()
        }, 350)
      }, 4000)
    } else {
      setIsEntering(false)
      unmountTimer = setTimeout(() => setMounted(false), 350)
    }

    return () => {
      if (enterTimer) clearTimeout(enterTimer)
      if (dismissTimer) clearTimeout(dismissTimer)
      if (unmountTimer) clearTimeout(unmountTimer)
    }
  }, [visible])

  if (!mounted) return null

  return (
    <div
      className={`fixed top-4 left-4 right-4 max-w-md mx-auto z-[999999] transition-all duration-300 ease-out pointer-events-none ${
        isEntering ? "translate-y-0 opacity-100 scale-100" : "-translate-y-16 opacity-0 scale-95"
      }`}
    >
      <div className="flex items-center gap-3 bg-[#15803D] border-[1.5px] border-[#86EFAC] rounded-2xl py-3 px-4 shadow-2xl text-white pointer-events-auto">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[14.5px] font-extrabold tracking-tight leading-tight text-white">
            Pagamento confirmado!
          </h4>
          <p className="text-[12px] font-semibold text-white/90 leading-tight mt-0.5">
            Seu pedido já está sendo preparado.
          </p>
        </div>
      </div>
    </div>
  )
}
