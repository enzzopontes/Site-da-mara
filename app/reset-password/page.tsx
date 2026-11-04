"use client"

import type React from "react"
import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { validatePassword } from "@/lib/security-auth"
import Link from "next/link"
import { Eye, EyeOff, ArrowRight, Lock, CheckCircle2, ChevronLeft } from "lucide-react"
import { Footer } from "@/components/footer"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [linkError, setLinkError] = useState(false)
  // FIX: ref para garantir que exchangeCodeForSession só é chamado uma vez
  // (evita double-invoke do React Strict Mode / hydration do Next.js)
  const exchanged = useRef(false)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const init = async () => {
      // Já tem sessão ativa? (ex: usuário já autenticado)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSessionReady(true)
        return
      }

      // Fluxo PKCE: troca o "code" da URL por uma sessão
      const code = searchParams.get("code")
      if (code && !exchanged.current) {
        exchanged.current = true // bloqueia segunda chamada
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error || !data.session) {
          console.error("Erro ao trocar code por sessão:", error)
          setLinkError(true)
          return
        }
        setSessionReady(true)
        return
      }

      // Sem sessão e sem code: link inválido/expirado
      if (!exchanged.current) {
        setLinkError(true)
      }
    }

    init()
    // FIX: removido onAuthStateChange daqui — causava conflito com exchangeCodeForSession
    // e podia resultar em sessão sendo processada duas vezes
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (password !== confirmPassword) {
      setError("As senhas não coincidem")
      return
    }

    const passCheck = validatePassword(password)
    if (!passCheck.isValid) {
      setError(passCheck.error || "A senha deve conter no mínimo 8 caracteres, letra e número.")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error
      
      setSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error: any) {
      console.error("Erro ao resetar senha:", error)
      setError(error.message || "Erro ao atualizar senha. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <header className="w-full bg-white border-b border-gray-100 py-4 px-4 flex items-center justify-between sticky top-0 z-50">
          <Link href="/" className="relative w-10 h-10 lg:w-12 lg:h-12 mx-auto lg:mx-0">
            <img src="/logo.png" alt="batata top" className="w-full h-full object-contain" />
          </Link>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Senha alterada!</h2>
            <p className="text-gray-500 font-medium">
              Sua senha foi atualizada com sucesso. Você será redirecionado para o login em instantes.
            </p>
            <Button 
              onClick={() => router.push("/login")}
              className="w-full h-14 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-2xl"
            >
              IR PARA LOGIN
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (linkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
              <Lock className="w-10 h-10 text-red-500" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Link inválido ou expirado</h2>
          <p className="text-gray-500 font-medium">
            Este link de redefinição de senha não é mais válido. Solicite um novo link para continuar.
          </p>
          <Button
            onClick={() => router.push("/login")}
            className="w-full h-14 bg-yellow-500 hover:bg-yellow-600 text-white font-black rounded-2xl"
          >
            VOLTAR PARA LOGIN
          </Button>
        </div>
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold">Verificando link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="w-full bg-white border-b border-gray-100 py-4 px-4 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-50 rounded-full transition-colors lg:hidden">
          <ChevronLeft className="h-6 w-6 text-gray-900" />
        </button>
        <Link href="/" className="relative w-10 h-10 lg:w-12 lg:h-12 mx-auto lg:mx-0">
          <img src="/logo.png" alt="batata top" className="w-full h-full object-contain" />
        </Link>
        <div className="w-10 lg:hidden" />
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="w-full lg:w-1/2 bg-yellow-50 flex items-center justify-center p-8 lg:p-12 relative overflow-hidden min-h-[200px] lg:min-h-screen">
          <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-200 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-48 h-48 bg-orange-200 rounded-full blur-3xl animate-pulse delay-700" />
          </div>
          
          <div className="relative z-10 text-center">
            <div className="w-20 h-20 bg-white rounded-[28px] flex items-center justify-center mb-6 shadow-sm mx-auto">
              <Lock className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-3xl lg:text-5xl font-black text-gray-900 mb-4 tracking-tighter leading-tight">
              Segurança em <br/> primeiro lugar
            </h2>
            <p className="text-lg lg:text-xl text-gray-600 font-medium">
              Crie uma nova senha forte para proteger sua conta.
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-white rounded-t-[32px] -mt-8 lg:mt-0 relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] lg:shadow-none">
          <div className="max-w-md w-full space-y-8">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter">
                Nova Senha
              </h2>
              <p className="mt-2 text-gray-500 font-medium">
                Digite sua nova senha abaixo.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nova Senha</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="h-14 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-500 focus:ring-0 rounded-2xl text-base pr-12 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  className="h-14 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-500 focus:ring-0 rounded-2xl text-base transition-all"
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-xs p-4 rounded-2xl font-bold">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-16 text-lg font-black bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl shadow-lg shadow-yellow-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? "Salvando..." : "ATUALIZAR SENHA"}
                {!loading && <ArrowRight className="h-5 w-5" />}
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-500 font-bold">Verificando link...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}