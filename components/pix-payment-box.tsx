"use client"

import { useState, useEffect } from "react"
import { Copy, Check, QrCode, Clock, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface PixPaymentBoxProps {
  orderId: string
  total: number
  pixData?: {
    qrCode?: string
    qrCodeBase64?: string
    ticketUrl?: string
    expirationDate?: string
  } | null
  onPaymentApproved?: () => void
}

export function PixPaymentBox({ orderId, total, pixData: initialPixData, onPaymentApproved }: PixPaymentBoxProps) {
  const [copied, setCopied] = useState(false)
  const [pix, setPix] = useState(initialPixData || null)
  const [loading, setLoading] = useState(!initialPixData?.qrCode)
  const [error, setError] = useState<string | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>("")

  // Carrega os dados do Pix da API caso não tenham vindo no pedido inicialmente
  useEffect(() => {
    let isMounted = true

    async function fetchPix() {
      if (pix?.qrCode) return
      setLoading(true)
      setError(null)
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token

        if (!token) {
          setError("Sessão expirada. Faça login novamente.")
          setLoading(false)
          return
        }

        const res = await fetch("/api/mercadopago/pix", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId }),
        })

        const data = await res.json()
        if (!isMounted) return

        if (data.success) {
          setPix({
            qrCode: data.qrCode,
            qrCodeBase64: data.qrCodeBase64,
            ticketUrl: data.ticketUrl,
            expirationDate: data.expirationDate,
          })
        } else {
          setError(data.error || "Não foi possível carregar o código Pix.")
        }
      } catch (err: any) {
        if (isMounted) setError("Falha ao comunicar com o Mercado Pago.")
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchPix()

    return () => {
      isMounted = false
    }
  }, [orderId, pix?.qrCode])

  // Temporizador de expiração
  useEffect(() => {
    if (!pix?.expirationDate) return

    const updateTimer = () => {
      const expTime = new Date(pix.expirationDate!).getTime()
      const diff = expTime - Date.now()
      if (diff <= 0) {
        setTimeLeft("Expirado")
        return
      }
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`)
    }

    updateTimer()
    const timer = setInterval(updateTimer, 1000)
    return () => clearInterval(timer)
  }, [pix?.expirationDate])

  // Monitora mudança de status em tempo real via Supabase + Polling HTTP
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    // 1. Inscrição Realtime no Supabase
    const channel = supabase
      .channel(`order-pix-status-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload: any) => {
          const newStatus = payload.new?.status
          if (newStatus && newStatus !== "awaiting_payment" && newStatus !== "cancelled") {
            setIsApproved(true)
            onPaymentApproved?.()
          }
        }
      )
      .subscribe()

    // 2. Polling ativo a cada 4 segundos como contingência
    const interval = setInterval(async () => {
      try {
        const { data, error: qErr } = await supabase
          .from("orders")
          .select("status")
          .eq("id", orderId)
          .maybeSingle()

        if (!qErr && data && data.status !== "awaiting_payment") {
          setIsApproved(true)
          onPaymentApproved?.()
          clearInterval(interval)
        }
      } catch {}
    }, 4000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [orderId, onPaymentApproved])

  const handleCopyCode = async () => {
    if (!pix?.qrCode) return
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(pix.qrCode)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = pix.qrCode
        textArea.style.position = "fixed"
        textArea.style.left = "-999999px"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error("Erro ao copiar código Pix:", err)
    }
  }

  if (isApproved) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-6 text-center shadow-lg shadow-emerald-50 mb-6 animate-in fade-in">
        <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-200">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-emerald-950">Pagamento Pix Confirmado!</h3>
        <p className="text-sm font-semibold text-emerald-700 mt-1">
          Recebemos seu pagamento. Seu pedido foi encaminhado imediatamente para a cozinha!
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border-2 border-amber-400 rounded-3xl p-5 sm:p-6 shadow-xl shadow-amber-500/10 mb-6">
      <div className="flex items-center justify-between border-b border-amber-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-200">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-black tracking-wider text-amber-700 uppercase bg-amber-100 px-2.5 py-0.5 rounded-full inline-block mb-1">
              Pagamento Imediato
            </span>
            <h3 className="text-lg font-black text-gray-900 leading-tight">Pague via Pix</h3>
          </div>
        </div>

        {timeLeft && (
          <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full text-xs font-black text-gray-700">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>{timeLeft}</span>
          </div>
        )}
      </div>

      <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-3.5 text-xs text-amber-900 font-medium mb-4 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p>
          O pedido será enviado para preparo <strong>automaticamente</strong> assim que você efetuar o pagamento.
        </p>
      </div>

      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
          <p className="text-sm font-bold text-gray-600">Gerando QR Code seguro do Pix...</p>
        </div>
      )}

      {error && !loading && (
        <div className="py-6 text-center">
          <p className="text-sm font-bold text-red-600 mb-3">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-500 text-white text-xs font-black rounded-xl hover:bg-amber-600 active:scale-95 transition-all"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {!loading && !error && pix && (
        <div className="flex flex-col items-center">
          {/* Imagem do QR Code se disponível */}
          {pix.qrCodeBase64 ? (
            <div className="bg-white p-3 rounded-2xl border-2 border-gray-200 shadow-inner mb-4">
              <img
                src={`data:image/png;base64,${pix.qrCodeBase64}`}
                alt="QR Code Pix"
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
              />
            </div>
          ) : null}

          {/* Valor a pagar */}
          <div className="text-center mb-4">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Valor do Pix</span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900">
              R$ {total.toFixed(2).replace(".", ",")}
            </div>
          </div>

          {/* Botão Copia e Cola */}
          {pix.qrCode && (
            <div className="w-full space-y-2">
              <button
                onClick={handleCopyCode}
                className={`w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md ${
                  copied
                    ? "bg-emerald-600 text-white shadow-emerald-200"
                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>Código Pix Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copiar Código Pix (Copia e Cola)</span>
                  </>
                )}
              </button>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5">
                <p className="text-[11px] font-mono text-gray-500 break-all line-clamp-2 select-all">
                  {pix.qrCode}
                </p>
              </div>
            </div>
          )}

          {/* Guia Rápido estilo iFood */}
          <div className="w-full mt-5 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-black text-gray-800 uppercase tracking-wide mb-2">
              Como pagar com Pix:
            </h4>
            <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside font-medium">
              <li>Copie o código Pix acima ou escaneie o QR Code.</li>
              <li>Abra o aplicativo do seu banco preferido.</li>
              <li>Escolha a opção <strong>Pix Copia e Cola</strong>.</li>
              <li>Cole o código e confirme o pagamento de <strong>R$ {total.toFixed(2).replace(".", ",")}</strong>.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
