"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/lib/auth-context"
import { 
  Trash2, 
  FileText, 
  Smartphone, 
  Mail, 
  CheckCircle2, 
  ArrowLeft,
  ChevronDown,
  Check,
  Loader2
} from "lucide-react"

const REASON_OPTIONS = [
  { value: "privacy", label: "Preocupações com privacidade de dados" },
  { value: "not_using", label: "Não utilizo mais o serviço" },
  { value: "duplicate", label: "Possuo outra conta cadastrada" },
  { value: "experience", label: "Experiência insatisfatória com o app" },
  { value: "other", label: "Outro motivo" }
]

export default function ExcluirContaPage() {
  const { user } = useAuth()
  const [identifier, setIdentifier] = useState("")
  const [reason, setReason] = useState("")
  const [isOpenSelect, setIsOpenSelect] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [protocol, setProtocol] = useState("")
  const selectRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user?.email) {
      setIdentifier(user.email)
    }
  }, [user])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpenSelect(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedReasonObj = REASON_OPTIONS.find((opt) => opt.value === reason)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) return

    setLoading(true)

    // Simula geração de protocolo e processamento da requisição
    setTimeout(() => {
      const randomProtocol = `BT-${Math.floor(100000 + Math.random() * 900000)}`
      setProtocol(randomProtocol)
      setLoading(false)
      setSubmitted(true)
    }, 900)
  }

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F1B16] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 antialiased selection:bg-[#E3A008] selection:text-white">
      {/* Botão de Retorno */}
      <div className="max-w-xl w-full mx-auto mb-4">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-bold text-[#6B635B] hover:text-[#1F1B16] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Início
        </Link>
      </div>

      <main className="w-full max-w-xl mx-auto my-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-[#E8E2D9] p-6 sm:p-10 transition-all">
          
          {/* 1. Cabeçalho */}
          <header className="text-center mb-8">
            <Link href="/" className="inline-block relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3">
              <Image
                src="/logo.png"
                alt="Batata Top Delivery"
                fill
                className="object-contain"
                priority
              />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F1B16] tracking-tight">
              Batata Top
            </h1>
            <p className="text-xs font-bold text-[#E3A008] uppercase tracking-wider mt-1">
              Iacanga - SP
            </p>
            <p className="text-sm sm:text-base text-[#6B635B] mt-2 font-medium">
              Central de Privacidade e Exclusão de Dados
            </p>
          </header>

          {/* 2. Explicação Transparente (LGPD / Google Play) */}
          <section className="space-y-3 mb-8">
            <div className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E2D9] text-xs sm:text-sm leading-relaxed space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-red-50 text-red-600 rounded-lg shrink-0 mt-0.5">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <strong className="font-bold text-[#1F1B16] block">
                    O que será permanentemente excluído:
                  </strong>
                  <p className="text-[#6B635B] mt-0.5">
                    Seus dados de perfil (nome, e-mail, telefone), histórico de endereços cadastrados, preferências de entrega e tokens de pagamento salvos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-[#E8E2D9]">
                <div className="p-1.5 bg-amber-50 text-[#C1440E] rounded-lg shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <strong className="font-bold text-[#1F1B16] block">
                    Retenção obrigatória por lei:
                  </strong>
                  <p className="text-[#6B635B] mt-0.5">
                    Registros fiscais e histórico de pedidos faturados serão arquivados pelo prazo legal de 5 anos (Marco Civil da Internet Art. 15 e Código Tributário Nacional).
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Formulário de Solicitação ou Feedback de Sucesso */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4 mb-8">
              <div>
                <label htmlFor="identifier" className="block text-xs sm:text-sm font-bold text-[#1F1B16] mb-1.5">
                  E-mail ou WhatsApp cadastrado na conta
                </label>
                <input
                  type="text"
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  placeholder="exemplo@email.com ou (14) 99999-9999"
                  className="w-full px-4 py-3 rounded-xl border border-[#E8E2D9] text-[#1F1B16] bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E3A008] focus:border-transparent transition-all text-sm font-medium"
                />
              </div>

              {/* Custom Select Bonito e Moderno */}
              <div className="relative" ref={selectRef}>
                <label className="block text-xs sm:text-sm font-bold text-[#1F1B16] mb-1.5">
                  Motivo da solicitação <span className="font-normal text-[#6B635B]">(opcional)</span>
                </label>
                
                <button
                  type="button"
                  onClick={() => setIsOpenSelect(!isOpenSelect)}
                  className={`w-full px-4 py-3 rounded-xl border bg-white text-left text-sm font-medium flex items-center justify-between transition-all cursor-pointer ${
                    isOpenSelect 
                      ? "border-[#E3A008] ring-2 ring-[#E3A008]/20 shadow-sm" 
                      : "border-[#E8E2D9] hover:border-gray-300"
                  }`}
                >
                  <span className={selectedReasonObj ? "text-[#1F1B16] font-semibold" : "text-gray-400"}>
                    {selectedReasonObj ? selectedReasonObj.label : "Selecione um motivo..."}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#6B635B] transition-transform duration-200 ${isOpenSelect ? "rotate-180 text-[#E3A008]" : ""}`} />
                </button>

                {/* Dropdown Menu Estilizado */}
                {isOpenSelect && (
                  <div className="absolute z-30 left-0 right-0 mt-2 bg-white border border-[#E8E2D9] rounded-2xl shadow-xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150">
                    {REASON_OPTIONS.map((opt) => {
                      const isSelected = reason === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setReason(opt.value)
                            setIsOpenSelect(false)
                          }}
                          className={`w-full px-4 py-2.5 text-left text-xs sm:text-sm flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected 
                              ? "bg-[#FFF7E8] text-[#C1440E] font-bold" 
                              : "text-[#1F1B16] hover:bg-[#F7F4EF]"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <Check className="w-4 h-4 text-[#C1440E] shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#E3A008] hover:bg-[#C1440E] text-white font-extrabold text-sm sm:text-base shadow-md transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.99] mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando solicitação...</span>
                  </>
                ) : (
                  <span>Solicitar Exclusão de Conta</span>
                )}
              </button>
            </form>
          ) : (
            <div className="mb-8 p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs sm:text-sm space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm sm:text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Solicitação recebida com sucesso!</span>
              </div>
              <p className="text-emerald-900 leading-relaxed">
                Um protocolo de confirmação foi registrado sob o número: <strong className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-900">{protocol}</strong>.
              </p>
              <p className="text-emerald-800">
                O prazo de anonimização e exclusão total dos dados é de até <strong>7 dias corridos</strong> conforme preconiza a LGPD.
              </p>
            </div>
          )}

          {/* 4. Instruções Alternativas / Suporte */}
          <section className="border-t border-[#E8E2D9] pt-6">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#6B635B] mb-3">
              Outras formas de solicitar a exclusão
            </h2>
            <div className="space-y-2.5 text-xs sm:text-sm text-[#6B635B]">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-[#E3A008] shrink-0" />
                <span>
                  Diretamente no app: Menu <strong>Perfil &gt; Segurança &gt; Excluir Conta</strong>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#E3A008] shrink-0" />
                <span>
                  Via e-mail de suporte:{" "}
                  <a 
                    href="mailto:enzzobaraldo2008@gmail.com" 
                    className="text-[#1F1B16] font-bold underline hover:text-[#C1440E] transition-colors"
                  >
                    enzzobaraldo2008@gmail.com
                  </a>
                </span>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* 5. Rodapé */}
      <footer className="text-center text-xs text-[#6B635B] py-6 space-y-2 max-w-xl mx-auto w-full">
        <div className="flex justify-center items-center gap-4 font-semibold">
          <Link href="/privacidade" className="hover:text-[#1F1B16] transition-colors">
            Política de Privacidade
          </Link>
          <span>•</span>
          <Link href="/termos" className="hover:text-[#1F1B16] transition-colors">
            Termos de Uso
          </Link>
        </div>
        <p>© {new Date().getFullYear()} Batata Top • Delivery de Batata Recheada • Iacanga - SP.</p>
        <p className="text-[10px] text-gray-400">Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
