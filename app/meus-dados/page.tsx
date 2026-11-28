"use client"

import { appToast } from "@/lib/app-toast"

import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { User, Mail, Phone, Calendar, ArrowLeft, Save, Download, Trash2, ShieldCheck, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import { MeusDadosSkeleton } from "@/components/skeletons/meus-dados-skeleton"
import { useEffect, useState } from "react"
import { OrderSummary } from "@/components/order-summary"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

function formatCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, "")
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i)
  let check1 = 11 - (sum % 11)
  if (check1 >= 10) check1 = 0
  if (check1 !== parseInt(cpf[9], 10)) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i)
  let check2 = 11 - (sum % 11)
  if (check2 >= 10) check2 = 0
  if (check2 !== parseInt(cpf[10], 10)) return false

  return true
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11)
  if (d.length === 0) return ""
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export default function MeusDadosPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [saving, setSaving] = useState(false)
  const [cpfTouched, setCpfTouched] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    cpf: "",
    birth_date: "",
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    let mounted = true

    setFormData({
      full_name: user.user_metadata?.full_name || "",
      phone: formatPhone(user.user_metadata?.phone || ""),
      cpf: formatCPF(user.user_metadata?.cpf || ""),
      birth_date: user.user_metadata?.birth_date || "",
    })

    supabase
      .from("profiles")
      .select("full_name, phone, cpf")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!mounted || !data) return
        setFormData((prev) => ({
          full_name: data.full_name || prev.full_name,
          phone: formatPhone(data.phone || prev.phone),
          cpf: formatCPF(data.cpf || prev.cpf),
          birth_date: prev.birth_date,
        }))
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [user, supabase])

  const cpfDigitsValue = formData.cpf.replace(/\D/g, "")
  const cpfError =
    cpfTouched && cpfDigitsValue.length > 0 && !isValidCPF(cpfDigitsValue)

  const handleSave = async () => {
    if (!user) return

    const trimmedName = formData.full_name.trim()
    if (trimmedName.length < 3) {
      appToast.warning("Nome incompleto", "Por favor, insira seu nome completo.")
      return
    }

    const phoneDigits = formData.phone.replace(/\D/g, "")
    if (phoneDigits.length > 0 && phoneDigits.length < 10) {
      appToast.warning("Telefone inválido", "Por favor, insira um telefone válido com DDD.")
      return
    }

    const cpfDigits = formData.cpf.replace(/\D/g, "")
    if (cpfDigits.length > 0 && !isValidCPF(cpfDigits)) {
      setCpfTouched(true)
      appToast.warning("CPF inválido", "Insira um número de CPF válido ou deixe o campo em branco.")
      return
    }
    
    setSaving(true)
    try {
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name: trimmedName,
            phone: phoneDigits || null,
            cpf: cpfDigits || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
      if (profileErr) throw profileErr

      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          phone: phoneDigits || null,
          cpf: cpfDigits || null,
          birth_date: formData.birth_date,
        }
      })

      if (error) throw error
      
      appToast.success("Dados atualizados!", "Suas informações foram salvas com sucesso.")
    } catch (error) {
      console.error("Erro ao atualizar dados:", error)
      appToast.error("Erro ao atualizar", "Não foi possível salvar os dados. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const handlePhoneChange = (value: string) => {
    setFormData({ ...formData, phone: formatPhone(value) })
  }

  const handleCpfChange = (value: string) => {
    setFormData({ ...formData, cpf: formatCPF(value) })
  }

  if (loading) {
    return <MeusDadosSkeleton />
  }

  if (!user) {
    return <MeusDadosSkeleton />
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <HeaderWrapper />
      <main className="flex-1 py-8 pb-24 lg:pb-8">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Cabeçalho */}
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()}
              className="h-10 w-10 rounded-full hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-gray-800">Meus Dados</h1>
              <p className="text-sm text-gray-500">Gerencie suas informações pessoais</p>
            </div>
          </div>

          {/* Formulário */}
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            {/* Nome Completo */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4 text-yellow-500" />
                Nome Completo
              </Label>
              <Input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Digite seu nome completo"
                className="h-12 rounded-xl border-gray-200 focus:border-yellow-300"
              />
            </div>

            {/* Email (Somente leitura) */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Mail className="h-4 w-4 text-yellow-500" />
                Email
              </Label>
              <Input
                type="email"
                value={user.email || ""}
                disabled
                className="h-12 rounded-xl border-gray-200 bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400">O email não pode ser alterado</p>
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Phone className="h-4 w-4 text-yellow-500" />
                Telefone
              </Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className="h-12 rounded-xl border-gray-200 focus:border-yellow-300"
              />
            </div>

            {/* CPF */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4 text-yellow-500" />
                CPF (opcional)
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formData.cpf}
                onChange={(e) => handleCpfChange(e.target.value)}
                onBlur={() => setCpfTouched(true)}
                placeholder="000.000.000-00"
                maxLength={14}
                className={`h-12 rounded-xl ${
                  cpfError
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-200 focus:border-yellow-300"
                }`}
              />
              {cpfError && (
                <p className="text-xs font-semibold text-red-600">
                  Insira um número de CPF válido.
                </p>
              )}
            </div>

            {/* Data de Nascimento */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-yellow-500" />
                Data de Nascimento
              </Label>
              <Input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="h-12 rounded-xl border-gray-200 focus:border-yellow-300"
              />
            </div>

            {/* Botão Salvar */}
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-base shadow-lg shadow-amber-200 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            >
              {saving ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-5 w-5" aria-hidden="true" />
                  Salvar Alterações
                </div>
              )}
            </Button>
          </div>

          {/* Seção LGPD & Direitos do Titular */}
          <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-700" aria-hidden="true" />
              <h2 className="text-base font-extrabold text-gray-900">
                Seus Direitos de Privacidade (LGPD)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              Em conformidade com o Artigo 18 da Lei Federal nº 13.709/2018, você pode fazer o download dos seus dados pessoais em formato portável ou solicitar a eliminação definitiva de sua conta.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/user/export-data", { credentials: "same-origin" })
                    if (!res.ok) {
                      const errData = await res.json().catch(() => null)
                      throw new Error(errData?.error || "Não foi possível exportar seus dados agora.")
                    }
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement("a")
                    link.href = url
                    link.download = `batata-top-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                    URL.revokeObjectURL(url)
                  } catch (err: any) {
                    appToast.error("Erro ao exportar", err?.message || "Tente novamente em instantes.")
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#FAF8F5] hover:bg-amber-50 text-[#1F1B16] font-bold rounded-xl text-xs sm:text-sm transition-colors border border-[#E8E2D9] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E3A008]"
              >
                <Download className="h-4 w-4 text-[#C1440E]" aria-hidden="true" />
                Exportar Meus Dados (JSON)
              </button>

              <Button
                variant="outline"
                onClick={() => router.push("/excluir-conta")}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 font-bold rounded-xl text-xs sm:text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Solicitar Exclusão de Conta
              </Button>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="mt-6 bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm text-amber-900 font-bold">💡 Informação</p>
            <p className="text-xs text-amber-800 mt-1">
              Seus dados de entrega e telefone são utilizados exclusivamente para o preparo e despacho dos seus pedidos em Iacanga-SP.
            </p>
          </div>
        </div>
      </main>
      <Footer />
      <OrderSummary />
    </div>
  )
}
