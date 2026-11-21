"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react"
import {
  DEFAULT_ALERT_DURATION,
  HIDDEN_GENERIC_TITLES,
  subscribeThemedAlert,
  type ThemedAlertPayload,
  type ThemedAlertType,
} from "@/lib/themed-alert"

const EXIT_FALLBACK_MS = 350

const VARIANT_STYLES: Record<
  ThemedAlertType,
  {
    card: string
    iconBg: string
    closeBtn: string
    renderIcon: () => React.ReactNode
  }
> = {
  error: {
    card: "bg-[#EA1D2C] text-white",
    iconBg: "bg-white/20",
    closeBtn: "bg-black/10 text-white/85 hover:bg-black/20",
    renderIcon: () => <AlertCircle className="w-5 h-5 text-white" />,
  },
  success: {
    card: "bg-[#27AE60] text-white",
    iconBg: "bg-white/20",
    closeBtn: "bg-black/10 text-white/85 hover:bg-black/20",
    renderIcon: () => <CheckCircle2 className="w-5 h-5 text-white" />,
  },
  warning: {
    card: "bg-[#E3A008] text-[#1F1B16]",
    iconBg: "bg-black/10",
    closeBtn: "bg-black/10 text-[#1F1B16]/80 hover:bg-black/20",
    renderIcon: () => <AlertTriangle className="w-5 h-5 text-[#1F1B16]" />,
  },
  info: {
    card: "bg-[#1F1B16] text-white",
    iconBg: "bg-white/15",
    closeBtn: "bg-white/10 text-white/85 hover:bg-white/20",
    renderIcon: () => <Info className="w-5 h-5 text-[#E3A008]" />,
  },
}

export function ThemedAlertHost() {
  const [banner, setBanner] = useState<ThemedAlertPayload | null>(null)
  const [phase, setPhase] = useState<"entering" | "exiting">("entering")

  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const phaseRef = useRef<"entering" | "exiting">("entering")
  const bannerRef = useRef<ThemedAlertPayload | null>(null)
  const activeIdRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current)
      autoDismissTimerRef.current = null
    }
    if (exitFallbackTimerRef.current) {
      clearTimeout(exitFallbackTimerRef.current)
      exitFallbackTimerRef.current = null
    }
  }, [])

  const finishDismiss = useCallback(() => {
    clearTimers()
    bannerRef.current = null
    activeIdRef.current = null
    setBanner(null)
  }, [clearTimers])

  const triggerDismiss = useCallback(() => {
    if (!bannerRef.current) return
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current)
      autoDismissTimerRef.current = null
    }
    if (phaseRef.current === "exiting") return

    phaseRef.current = "exiting"
    setPhase("exiting")

    exitFallbackTimerRef.current = setTimeout(() => {
      finishDismiss()
    }, EXIT_FALLBACK_MS)
  }, [finishDismiss])

  useEffect(() => {
    const unsubscribe = subscribeThemedAlert((event) => {
      if (event.action === "hide") {
        const hideId = (event as { action: "hide"; id?: string | number }).id
        if (hideId !== undefined && String(activeIdRef.current) !== String(hideId)) {
          return
        }
        triggerDismiss()
        return
      }

      const { payload } = event
      clearTimers()
      bannerRef.current = payload
      activeIdRef.current = payload.id
      phaseRef.current = "entering"
      setBanner(payload)
      setPhase("entering")

      const duration =
        typeof payload.duration === "number" && payload.duration > 0
          ? payload.duration
          : DEFAULT_ALERT_DURATION

      autoDismissTimerRef.current = setTimeout(() => {
        triggerDismiss()
      }, duration)
    })

    return () => {
      unsubscribe()
      clearTimers()
    }
  }, [clearTimers, triggerDismiss])

  const variant = banner ? (VARIANT_STYLES[banner.type] ?? VARIANT_STYLES.info) : null

  const trimmedTitle = banner?.title?.trim() ?? ""
  const trimmedMessage = banner?.message?.trim() ?? ""
  const hasMessage = Boolean(trimmedMessage)
  const hasTitle = Boolean(trimmedTitle)
  const showTitle =
    hasTitle &&
    (!hasMessage || !HIDDEN_GENERIC_TITLES.includes(trimmedTitle))

  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (
      phase === "exiting" &&
      (e.animationName === "themed-alert-out" ||
        e.animationName === "themed-alert-fade-out")
    ) {
      finishDismiss()
    }
  }

  return (
    <div
      className="fixed top-0 inset-x-0 z-[999999] pointer-events-none flex justify-center px-4 pt-[max(env(safe-area-inset-top),12px)] mt-2"
      aria-live={banner?.type === "error" || banner?.type === "warning" ? "assertive" : "polite"}
      aria-atomic="true"
    >
      {banner && variant && (
        <div
          key={banner.id}
          role={banner.type === "error" || banner.type === "warning" ? "alert" : "status"}
          onClick={triggerDismiss}
          onAnimationEnd={handleAnimationEnd}
          className={`${
            phase === "exiting" ? "themed-alert-exit" : "themed-alert-enter"
          } pointer-events-auto w-full max-w-[460px] rounded-[14px] px-4 py-3 flex items-center gap-3 cursor-pointer select-none shadow-[0_4px_20px_rgba(0,0,0,0.25)] ${
            variant.card
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${variant.iconBg}`}
          >
            {variant.renderIcon()}
          </div>

          <div className="flex-1 min-w-0">
            {showTitle && hasMessage ? (
              <>
                <p className="text-[14px] font-extrabold tracking-[0.2px] leading-snug mb-0.5 truncate">
                  {banner.title}
                </p>
                <p className="text-[13px] font-semibold leading-[18px] opacity-95 line-clamp-3">
                  {banner.message}
                </p>
              </>
            ) : (
              <p className="text-[13px] font-semibold leading-[18px] opacity-95 line-clamp-3">
                {hasMessage
                  ? banner.message
                  : hasTitle
                    ? banner.title
                    : "Algo deu errado. Tente novamente."}
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label="Fechar notificação"
            onClick={(e) => {
              e.stopPropagation()
              triggerDismiss()
            }}
            className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center transition-colors ${variant.closeBtn}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
