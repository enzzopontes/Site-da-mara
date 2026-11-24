"use client"

import { useState, useEffect, useRef } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Copy, Check, QrCode, Clock, CheckCircle2, AlertCircle, ExternalLink, XCircle } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface PixPaymentBoxProps {
  orderId: string
  total: number
  pixData?: any
  mpPaymentId?: string | number | null
  onPaymentApproved?: () => void
}

function isPixStatusUnderpaid(res: any): boolean {
  return Boolean(
    res?.action === "held_underpaid" ||
      res?.status === "held_underpaid" ||
      res?.needs_review === true ||
      res?.review_reason === "underpaid"
  )
}

function isPixStatusApproved(res: any): boolean {
  return (
    !isPixStatusUnderpaid(res) &&
    (res?.statusDetail === "accredited" ||
      res?.paymentStatus === "approved" ||
      res?.status === "approved" ||
      res?.status === "processed")
  )
}

function isOrderMetadataUnderpaid(meta: any): boolean {
  return Boolean(
    (meta?.needs_review && meta?.review_reason === "underpaid") ||
      meta?.review_reason === "underpaid"
  )
}

export function PixPaymentBox({
  orderId,
  total,
  pixData: initialPixData,
  mpPaymentId: initialMpPaymentId,
  onPaymentApproved,
}: PixPaymentBoxProps) {
  // Helper de extração multichaves idêntico ao app mobile
  const extractKeys = (data: any) => {
    if (!data) return { qrCode: "", qrCodeBase64: "", ticketUrl: "", expirationDate: null, paymentId: null }
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
    const paymentId =
      data.paymentId ||
      data.payment_id ||
      data.mp_payment_id ||
      data.pix?.payment_id ||
      null

    return { qrCode, qrCodeBase64, ticketUrl, expirationDate, paymentId }
  }

  const isPixStillValid = (data: any): boolean => {
    if (!data?.qrCode && !data?.qr_code && !data?.pix_qr_code) return false
    const exp = data?.expirationDate ?? data?.expiration_date ?? data?.date_of_expiration
    if (!exp) return true
    const expMs = new Date(exp).getTime()
    return Number.isFinite(expMs) && expMs - Date.now() > 60 * 1000
  }

  const [copied, setCopied] = useState(false)
  const [pix, setPix] = useState<any>(() => {
    if (!initialPixData) return null
    const parsed = extractKeys(initialPixData)
    return isPixStillValid(parsed) ? parsed : null
  })
  const [mpPaymentId, setMpPaymentId] = useState<string | null>(() => {
    const fromProp = initialMpPaymentId != null ? String(initialMpPaymentId) : null
    if (fromProp) return fromProp
    const fromInitial = extractKeys(initialPixData).paymentId
    return fromInitial != null ? String(fromInitial) : null
  })
  const [loading, setLoading] = useState(() => {
    if (!initialPixData) return true
    return !isPixStillValid(extractKeys(initialPixData))
  })
  const [error, setError] = useState<string | null>(null)
  const [isApproved, setIsApproved] = useState(false)
  const [isUnderpaidReview, setIsUnderpaidReview] = useState(false)
  const [isExpiredOrCancelled, setIsExpiredOrCancelled] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>("")
  const regenAttemptedRef = useRef(false)
  const hasTriggeredExpiryRef = useRef(false)
  const approvedNotifiedRef = useRef(false)

  const notifyApproved = () => {
    setIsApproved(true)
    if (!approvedNotifiedRef.current) {
      approvedNotifiedRef.current = true
      onPaymentApproved?.()
    }
  }

  // Sincroniza mpPaymentId se prop mudar
  useEffect(() => {
    if (initialMpPaymentId != null && String(initialMpPaymentId)) {
      setMpPaymentId(String(initialMpPaymentId))
    }
  }, [initialMpPaymentId])

  // Sincroniza pix se initialPixData mudar
  useEffect(() => {
    if (initialPixData) {
      const parsed = extractKeys(initialPixData)
      if (parsed.paymentId) {
        setMpPaymentId(String(parsed.paymentId))
      }
      if (isPixStillValid(parsed)) {
        regenAttemptedRef.current = false
        setPix(parsed)
        setLoading(false)
      }
    }
  }, [initialPixData])

  // Carrega os dados do Pix da API caso não tenham vindo no pedido inicialmente ou estejam expirados
  useEffect(() => {
    let isMounted = true

    async function fetchPix() {
      if (isApproved || isUnderpaidReview || isExpiredOrCancelled) return
      if (isPixStillValid(pix) || (pix && regenAttemptedRef.current)) return
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
          if (parsed.paymentId) {
            setMpPaymentId(String(parsed.paymentId))
          }
          regenAttemptedRef.current = !isPixStillValid(parsed)
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
  }, [orderId, pix?.qrCode, pix?.qr_code, isApproved, isUnderpaidReview, isExpiredOrCancelled])

  // Temporizador de expiração (30 min ou da API) — cancela o pedido via RPC ao zerar (igual app)
  useEffect(() => {
    if (!pix || isApproved || isUnderpaidReview || isExpiredOrCancelled) return

    const expTimeStr = pix?.expirationDate ?? pix?.expiration_date ?? pix?.date_of_expiration
    const parsedExp = expTimeStr ? new Date(expTimeStr).getTime() : NaN
    const expTime = Number.isFinite(parsedExp) ? parsedExp : Date.now() + 30 * 60 * 1000
    let timer: ReturnType<typeof setInterval> | undefined

    const updateTimer = () => {
      const diff = expTime - Date.now()
      if (diff <= 0) {
        setTimeLeft("Tempo expirado")
        if (timer) clearInterval(timer)
        if (!hasTriggeredExpiryRef.current) {
          hasTriggeredExpiryRef.current = true
          setIsExpiredOrCancelled(true)
          const supabase = getSupabaseBrowserClient()
          void (async () => {
            try {
              await supabase.rpc("cancel_order_user", {
                p_order_id: orderId,
                p_cancel_reason: "pix_expirado_30min",
              })
            } catch {}
          })()
        }
        return
      }
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`)
    }

    updateTimer()
    if (expTime - Date.now() > 0) {
      timer = setInterval(updateTimer, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [orderId, pix, isApproved, isUnderpaidReview, isExpiredOrCancelled])

  // Monitora mudança de status em tempo real via Supabase + Polling no banco
  useEffect(() => {
    if (isApproved || isUnderpaidReview || isExpiredOrCancelled) return
    const supabase = getSupabaseBrowserClient()
    let isActive = true

    const evaluateOrderState = (status: string | undefined, meta: any) => {
      const discoveredMpId = meta?.mp_payment_id || meta?.pix?.payment_id
      if (discoveredMpId) {
        setMpPaymentId((prev) => prev || String(discoveredMpId))
      }

      if (isOrderMetadataUnderpaid(meta)) {
        setIsUnderpaidReview(true)
        return true
      }

      if (status === "cancelled") {
        setIsExpiredOrCancelled(true)
        return true
      }

      const mpStatus = meta?.mp_payment_status
      const isPaid =
        (status && status !== "awaiting_payment" && status !== "cancelled") ||
        mpStatus === "approved" ||
        Boolean(meta?.paid_at)

      if (isPaid) {
        notifyApproved()
        return true
      }

      return false
    }

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
          if (!isActive) return
          evaluateOrderState(payload.new?.status, payload.new?.metadata)
        }
      )
      .subscribe()

    // 2. Polling ativo no Supabase a cada 3 segundos (também descobre metadata.mp_payment_id)
    const checkOrderRow = async () => {
      try {
        const { data, error: qErr } = await supabase
          .from("orders")
          .select("status, metadata")
          .eq("id", orderId)
          .maybeSingle()

        if (!isActive || qErr || !data) return
        const terminal = evaluateOrderState(data.status, data.metadata)
        if (terminal) {
          clearInterval(interval)
        }
      } catch {}
    }

    checkOrderRow()
    const interval = setInterval(checkOrderRow, 3000)

    return () => {
      isActive = false
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [orderId, onPaymentApproved, isApproved, isUnderpaidReview, isExpiredOrCancelled])

  // Polling ativo a cada 3s no endpoint /api/mercadopago/pix-status (reconciliação igual ao app)
  useEffect(() => {
    if (!mpPaymentId || isApproved || isUnderpaidReview || isExpiredOrCancelled) return

    let isPollingActive = true
    const supabase = getSupabaseBrowserClient()

    const pollMercadoPago = async () => {
      if (!isPollingActive) return
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token
        const headers: Record<string, string> = {}
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }

        const res = await fetch(
          `/api/mercadopago/pix-status?id=${encodeURIComponent(mpPaymentId)}&orderId=${encodeURIComponent(orderId)}`,
          { headers }
        )
        const result = await res.json().catch(() => null)
        if (!isPollingActive || !result) return

        if (isPixStatusUnderpaid(result)) {
          isPollingActive = false
          clearInterval(interval)
          setIsUnderpaidReview(true)
          return
        }

        if (!result.success) return

        if (isPixStatusApproved(result)) {
          isPollingActive = false
          clearInterval(interval)
          notifyApproved()
        } else if (
          result.status === "cancelled" ||
          result.status === "rejected" ||
          result.status === "expired" ||
          result.statusDetail === "expired" ||
          result.paymentStatus === "cancelled" ||
          result.paymentStatus === "rejected"
        ) {
          isPollingActive = false
          clearInterval(interval)
          setIsExpiredOrCancelled(true)
        }
      } catch {}
    }

    const interval = setInterval(pollMercadoPago, 3000)

    return () => {
      isPollingActive = false
      clearInterval(interval)
    }
  }, [mpPaymentId, orderId, isApproved, isUnderpaidReview, isExpiredOrCancelled, onPaymentApproved])

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

  if (isUnderpaidReview) {
    return (
      <div className="bg-[#FEF3C7] border-2 border-[#E3A008] rounded-3xl p-6 text-center shadow-lg shadow-amber-50 mb-6 transition-all duration-500 animate-in fade-in">
        <div className="w-16 h-16 bg-[#E3A008] text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md shadow-amber-200">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-[#78350F]">Pagamento em revisão</h3>
        <p className="text-sm font-semibold text-[#B45309] mt-1">
          Identificamos uma divergência no valor pago via Pix. Nossa equipe está analisando seu pagamento e entrará em contato em breve.
        </p>
      </div>
    )
  }

  if (isExpiredOrCancelled) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-6 text-center shadow-lg shadow-red-50 mb-6 transition-all duration-500 animate-in fade-in">
        <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md shadow-red-200">
          <XCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-red-950">Pix expirado ou cancelado</h3>
        <p className="text-sm font-semibold text-red-700 mt-1">
          O tempo limite de 30 minutos para pagamento via Pix expirou ou o pagamento foi cancelado. Faça um novo pedido se desejar.
        </p>
      </div>
    )
  }

  const qrCodeText = pix?.qrCode || pix?.qr_code || ""
  const rawBase64 = pix?.qrCodeBase64 || pix?.qr_code_base64 || ""
  const qrImageUri = rawBase64
    ? rawBase64.startsWith("data:image/")
      ? rawBase64
      : `data:image/png;base64,${rawBase64}`
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
          {/* Imagem do QR Code (apenas base64 local, sem envio do payload a terceiros) */}
          {qrImageUri ? (
            <div className="bg-white p-3 rounded-2xl border-2 border-gray-200 shadow-inner mb-4">
              <img
                src={qrImageUri}
                alt="QR Code Pix"
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
              />
            </div>
          ) : (
            <div className="w-full bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-center mb-4">
              <QrCode className="w-7 h-7 text-amber-600 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-amber-900">
                Imagem do QR Code indisponível no momento.
              </p>
              <p className="text-xs text-amber-800/90 mt-1">
                Use <strong>&quot;Copiar código PIX&quot;</strong>
                {pix.ticketUrl ? (
                  <> ou <strong>&quot;Abrir link de pagamento&quot;</strong></>
                ) : null}{" "}
                abaixo para finalizar o pagamento.
              </p>
            </div>
          )}

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
            </div>
          ) : null}

          {pix.ticketUrl && /^https:\/\/.+/i.test(pix.ticketUrl) && (
            <a
              href={pix.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 mt-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-500" />
              <span>Abrir link de pagamento no navegador / app</span>
            </a>
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
            <p className="text-[11px] text-gray-400 mt-2 italic text-center">
              Assim que você pagar, o status atualiza automaticamente aqui.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
