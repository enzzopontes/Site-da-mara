"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Copy, Check, QrCode, Clock, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface PixPaymentBoxProps {
  orderId: string
  total: number
  pixData?: any
  onPaymentApproved?: () => void
}

export function PixPaymentBox({ orderId, total, pixData: initialPixData, onPaymentApproved }: PixPaymentBoxProps) {
  const [copied, setCopied] = useState(false)
  const [pix, setPix] = useState<any>(initialPixData || null)
  const [loading, setLoading] = useState(!initialPixData?.qrCode && !initialPixData?.qr_code)
  const [error, setError] = useState<string | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>("")

  // Helper de extração multichaves idêntico ao app mobile
  const extractKeys = (data: any) => {
    if (!data) return { qrCode: "", qrCodeBase64: "", ticketUrl: "", expirationDate: null }
    const qrCode =
      data.pix_qr_code ||
      data.qr_code ||
      data.qrCode ||
      data.point_of_interaction?.transaction_data?.qr_code ||
      data.pix_code ||
      ""
    const qrCodeBase64 =
      data.pix_qr_code_base64 ||
      data.qr_code_base64 ||
      data.qrCodeBase64 ||
      data.point_of_interaction?.transaction_data?.qr_code_base64 ||
      ""
    const ticketUrl =
      data.ticket_url ||
      data.ticketUrl ||
      data.point_of_interaction?.transaction_data?.ticket_url ||
      data.init_point ||
      data.payment_link ||
      ""
    const expirationDate =
      data.expirationDate ||
      data.expiration_date ||
      data.date_of_expiration ||
      null

    return { qrCode, qrCodeBase64, ticketUrl, expirationDate }
  }

  // Sincroniza pix se initialPixData mudar
  useEffect(() => {
    if (initialPixData) {
      const parsed = extractKeys(initialPixData)
      if (parsed.qrCode || parsed.qrCodeBase64) {
        setPix(parsed)
        setLoading(false)
      }
    }
  }, [initialPixData])

  // Carrega os dados do Pix da API caso não tenham vindo no pedido inicialmente
  useEffect(() => {
    let isMounted = true

    async function fetchPix() {
      if (pix?.qrCode || pix?.qr_code) return
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
          const parsed = extractKeys(data)
          setPix(parsed)
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

  // Temporizador de expiração (30 min ou da API)
  useEffect(() => {
    const expTimeStr = pix?.expirationDate
    const expTime = expTimeStr
      ? new Date(expTimeStr).getTime()
      : Date.now() + 30 * 60 * 1000

    const updateTimer = () => {
      const diff = expTime - Date.now()
      if (diff <= 0) {
        setTimeLeft("Tempo expirado")
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
      .channel(`order-pix-status-${orderId}-${Date.now()}`)
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
          const mpStatus = payload.new?.metadata?.mp_payment_status
          if (
            (newStatus && newStatus !== "awaiting_payment" && newStatus !== "cancelled") ||
            mpStatus === "approved"
          ) {
            setIsApproved(true)
            onPaymentApproved?.()
          }
        }
      )
      .subscribe()

    // 2. Polling ativo a cada 3 segundos como contingência (igual app)
    const interval = setInterval(async () => {
      try {
        const { data, error: qErr } = await supabase
          .from("orders")
          .select("status, metadata")
          .eq("id", orderId)
          .maybeSingle()

        if (!qErr && data) {
          const isPaid =
            (data.status && data.status !== "awaiting_payment" && data.status !== "cancelled") ||
            data.metadata?.mp_payment_status === "approved" ||
            Boolean(data.metadata?.paid_at)

          if (isPaid) {
            setIsApproved(true)
            onPaymentApproved?.()
            clearInterval(interval)
          }
        }
      } catch {}
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [orderId, onPaymentApproved])

  const handleCopyCode = async () => {
    const code = pix?.qrCode || pix?.qr_code
    if (!code) return
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = code
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
      <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-6 text-center shadow-lg shadow-emerald-50 mb-6 transition-all duration-500 animate-in fade-in">
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

  const qrCodeText = pix?.qrCode || pix?.qr_code || ""
  const qrImageUri = pix?.qrCodeBase64 || pix?.qr_code_base64
    ? `data:image/png;base64,${pix?.qrCodeBase64 || pix?.qr_code_base64}`
    : qrCodeText
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeText)}`
    : null

  return (
    <div className="bg-white border-2 border-amber-400 rounded-3xl p-5 sm:p-6 shadow-xl shadow-amber-500/10 mb-6 transition-all">
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
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-black text-amber-900">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pague em até {timeLeft}</span>
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
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          aria-label="Gerando QR Code do Pix"
          className="py-6 flex flex-col items-center justify-center space-y-4 select-none"
        >
          <Skeleton className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl mx-auto" />
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-14 w-full rounded-2xl" />
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
          {/* Imagem do QR Code (com fallback de API online idêntico ao app) */}
          {qrImageUri ? (
            <div className="bg-white p-3 rounded-2xl border-2 border-gray-200 shadow-inner mb-4">
              <img
                src={qrImageUri}
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
          {qrCodeText ? (
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
                  {qrCodeText}
                </p>
              </div>

              {pix.ticketUrl && (
                <a
                  href={pix.ticketUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-gray-500" />
                  <span>Abrir link de pagamento no navegador / app</span>
                </a>
              )}
            </div>
          ) : null}

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
            <p className="text-[11px] text-gray-400 mt-2 italic text-center">
              Assim que você pagar, o status atualiza automaticamente aqui.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
