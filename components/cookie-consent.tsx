"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Cookie, Settings, X } from "lucide-react"
import { Analytics } from "@vercel/analytics/next"

const COOKIE_CONSENT_KEY = "batata_top_cookie_consent_v1"
export const OPEN_COOKIE_PREFERENCES_EVENT = "open-cookie-preferences"

export function openCookiePreferences() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))
  }
}

export type ConsentStatus = "accepted" | "declined" | "custom"

interface CookiePreferences {
  status: ConsentStatus
  analytics: boolean
  marketing: boolean
  updatedAt: string
}

export function CookieConsent() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false)
  const [marketingAllowed, setMarketingAllowed] = useState(false)
  const [draftAnalytics, setDraftAnalytics] = useState(false)
  const [draftMarketing, setDraftMarketing] = useState(false)
  const [hasConsented, setHasConsented] = useState<boolean | null>(null)
  const isAuthFixedFooterRoute =
    pathname === "/login" || pathname === "/cadastro" || pathname?.startsWith("/auth")

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
      if (stored) {
        const parsed: CookiePreferences = JSON.parse(stored)
        setAnalyticsAllowed(parsed.analytics)
        setMarketingAllowed(parsed.marketing)
        setDraftAnalytics(parsed.analytics)
        setDraftMarketing(parsed.marketing)
        setHasConsented(true)
        setIsVisible(false)
      } else {
        setHasConsented(false)
        setIsVisible(true)
      }
    } catch {
      setIsVisible(true)
      setHasConsented(false)
    }

    const handleOpenPreferences = () => {
      try {
        const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
        if (stored) {
          const parsed: CookiePreferences = JSON.parse(stored)
          setAnalyticsAllowed(parsed.analytics)
          setMarketingAllowed(parsed.marketing)
          setDraftAnalytics(parsed.analytics)
          setDraftMarketing(parsed.marketing)
        } else {
          setDraftAnalytics(false)
          setDraftMarketing(false)
        }
      } catch {
        setDraftAnalytics(false)
        setDraftMarketing(false)
      }
      setIsVisible(true)
      setShowPreferences(true)
    }

    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handleOpenPreferences)
    return () => {
      window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handleOpenPreferences)
    }
  }, [])

  const handleClosePreferences = useCallback(() => {
    setDraftAnalytics(analyticsAllowed)
    setDraftMarketing(marketingAllowed)
    if (hasConsented) {
      setShowPreferences(false)
      setIsVisible(false)
    } else {
      setShowPreferences(false)
    }
  }, [hasConsented, analyticsAllowed, marketingAllowed])

  useEffect(() => {
    if (!isVisible || !showPreferences) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClosePreferences()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isVisible, showPreferences, handleClosePreferences])

  const saveConsent = (status: ConsentStatus, analytics: boolean, marketing: boolean) => {
    const preferences: CookiePreferences = {
      status,
      analytics,
      marketing,
      updatedAt: new Date().toISOString()
    }
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(preferences))
      window.dispatchEvent(new Event("cookie-consent-updated"))
    } catch {}

    setAnalyticsAllowed(analytics)
    setMarketingAllowed(marketing)
    setDraftAnalytics(analytics)
    setDraftMarketing(marketing)
    setHasConsented(true)
    setIsVisible(false)
    setShowPreferences(false)
  }

  const handleAcceptAll = () => {
    saveConsent("accepted", true, true)
  }

  const handleRejectAll = () => {
    saveConsent("declined", false, false)
  }

  const handleSaveCustom = () => {
    saveConsent("custom", draftAnalytics, draftMarketing)
  }

  if (!mounted || pathname?.startsWith("/admin")) return null

  return (
    <>
      {/* Vercel Analytics ONLY injected if user gave explicit consent to analytics */}
      {analyticsAllowed && <Analytics />}

      {/* Cookie Banner compacto flutuante sem ocluir CTAs primários */}
      {isVisible && !showPreferences && (
        <div
          role="region"
          aria-label="Aviso de Consentimento de Cookies e Privacidade"
          className={`fixed z-50 bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-2xl transition-all ${
            isAuthFixedFooterRoute ? "bottom-[96px]" : "bottom-2"
          } inset-x-2 p-3 sm:p-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-4 md:w-[calc(100%-2rem)] md:max-w-xl`}
        >
          <div className="w-full">
            <div className="flex flex-col gap-2.5">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Cookie className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                  <h2 className="text-xs sm:text-sm font-extrabold text-gray-900">
                    Sua privacidade e seus cookies
                  </h2>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-700 leading-snug">
                  Cookies essenciais mantêm a loja ativa. Aceite ou recuse cookies analíticos e de marketing conforme nossa{" "}
                  <Link href="/privacidade" className="font-bold underline text-amber-800 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-600 rounded">
                    Política de Privacidade
                  </Link>.
                </p>
              </div>

              <div className="flex items-center gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setDraftAnalytics(analyticsAllowed)
                    setDraftMarketing(marketingAllowed)
                    setShowPreferences(true)
                  }}
                  className="px-2.5 py-2 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-100 font-bold text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 shrink-0"
                >
                  Personalizar
                </button>
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="flex-1 px-2.5 py-2 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-100 font-bold text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 whitespace-nowrap"
                >
                  Só Essenciais
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="flex-1 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-[11px] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 whitespace-nowrap"
                >
                  Aceitar Todos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Personalização Detalhada */}
      {isVisible && showPreferences && (
        <div
          onClick={handleClosePreferences}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-preferences-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[85dvh] overflow-y-auto bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 sm:p-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-700" aria-hidden="true" />
                  <h2 id="cookie-preferences-title" className="text-base font-extrabold text-gray-900">
                    Preferências de Privacidade e Cookies
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleClosePreferences}
                  className="p-1 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                  aria-label="Fechar preferências"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Essenciais */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-gray-900">1. Essenciais (Obrigatórios)</span>
                    <span className="text-[10px] uppercase font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded">Ativo</span>
                  </div>
                  <p className="text-gray-700 text-[11px] leading-relaxed">
                    Imprescindíveis para autenticação segura, sessão do carrinho de compras e integridade técnica do sistema.
                  </p>
                </div>

                {/* Analíticos */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="cookie-analytics" className="font-extrabold text-gray-900 cursor-pointer">
                      2. Analíticos &amp; Desempenho
                    </label>
                    <input
                      id="cookie-analytics"
                      type="checkbox"
                      checked={draftAnalytics}
                      onChange={(e) => setDraftAnalytics(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-gray-700 text-[11px] leading-relaxed">
                    Coleta dados anônimos de navegação para identificar páginas com erro e medir a performance das telas.
                  </p>
                </div>

                {/* Marketing */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="cookie-marketing" className="font-extrabold text-gray-900 cursor-pointer">
                      3. Marketing &amp; Campanhas
                    </label>
                    <input
                      id="cookie-marketing"
                      type="checkbox"
                      checked={draftMarketing}
                      onChange={(e) => setDraftMarketing(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-gray-700 text-[11px] leading-relaxed">
                    Permite mensurar a eficácia de cupons de desconto e comunicações direcionadas aos clientes.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200">
                <Link
                  href="/privacidade"
                  onClick={handleClosePreferences}
                  className="text-xs font-bold underline text-amber-800 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded"
                >
                  Política de Privacidade
                </Link>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleRejectAll}
                    className="px-3 py-2 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-100 font-bold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                  >
                    Rejeitar Não Essenciais
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustom}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                  >
                    Salvar Minhas Escolhas
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
