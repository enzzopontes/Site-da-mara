"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ShieldCheck, Cookie, Settings, Check, X } from "lucide-react"
import { Analytics } from "@vercel/analytics/next"

const COOKIE_CONSENT_KEY = "batata_top_cookie_consent_v1"

export type ConsentStatus = "accepted" | "declined" | "custom"

interface CookiePreferences {
  status: ConsentStatus
  analytics: boolean
  marketing: boolean
  updatedAt: string
}

export function CookieConsent() {
  const [mounted, setMounted] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false)
  const [marketingAllowed, setMarketingAllowed] = useState(false)
  const [hasConsented, setHasConsented] = useState<boolean | null>(null)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
      if (stored) {
        const parsed: CookiePreferences = JSON.parse(stored)
        setAnalyticsAllowed(parsed.analytics)
        setMarketingAllowed(parsed.marketing)
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
  }, [])

  const saveConsent = (status: ConsentStatus, analytics: boolean, marketing: boolean) => {
    const preferences: CookiePreferences = {
      status,
      analytics,
      marketing,
      updatedAt: new Date().toISOString()
    }
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(preferences))
    } catch {}

    setAnalyticsAllowed(analytics)
    setMarketingAllowed(marketing)
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
    saveConsent("custom", analyticsAllowed, marketingAllowed)
  }

  if (!mounted) return null

  return (
    <>
      {/* Vercel Analytics ONLY injected if user gave explicit consent to analytics */}
      {analyticsAllowed && <Analytics />}

      {/* Floating Preferences Trigger if already consented */}
      {!isVisible && hasConsented && (
        <button
          onClick={() => {
            setIsVisible(true)
            setShowPreferences(true)
          }}
          className="fixed bottom-20 left-4 z-40 bg-white/90 hover:bg-white text-gray-700 hover:text-amber-800 p-2.5 rounded-full shadow-lg border border-gray-200 transition-all text-xs font-bold flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
          aria-label="Abrir preferências de cookies e privacidade"
          title="Preferências de Cookies"
        >
          <Cookie className="w-4 h-4 text-amber-600" aria-hidden="true" />
          <span className="hidden sm:inline">Cookies</span>
        </button>
      )}

      {/* Cookie Banner modal/bar */}
      {isVisible && (
        <div 
          role="region" 
          aria-label="Aviso de Consentimento de Cookies e Privacidade"
          className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-gray-300 shadow-2xl transition-all"
        >
          <div className="container mx-auto max-w-5xl">
            {!showPreferences ? (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <Cookie className="w-5 h-5 text-amber-700 shrink-0" aria-hidden="true" />
                    <h2 className="text-base font-extrabold text-gray-900">
                      Sua privacidade e seus cookies
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    Utilizamos cookies para assegurar o funcionamento da loja, registrar suas preferências e aprimorar sua experiência. Os cookies essenciais são necessários para navegação e finalização do pedido. Você tem o direito de aceitar ou recusar cookies de telemetria analítica e marketing. Saiba mais em nossa{" "}
                    <Link href="/privacidade" className="font-bold underline text-amber-800 hover:text-amber-950 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-600 rounded">
                      Política de Privacidade
                    </Link>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowPreferences(true)}
                    className="flex-1 md:flex-none px-3.5 py-2.5 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-100 font-bold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                  >
                    Personalizar
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectAll}
                    className="flex-1 md:flex-none px-3.5 py-2.5 rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-100 font-bold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                  >
                    Apenas Essenciais
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="w-full sm:w-auto flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                  >
                    Aceitar Todos
                  </button>
                </div>
              </div>
            ) : (
              /* Modal de Personalização Detalhada */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-amber-700" aria-hidden="true" />
                    <h2 className="text-base font-extrabold text-gray-900">
                      Preferências de Privacidade e Cookies
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPreferences(false)}
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
                        checked={analyticsAllowed}
                        onChange={(e) => setAnalyticsAllowed(e.target.checked)}
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
                        checked={marketingAllowed}
                        onChange={(e) => setMarketingAllowed(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-gray-700 text-[11px] leading-relaxed">
                      Permite mensurar a eficácia de cupons de desconto e comunicações direcionadas aos clientes.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
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
            )}
          </div>
        </div>
      )}
    </>
  )
}
