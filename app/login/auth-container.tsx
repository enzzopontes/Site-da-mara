"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, ArrowRight, Sparkles, MapPin, Star, ChevronLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export function AuthContainer({ initialMode = "login" }: { initialMode?: "login" | "register" }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signInWithEmail, signUpWithEmail, resetPassword, user } = useAuth()
  
  const [mode, setMode] = useState<"login" | "register" | "forgot-password">(initialMode)
  const [successMessage, setSuccessMessage] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")
    setLoading(true)

    try {
      if (mode === "login") {
        await signInWithEmail(email, password)
      } else if (mode === "register") {
        if (password !== confirmPassword) {
          setError("As senhas não coincidem")
          setLoading(false)
          return
        }
        await signUpWithEmail(email, password)
      } else if (mode === "forgot-password") {
        await resetPassword(email)
        setSuccessMessage("E-mail de recuperação enviado! Verifique sua caixa de entrada.")
      }
    } catch (err: any) {
      console.error("Erro na autenticação:", err)
      
      let errorMessage = "Ocorreu um erro. Tente novamente."
      
      if (err.message?.includes("Invalid login credentials")) {
        errorMessage = "E-mail ou senha incorretos."
      } else if (err.message?.includes("User already registered")) {
        errorMessage = "Este e-mail já está cadastrado. Tente fazer login."
      } else if (err.message?.includes("Password should be at least 6 characters")) {
        errorMessage = "A senha deve ter pelo menos 6 caracteres."
      } else if (err.message?.includes("Email not confirmed")) {
        errorMessage = "Por favor, confirme seu e-mail antes de entrar."
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4 sm:p-6 lg:p-8 font-sans overflow-hidden">
      <div className="w-full max-w-5xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col lg:flex-row relative min-h-[600px]">
        
        {/* BOTÃO VOLTAR */}
        <button 
          onClick={() => router.push('/')} 
          className="absolute top-6 left-6 z-50 p-2 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full shadow-sm transition-all active:scale-90 border border-gray-100"
        >
          <ChevronLeft className="h-6 w-6 text-gray-900" />
        </button>

        {/* LADO DA ANIMAÇÃO / INFO (DESKTOP) */}
        <div 
          className={`hidden lg:flex lg:w-1/2 bg-yellow-400 relative z-40 items-center justify-center p-12 overflow-hidden transition-all duration-700 ease-in-out ${
            mode === "login" ? "translate-x-full" : "translate-x-0"
          }`}
        >
          {/* Background decorativo */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -left-20 w-64 h-64 bg-yellow-300 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-yellow-500 rounded-full blur-3xl opacity-50" />
          </div>

          <div className="relative z-10 text-center w-full">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-xl rotate-3 transition-all duration-500">
                {slides[activeSlide].icon}
              </div>
              <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700">
                {slides[activeSlide].title}
              </h2>
              <p className="text-xl text-gray-800 font-medium opacity-80 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                {slides[activeSlide].description}
              </p>
            </div>

            <div className="flex justify-center gap-2 mt-12">
              {slides.map((_, i) => (
                <div key={i} className={`h-2 rounded-full transition-all duration-500 ${activeSlide === i ? "w-10 bg-gray-900" : "w-2 bg-gray-900/20"}`} />
              ))}
            </div>

            <div className="mt-16">
              <p className="text-gray-900 font-bold mb-4">
                {mode === "login" ? "Ainda não tem uma conta?" : "Já possui uma conta?"}
              </p>
              <Button 
                variant="outline" 
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white font-black px-8 h-12 rounded-xl transition-all"
              >
                {mode === "login" ? "CRIAR CONTA AGORA" : "FAZER LOGIN"}
              </Button>
            </div>
          </div>
        </div>

        {/* LADO DO FORMULÁRIO (LOGIN) */}
        <div 
          className={`w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white transition-all duration-700 ease-in-out ${
            mode === "login" ? "lg:-translate-x-full opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="max-w-sm mx-auto w-full space-y-8">
            <div className="text-center lg:text-left">
              <div className="flex justify-center lg:justify-start mb-6">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                  <Image 
                    src="/logo.png" 
                    alt="batata top" 
                    fill 
                    className="rounded-full object-contain pointer-events-none" 
                    priority 
                  />
                </div>
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Bem-vindo de volta!</h2>
              <p className="text-gray-500 font-medium mt-2">Acesse sua conta para continuar pedindo.</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="h-14 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-500 focus:ring-0 rounded-2xl text-base transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    required
                    className="h-14 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-500 focus:ring-0 rounded-2xl text-base pr-12 transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="flex justify-end px-1">
                  <button 
                    type="button" 
                    onClick={() => {
                      setMode("forgot-password")
                      setError("")
                      setSuccessMessage("")
                    }}
                    className="text-[11px] font-bold text-yellow-600 hover:text-yellow-700 transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
              </div>

              {error && mode === "login" && (
                <div className="bg-red-50 text-red-600 text-xs p-4 rounded-2xl font-bold animate-in fade-in zoom-in-95">
                  {error}
                </div>
              )}

              {successMessage && mode === "login" && (
                <div className="bg-green-50 text-green-600 text-xs p-4 rounded-2xl font-bold animate-in fade-in zoom-in-95">
                  {successMessage}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-16 text-lg font-black bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl shadow-lg shadow-yellow-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                {loading ? "Entrando..." : "ENTRAR"}
                {!loading && <ArrowRight className="h-5 w-5" />}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-gray-400 font-bold uppercase tracking-widest text-[10px]">ou</span></div>
            </div>

            <Button variant="outline" onClick={() => signIn()} className="w-full h-14 text-base font-bold bg-white hover:bg-gray-50 border-2 border-gray-100 rounded-2xl flex items-center justify-center gap-3 transition-all">
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Entrar com Google
            </Button>

            <p className="text-[11px] text-center text-gray-400 mt-2 font-medium leading-relaxed">
              Ao continuar, você concorda com os{" "}
              <Link href="/termos" className="text-gray-600 underline hover:text-yellow-600 font-bold">
                Termos de Uso
              </Link>{" "}
              e confirma que leu nossa{" "}
              <Link href="/privacidade" className="text-gray-600 underline hover:text-yellow-600 font-bold">
                Política de Privacidade
              </Link>{" "}
              do Batata Top.
            </p>

            <p className="text-center text-gray-500 font-medium text-sm lg:hidden">
              Não tem conta? <button onClick={() => setMode("register")} className="text-yellow-600 font-black">Cadastre-se</button>
            </p>
          </div>
        </div>

        {/* LADO DO FORMULÁRIO (ESQUECI SENHA) */}
        <div 
          className={`w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white transition-all duration-700 ease-in-out absolute inset-y-0 right-0 ${
            mode === "forgot-password" ? "lg:translate-x-0 opacity-100" : "lg:-translate-x-full opacity-0 pointer-events-none"
          }`}
        >
          <div className="max-w-sm mx-auto w-full space-y-8">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Recuperar Senha</h2>
              <p className="text-gray-500 font-medium mt-2">Enviaremos um link para você definir uma nova senha.</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="h-14 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-500 focus:ring-0 rounded-2xl text-base transition-all"
                />
              </div>

              {error && mode === "forgot-password" && (
                <div className="bg-red-50 text-red-600 text-xs p-4 rounded-2xl font-bold animate-in fade-in zoom-in-95">
                  {error}
                </div>
              )}

              {successMessage && mode === "forgot-password" && (
                <div className="bg-green-50 text-green-600 text-xs p-4 rounded-2xl font-bold animate-in fade-in zoom-in-95">
                  {successMessage}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-16 text-lg font-black bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl shadow-lg shadow-yellow-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                {loading ? "Enviando..." : "ENVIAR LINK"}
                {!loading && <ArrowRight className="h-5 w-5" />}
              </Button>

              <button 
                type="button" 
                onClick={() => {
                  setMode("login")
                  setError("")
                  setSuccessMessage("")
                }}
                className="w-full text-center text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Voltar para o Login
              </button>
            </form>
          </div>
        </div>

        {/* LADO DO FORMULÁRIO (CADASTRO) */}
        <div 
          className={`w-full lg:w-1/2 p-8 sm:p-12 pb-24 lg:p-16 flex flex-col justify-center bg-white transition-all duration-700 ease-in-out absolute inset-y-0 right-0 ${
            mode === "register" ? "lg:translate-x-0 opacity-100" : "lg:-translate-x-full opacity-0 pointer-events-none"
          }`}
        >
          <div className="max-w-sm mx-auto w-full space-y-8">
            <div className="text-center lg:text-left">
              <div className="flex justify-center lg:justify-start mb-6">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                  <Image 
                    src="/logo.png" 
                    alt="batata top" 
                    fill 
                    className="rounded-full object-contain pointer-events-none" 
                    priority 
                  />
                </div>
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Crie sua conta!</h2>
              <p className="text-gray-500 font-medium mt-2">Junte-se à família batata top hoje mesmo.</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="h-14 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-500 focus:ring-0 rounded-2xl text-base transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="h-14 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-500 focus:ring-0 rounded-2xl text-base transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita sua senha"
                  required
                  className="h-14 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-500 focus:ring-0 rounded-2xl text-base transition-all"
                />
              </div>

              {error && mode === "register" && (
                <div className="bg-red-50 text-red-600 text-xs p-4 rounded-2xl font-bold animate-in fade-in zoom-in-95">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-16 text-lg font-black bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl shadow-lg shadow-yellow-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                {loading ? "Criando..." : "CRIAR CONTA"}
                {!loading && <ArrowRight className="h-5 w-5" />}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-gray-400 font-bold uppercase tracking-widest text-[10px]">ou</span></div>
            </div>

            <Button variant="outline" onClick={() => signIn()} className="w-full h-14 text-base font-bold bg-white hover:bg-gray-50 border-2 border-gray-100 rounded-2xl flex items-center justify-center gap-3 transition-all">
              <svg className="h-6 w-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Cadastrar com Google
            </Button>

            <p className="text-[11px] text-center text-gray-400 mt-2 font-medium leading-relaxed">
              Ao continuar, você concorda com os{" "}
              <Link href="/termos" className="text-gray-600 underline hover:text-yellow-600 font-bold">
                Termos de Uso
              </Link>{" "}
              e confirma que leu nossa{" "}
              <Link href="/privacidade" className="text-gray-600 underline hover:text-yellow-600 font-bold">
                Política de Privacidade
              </Link>{" "}
              do Batata Top.
            </p>

            <p className="text-center text-gray-500 font-medium text-sm lg:hidden">
              Já tem conta? <button onClick={() => setMode("login")} className="text-yellow-600 font-black">Faça Login</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
