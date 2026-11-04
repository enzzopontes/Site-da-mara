"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { Eye, EyeOff, ArrowRight, Sparkles, MapPin, Star, ChevronLeft, Mail, X, CheckCircle2 } from "lucide-react"

export function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signInWithEmail, user } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const { resetPassword } = useAuth()

  const slides = [
    {
      title: "As melhores batatas de Iacanga",
      description: "Sabor inigualável e ingredientes selecionados.",
      icon: <Sparkles className="w-10 h-10 text-yellow-500" />,
      color: "bg-yellow-50"
    },
    {
      title: "Entrega rápida na sua porta",
      description: "Sua batata chega quentinha em poucos minutos.",
      icon: <MapPin className="w-10 h-10 text-orange-500" />,
      color: "bg-orange-50"
    },
    {
      title: "Peça e ganhe pontos",
      description: "Cada pedido te deixa mais perto de uma batata grátis.",
      icon: <Star className="w-10 h-10 text-amber-500" />,
      color: "bg-amber-50"
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (user) {
      const returnUrl = searchParams.get("returnUrl") || "/cardapio"
      router.push(returnUrl)
    }
  }, [user, router, searchParams])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await signInWithEmail(email, password)
    } catch (error: any) {
      console.error("Erro ao fazer login:", error)
      if (error.message?.includes("Invalid login credentials")) {
        setError("Email ou senha incorretos")
      } else {
        setError("Erro ao fazer login. Tente novamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setError("")
    try {
      await resetPassword(resetEmail)
      setResetSuccess(true)
    } catch (error: any) {
      console.error("Erro ao resetar senha:", error)
      setError("Erro ao enviar e-mail de recuperação.")
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header Simplificado com Botão Voltar no Mobile */}
      <header className="w-full bg-white border-b border-gray-100 py-4 px-4 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-50 rounded-full transition-colors lg:hidden">
          <ChevronLeft className="h-6 w-6 text-gray-900" />
        </button>
        <Link href="/" className="relative w-10 h-10 lg:w-12 lg:h-12 mx-auto lg:mx-0">
          <img src="/logo.png" alt="batata top" className="w-full h-full object-contain" />
        </Link>
        <div className="w-10 lg:hidden" /> {/* Espaçador para centralizar logo no mobile */}
      </header>
      
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LADO INTERATIVO: Agora aparece como um banner no topo no Mobile */}
        <div className="w-full lg:w-1/2 bg-gray-50 flex items-center justify-center p-8 lg:p-12 relative overflow-hidden min-h-[280px] lg:min-h-screen">
          <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-200 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-48 h-48 bg-orange-200 rounded-full blur-3xl animate-pulse delay-700" />
          </div>
          
          <div className="relative z-10 w-full max-w-md">
            <div className="relative h-48 lg:h-64">
              {slides.map((slide, index) => (
                <div 
                  key={index}
                  className={`transition-all duration-1000 absolute inset-0 flex flex-col items-center text-center ${
                    activeSlide === index ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8 pointer-events-none"
                  }`}
                >
                  <div className={`w-16 h-16 lg:w-20 lg:h-20 ${slide.color} rounded-2xl lg:rounded-[28px] flex items-center justify-center mb-6 shadow-sm`}>
                    {slide.icon}
                  </div>
                  <h2 className="text-2xl lg:text-4xl font-black text-gray-900 mb-2 lg:mb-4 tracking-tighter leading-tight">
                    {slide.title}
                  </h2>
                  <p className="text-base lg:text-xl text-gray-500 font-medium px-4">
                    {slide.description}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center gap-2 mt-4 lg:mt-8">
              {slides.map((_, index) => (
                <div 
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    activeSlide === index ? "w-8 bg-yellow-500" : "w-1.5 bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* LADO DO FORMULÁRIO */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-white rounded-t-[32px] -mt-8 lg:mt-0 relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] lg:shadow-none">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">
                Bem-vindo de volta!
              </h2>
              <p className="mt-2 text-gray-500 font-medium">
                Acesse sua conta para continuar.
              </p>
            </div>

            <div className="space-y-6">
              <Button
                type="button"
                variant="outline"
                className="w-full h-14 text-base font-bold bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-800 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                onClick={() => signIn()}
                disabled={loading}
                aria-label="Entrar na conta utilizando o Google"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Entrar com Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-400 font-bold uppercase tracking-widest text-[10px]">ou use seu e-mail</span>
                </div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">E-mail</label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="h-14 bg-gray-50 border-gray-200 focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-2xl text-base transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label htmlFor="login-password" className="text-xs font-bold text-gray-700 uppercase tracking-wider">Senha</label>
                    <button 
                      type="button"
                      onClick={() => setShowResetModal(true)}
                      className="text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-600 rounded"
                    >
                      Esqueceu?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      required
                      className="h-14 bg-gray-50 border-gray-200 focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600 rounded-2xl text-base pr-12 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                      aria-label={showPassword ? "Ocultar senha digitada" : "Exibir senha digitada em texto"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div role="alert" className="bg-red-50 text-red-700 border border-red-200 text-xs p-4 rounded-2xl font-bold animate-shake">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-16 text-lg font-black bg-amber-600 hover:bg-amber-700 text-white rounded-2xl shadow-lg shadow-amber-200 transition-all active:scale-95 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "ENTRAR"}
                  {!loading && <ArrowRight className="h-5 w-5" aria-hidden="true" />}
                </Button>
              </form>

              <div className="text-center pt-4">
                <p className="text-gray-500 font-medium text-sm">
                  Não tem conta?{" "}
                  <Link href="/cadastro" className="text-yellow-600 font-black">
                    Cadastre-se grátis
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Modal de Reset de Senha Estilo iFood */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-yellow-600" />
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setShowResetModal(false)
                    setResetSuccess(false)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                  aria-label="Fechar janela de recuperação de senha"
                >
                  <X className="h-6 w-6 text-gray-500" aria-hidden="true" />
                </button>
              </div>

              {!resetSuccess ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Esqueceu a senha?</h3>
                    <p className="text-gray-500 font-medium mt-2">
                      Não se preocupe! Digite seu e-mail abaixo e enviaremos as instruções para você criar uma nova senha.
                    </p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail cadastrado</label>
                      <Input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="seu@email.com"
                        required
                        className="h-14 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-500 focus:ring-0 rounded-2xl text-base transition-all"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={resetLoading}
                      className="w-full h-16 text-lg font-black bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl shadow-lg shadow-yellow-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      {resetLoading ? "Enviando..." : "ENVIAR LINK"}
                      {!resetLoading && <ArrowRight className="h-5 w-5" />}
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="text-center space-y-6 py-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">E-mail enviado!</h3>
                    <p className="text-gray-500 font-medium mt-2">
                      Verifique sua caixa de entrada (e a pasta de spam) para redefinir sua senha.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowResetModal(false)}
                    className="w-full h-14 bg-gray-900 hover:bg-gray-800 text-white font-black rounded-2xl transition-all"
                  >
                    ENTENDI
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
