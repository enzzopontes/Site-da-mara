"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import {
  ChevronLeft,
  ChevronDown,
  HelpCircle,
  MessageCircle,
  Loader2,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { appToast } from "@/lib/app-toast"
import { readSavedUserProfile, consumePendingCartItem } from "@/lib/security-auth"

interface AuthModalProps {
  isOpen?: boolean
  onClose?: () => void
  initialEmail?: string
}

type AuthView = "welcome" | "saved_account"

// Perguntas frequentes idênticas ao HelpModal oficial do app Batata Top
const FAQ_ITEMS = [
  {
    id: "login-codigo",
    question: "Não recebi meu código de 6 dígitos",
    answer:
      "Verifique sua caixa de spam e a aba de promoções. O código expira em 10 minutos. Se ainda não chegar, aguarde o contador zerar e clique em 'Reenviar código'.",
  },
  {
    id: "onde-esta",
    question: "Onde está meu pedido?",
    answer:
      "Acesse 'Pedidos' no menu inferior ou no topo para acompanhar cada etapa em tempo real: recebido, em preparo, saiu para entrega e entregue.",
  },
  {
    id: "tempo-entrega",
    question: "Quanto tempo demora a entrega?",
    answer:
      "Geralmente os pedidos em Iacanga-SP levam de 30 a 60 minutos após a confirmação. Em dias de grande movimento (sexta e sábado), o tempo pode variar.",
  },
  {
    id: "formas-pagamento",
    question: "Quais são as formas de pagamento?",
    answer:
      "Aceitamos PIX com aprovação instantânea, Cartão de Crédito/Débito online e Dinheiro ou Cartão na entrega pela maquininha.",
  },
  {
    id: "entrega-cidade",
    question: "Vocês entregam na minha região?",
    answer:
      "Sim, realizamos entregas em toda a área urbana de Iacanga-SP. Você pode cadastrar e confirmar seu endereço no topo da tela.",
  },
]

export function AuthModal({ isOpen, onClose, initialEmail }: AuthModalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    signInWithGoogle,
    continueWithSavedAccount,
    user,
    authModalOpen,
    closeAuthModal,
  } = useAuth()
  const { addItem } = useCart()

  const effectiveOpen = isOpen ?? authModalOpen
  const effectiveOnClose = useCallback(() => {
    if (onClose) {
      onClose()
    } else {
      closeAuthModal()
    }
  }, [onClose, closeAuthModal])

  const [mounted, setMounted] = useState(false)
  const [view, setView] = useState<AuthView>("welcome")
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)
  const [savedEmail, setSavedEmail] = useState<string | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [continueLoading, setContinueLoading] = useState(false)
  const isContinuingRef = useRef(false)
  const isMountedRef = useRef(true)
  const effectiveOpenRef = useRef(effectiveOpen)
  const [isNavigatingToAuth, setIsNavigatingToAuth] = useState(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    effectiveOpenRef.current = effectiveOpen
  }, [effectiveOpen])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prefetch imediato de /login ao abrir para eliminar latência da ponte direta
  useEffect(() => {
    if (effectiveOpen) {
      router.prefetch("/login")
    }
  }, [effectiveOpen, router])

  // Fecha o overlay opaco apenas quando a rota de destino (/login ou /cadastro) já estiver ativa
  useEffect(() => {
    if (isNavigatingToAuth && (pathname === "/login" || pathname === "/cadastro")) {
      setIsNavigatingToAuth(false)
      setContinueLoading(false)
      effectiveOnClose()
    }
  }, [pathname, isNavigatingToAuth, effectiveOnClose])

  // Trava scroll da página de fundo enquanto o modal estiver aberto
  useEffect(() => {
    if (effectiveOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [effectiveOpen])

  // Fecha no Escape (bloqueado durante ponte direta para evitar flash da Home)
  useEffect(() => {
    if (!effectiveOpen || isNavigatingToAuth || continueLoading) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") effectiveOnClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [effectiveOpen, isNavigatingToAuth, continueLoading, effectiveOnClose])

  // Recupera última conta salva (sanitizada sem telefone) para a tela "Que bom te ver novamente"
  useEffect(() => {
    isContinuingRef.current = false
    if (typeof window !== "undefined" && effectiveOpen) {
      setIsNavigatingToAuth(false)
      setContinueLoading(false)
      setGoogleLoading(false)
      setIsHelpOpen(false)

      const savedProfile = readSavedUserProfile()
      const candidateEmail = initialEmail?.trim() || savedProfile?.email
      if (candidateEmail && candidateEmail.includes("@")) {
        setSavedEmail(candidateEmail)
        setView("saved_account")
      } else {
        setSavedEmail(null)
        setView("welcome")
      }
    }
  }, [effectiveOpen, initialEmail])

  // Se já estiver logado (fora de navegação em curso), fecha modal
  useEffect(() => {
    if (user && effectiveOpen && !isNavigatingToAuth) {
      effectiveOnClose()
    }
  }, [user, effectiveOpen, isNavigatingToAuth, effectiveOnClose])

  const navigateDirectToAuth = useCallback(
    (targetUrl: string) => {
      if (pathname === "/login" || pathname === "/cadastro") {
        setIsNavigatingToAuth(false)
        setContinueLoading(false)
        effectiveOnClose()
        router.replace(targetUrl)
        return
      }
      // Mantém overlay opaco cobrindo a Home até a página /login assumir a rota
      setIsNavigatingToAuth(true)
      router.push(targetUrl)
    },
    [pathname, effectiveOnClose, router]
  )

  // Navega para página dedicada de login sem desmontar o overlay antes da rota carregar
  const handleGoToLogin = (emailPrefill?: string, stepParam?: "code") => {
    const params = new URLSearchParams()
    if (emailPrefill) params.set("email", emailPrefill)
    if (stepParam) params.set("step", stepParam)
    const qs = params.toString()
    navigateDirectToAuth(qs ? `/login?${qs}` : "/login")
  }

  // Navega para página dedicada de cadastro sem flash da Home
  const handleGoToRegister = () => {
    navigateDirectToAuth("/login?mode=register")
  }

  // Fluxo "Continuar" na conta recente deslogada (Cenário A: token válido / Cenário B: OTP + cooldown 60s)
  const handleContinueSavedAccount = async () => {
    if (!savedEmail || continueLoading || isNavigatingToAuth || isContinuingRef.current) return
    isContinuingRef.current = true
    setContinueLoading(true)

    try {
      const result = await continueWithSavedAccount(savedEmail)
      if (!isMountedRef.current || !effectiveOpenRef.current) return

      if (result.status === "authenticated") {
        const added = consumePendingCartItem(addItem)
        if (added) {
          appToast.success("Item adicionado à sua sacola!")
        }
        appToast.success("Login realizado com sucesso!")
        setContinueLoading(false)
        effectiveOnClose()
        router.refresh()
        return
      }

      if (result.status === "otp_sent") {
        appToast.success("Código enviado")
      }

      handleGoToLogin(savedEmail, "code")
    } catch (err: any) {
      if (!isMountedRef.current || !effectiveOpenRef.current) return
      appToast.error(
        err?.message || "Não foi possível enviar o código. Tente novamente."
      )
      setContinueLoading(false)
      handleGoToLogin(savedEmail)
    } finally {
      isContinuingRef.current = false
    }
  }

  // Google Sign-in
  const handleGoogleSignIn = async () => {
    if (googleLoading || isNavigatingToAuth) return
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch {
      if (!isMountedRef.current) return
      appToast.error("Não foi possível conectar com o Google.")
      setGoogleLoading(false)
    }
  }

  if (!mounted || !effectiveOpen) return null

  if (isNavigatingToAuth) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Abrindo tela de autenticação"
        className="fixed inset-0 z-[100] w-screen h-dvh bg-white flex flex-col items-center justify-center select-none"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-[#1F1B16]" />
          <span className="text-xs font-semibold text-[#6B6157]">
            Abrindo acesso seguro...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Autenticação Batata Top"
      className="fixed inset-0 z-[100] w-screen h-dvh overflow-hidden flex flex-col justify-between animate-in fade-in duration-200 select-none"
    >
      {/* FOTO COBRINDO A TELA INTEIRA POSICIONADA NO TOPO (MOBILE & PC) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-black">
        <Image
          src="/images/loginfoto.jpeg"
          alt="Batata Top Delivery"
          fill
          priority
          className="object-cover object-top"
        />
        {/* Gradiente sutil no topo para os botões */}
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none" />
      </div>

      {/* ÁREA SUPERIOR: BOTÃO VOLTAR E BOTÃO DE INTERROGAÇÃO (?) NAS EXTREMIDADES */}
      <div className="relative z-30 w-full flex items-center justify-between px-4 sm:px-8 pt-4 sm:pt-6">
        <button
          type="button"
          onClick={() => {
            if (isHelpOpen) setIsHelpOpen(false)
            else if (view === "saved_account") setView("welcome")
            else effectiveOnClose()
          }}
          aria-label="Voltar"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
        </button>

        <button
          type="button"
          onClick={() => setIsHelpOpen((prev) => !prev)}
          aria-label="Ajuda e suporte"
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
        </button>
      </div>

      {/* ÁREA CLICÁVEL TRANSPARENTE ACIMA DO BOTTOM SHEET PARA FECHAR */}
      <div
        className="flex-1 w-full relative z-20 cursor-pointer"
        onClick={() => {
          if (!continueLoading && !isNavigatingToAuth) effectiveOnClose()
        }}
      />

      {/* BOTTOM SHEET: COBRINDO A PARTE DE BAIXO INTEIRA (W-FULL DE PONTA A PONTA), PONTAS DE BAIXO RETAS */}
      <div className="relative z-30 w-full animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-t-[28px] sm:rounded-t-[36px] rounded-b-none border-t border-[#ECE7E0] shadow-[0_-12px_40px_rgba(0,0,0,0.35)] px-4 sm:px-8 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] flex flex-col max-h-[85vh] overflow-y-auto">
          <div className="w-full max-w-md sm:max-w-lg mx-auto flex flex-col">
            {/* HANDLE SUPERIOR CINZA */}
            <div className="w-11 h-1 bg-[#D6CEC4] rounded-full mx-auto mb-3 shrink-0" />

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TELA DE AJUDA / FAQ (DISPARADA PELO BOTÃO ?)                   */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {isHelpOpen ? (
              <div className="flex flex-col animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#ECE7E0]">
                  <h3 className="text-base font-extrabold text-[#1F1B16]">
                    Central de Ajuda
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsHelpOpen(false)}
                    className="text-xs font-bold text-[#1F1B16] hover:text-[#6B6157] transition-colors cursor-pointer"
                  >
                    Voltar ao início
                  </button>
                </div>

                {/* Banner WhatsApp */}
                <div className="bg-[#FEF8EC] border border-[#FCE8C3] rounded-2xl p-4 flex flex-col items-center text-center mb-4">
                  <div className="relative w-14 h-14 mb-2">
                    <Image
                      src="/images/imageajuda.png"
                      alt="Atendimento Batata Top"
                      width={56}
                      height={56}
                      className="object-contain"
                    />
                  </div>
                  <h4 className="font-extrabold text-sm text-[#1F1B16] mb-1">
                    Precisa de suporte agora?
                  </h4>
                  <p className="text-xs text-[#6B6157] mb-3 leading-relaxed">
                    Nossa equipe atende rapidamente pelo WhatsApp oficial para tirar dúvidas e ajudar com seu acesso.
                  </p>
                  <a
                    href="https://wa.me/5514997361015?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20meu%20login%20no%20Batata%20Top"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-11 bg-[#25D366] hover:bg-[#1EBE5D] active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Falar no WhatsApp oficial</span>
                  </a>
                </div>

                {/* FAQ Items */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#9C9188] px-1">
                    Dúvidas frequentes
                  </span>
                  {FAQ_ITEMS.map((item) => {
                    const isExpanded = expandedFaq === item.id
                    return (
                      <div
                        key={item.id}
                        className="border border-[#ECE7E0] rounded-xl overflow-hidden bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaq(isExpanded ? null : item.id)}
                          className="w-full p-3 text-left flex items-center justify-between gap-2 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                        >
                          <span className="text-xs font-bold text-[#1F1B16]">
                            {item.question}
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 text-[#9C9188] shrink-0 transition-transform duration-200 ${
                              isExpanded ? "rotate-180 text-[#E3A008]" : ""
                            }`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 text-xs text-[#6B6157] leading-relaxed border-t border-[#ECE7E0]/50 bg-[#FFFDF7]">
                            {item.answer}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* ═══════════════════════════════════════════════════════════════ */}
                {/* TELA 1: "QUE BOM TE VER NOVAMENTE" (quando há e-mail salvo)   */}
                {/* ═══════════════════════════════════════════════════════════════ */}
                {view === "saved_account" && savedEmail ? (
                  <div className="flex flex-col animate-in fade-in">
                    <h2 className="text-base font-bold text-[#1F1B16] text-center mb-4">
                      Que bom te ver novamente
                    </h2>

                    {/* Card com a conta salva */}
                    <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-[#ECE7E0] shadow-2xs mb-5">
                      <div className="relative w-11 h-11 shrink-0 rounded-xl bg-[#F7F4EF] flex items-center justify-center overflow-hidden">
                        <Image
                          src="/assets/batatanacaixa.png"
                          alt="Avatar Batata Top"
                          width={36}
                          height={36}
                          className="object-contain"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] text-[#9C9188] font-normal leading-tight">
                          Encontramos seu último login
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-[#1F1B16] truncate">
                          {savedEmail}
                        </span>
                      </div>
                    </div>

                    {/* Botão Amarelo Pílula "Continuar" (h-13) */}
                    <button
                      type="button"
                      disabled={continueLoading || isNavigatingToAuth}
                      onClick={handleContinueSavedAccount}
                      className="w-full h-13 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base rounded-full shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {continueLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Verificando...</span>
                        </>
                      ) : (
                        "Continuar"
                      )}
                    </button>

                    {/* Divisor "ou" */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#ECE7E0]" />
                      </div>
                      <div className="relative flex justify-center text-[11px] text-[#9C9188]">
                        <span className="bg-white px-2">ou</span>
                      </div>
                    </div>

                    {/* Link "Acessar de outra forma" */}
                    <button
                      type="button"
                      disabled={continueLoading}
                      onClick={() => setView("welcome")}
                      className="w-full text-center text-xs sm:text-sm font-bold text-[#E3A008] hover:text-[#C1440E] transition-colors py-1 cursor-pointer disabled:opacity-50"
                    >
                      Acessar de outra forma
                    </button>
                  </div>
                ) : (
                  /* ═══════════════════════════════════════════════════════════════ */
                  /* TELA 2: WELCOME (IDÊNTICO À PRIMEIRA CAPTURA DO APP)         */
                  /* ═══════════════════════════════════════════════════════════════ */
                  <div className="flex flex-col space-y-3 pt-1 animate-in fade-in">
                    {/* Botão Amarelo Pílula: "Já tenho uma conta" (h-13) */}
                    <button
                      type="button"
                      onClick={() => handleGoToLogin()}
                      className="w-full h-13 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-full shadow-xs flex items-center justify-center transition-all cursor-pointer"
                    >
                      Já tenho uma conta
                    </button>

                    {/* Botão Branco com Borda Amarela Pílula: "Criar nova conta" (h-13) */}
                    <button
                      type="button"
                      onClick={handleGoToRegister}
                      className="w-full h-13 bg-white hover:bg-[#FFFDF7] border-2 border-[#E3A008] active:scale-[0.99] text-[#E3A008] hover:text-[#C1440E] font-bold text-sm sm:text-base rounded-full flex items-center justify-center transition-all cursor-pointer"
                    >
                      Criar nova conta
                    </button>

                    {/* Texto Central: "Acessar com" */}
                    <div className="pt-2 pb-1 text-center">
                      <span className="text-xs text-[#6B6157] font-medium">Acessar com</span>
                    </div>

                    {/* Botão Redondo com Ícone do Google */}
                    <div className="flex justify-center pb-1">
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={googleLoading}
                        aria-label="Acessar com Google"
                        className="w-12 h-12 rounded-full border border-[#ECE7E0] hover:bg-[#F7F4EF] flex items-center justify-center active:scale-95 shadow-2xs transition-all cursor-pointer"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
