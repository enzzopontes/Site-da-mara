"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ShoppingBag, ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import { appToast } from "@/lib/app-toast"

import { useCart, type CartItem } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { couponsManager, type Coupon } from "@/lib/cupons-manager"
import { evaluateCoupon, resolveCouponForCheckout } from "@/lib/coupon-rules"
import { storeStatusManager, type StoreStatus } from "@/lib/store-status-manager"
import { addressesManager, type Address } from "@/lib/addresses-manager"
import { ordersManager } from "@/lib/orders-manager"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { usePaymentCards } from "@/hooks/use-payment-cards"
import { tokenizeSavedCardCvv, isValidCpf } from "@/lib/mercado-pago-client"
import { trackInitiateCheckout, trackPurchase } from "@/lib/meta-pixel"

import { CartHeader, type CheckoutStep } from "@/components/checkout/cart-header"
import { CartFooter } from "@/components/checkout/cart-footer"
import { MinOrderSheet } from "@/components/checkout/min-order-sheet"
import { StepItens } from "@/components/checkout/step-itens"
import { StepEntrega } from "@/components/checkout/step-entrega"
import { StepPagamento, type InstallmentOption } from "@/components/checkout/step-pagamento"
import { CheckoutSkeleton } from "@/components/skeletons/checkout-skeleton"
import { AddressModal } from "@/components/address-modal"
import { AddToCartDialog } from "@/components/add-to-cart-dialog"

const MIN_ORDER_VALUE = 20.0

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "Você precisa estar logado para fazer um pedido.",
  invalid_customer_name: "Por favor, informe seu nome.",
  invalid_customer_phone: "Telefone inválido para contato.",
  invalid_delivery_type: "Tipo de entrega inválido.",
  invalid_payment_method: "Forma de pagamento inválida.",
  online_requires_pix_or_card: "Pagamento online requer PIX ou Cartão.",
  store_is_closed: "A loja está fechada no momento.",
  delivery_disabled: "O serviço de entrega está temporariamente indisponível.",
  too_many_awaiting_orders:
    "Você já possui 3 pedidos aguardando pagamento. Conclua ou aguarde o cancelamento.",
  rate_limit_exceeded:
    "Muitos pedidos em pouco tempo. Aguarde alguns minutos antes de tentar novamente.",
  invalid_items: "Os itens do pedido são inválidos.",
  invalid_product_id: "Produto selecionado inválido.",
  invalid_item_quantity: "Quantidade de item inválida (deve ser entre 1 e 99).",
  product_not_found: "Um dos produtos não foi encontrado em nosso cardápio.",
  product_unavailable: "Um dos produtos escolhidos está indisponível no momento.",
  addon_not_found: "Adicional não encontrado.",
  addon_unavailable: "Um dos adicionais escolhidos está indisponível.",
  invalid_addon_quantity: "Quantidade de adicional inválida.",
  invalid_addon_id: "Identificador de adicional inválido.",
  too_many_addons: "Limite de adicionais excedido.",
  coupon_not_found: "Cupom de desconto não encontrado.",
  coupon_inactive: "Este cupom não está ativo.",
  coupon_expired: "Este cupom já expirou.",
  coupon_max_uses_reached: "Este cupom atingiu o limite máximo de utilizações.",
  coupon_min_order_value_not_met:
    "O valor mínimo do pedido para este cupom não foi atingido.",
  coupon_user_limit_reached: "Você já atingiu o limite de usos para este cupom.",
  coupon_not_applicable: "Este cupom não é aplicável a este pedido.",
  min_order_value_not_met:
    "O pedido mínimo é de R$ 20,00 (sem considerar taxa de entrega).",
  coupon_blocked_by_active_promo:
    "Cupons não podem ser combinados com promoções ativas no momento.",
  coupon_first_order_only: "Este cupom é válido apenas para o seu primeiro pedido.",
  address_too_long: "Endereço muito longo.",
  notes_too_long: "Observação do pedido muito longa (máximo 500 caracteres).",
  pasta_type_too_long: "Tipo de massa inválido.",
  item_notes_too_long: "Observação do item muito longa.",
  coupon_type_unsupported: "Tipo de cupom não suportado.",
  online_total_must_be_positive:
    "O valor total para pagamento online deve ser maior que zero.",
}

function isValidPhone(phone: string): boolean {
  let digits = (phone || "").replace(/\D/g, "")
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2)
  }
  if (digits.length !== 10 && digits.length !== 11) return false
  const ddd = parseInt(digits.slice(0, 2), 10)
  if (ddd < 11 || ddd > 99) return false
  if (digits.length === 11 && digits[2] !== "9") return false
  if (/^(\d)\1+$/.test(digits)) return false
  return true
}

function formatPhone(value: string): string {
  let digits = (value || "").replace(/\D/g, "")
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2)
  }
  digits = digits.slice(0, 11)
  if (digits.length === 0) return ""
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function getCardRejectionMessage(statusDetail?: string): string {
  switch (statusDetail) {
    case "cc_rejected_insufficient_amount":
      return "Saldo insuficiente"
    case "cc_rejected_bad_filled_security_code":
      return "Código de segurança (CVV) inválido"
    case "cc_rejected_bad_filled_date":
      return "Cartão vencido ou data inválida"
    case "cc_rejected_bad_filled_card_number":
    case "cc_rejected_bad_filled_other":
      return "Dados do cartão incorretos"
    case "cc_rejected_call_for_authorize":
      return "Autorize a transação junto ao seu banco"
    case "cc_rejected_card_disabled":
      return "Cartão desabilitado"
    case "cc_rejected_duplicated_payment":
      return "Pagamento duplicado recentemente"
    case "cc_rejected_max_attempts":
      return "Limite de tentativas excedido"
    default:
      return "Pagamento recusado pela operadora do cartão"
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { items, getTotalPrice, updateQuantity, updateItem, removeItem, addItem, clearCart, coupon: cartCoupon, setCoupon: setCartCoupon } = useCart()

  // Controle de etapas do fluxo (Padrão iFood: itens -> entrega -> pagamento)
  const [step, setStep] = useState<CheckoutStep>("itens")

  // Status da loja e regras de entrega
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null)
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [isDeliveryEnabled, setIsDeliveryEnabled] = useState(true)
  const [isDeliveryFeeEnabled, setIsDeliveryFeeEnabled] = useState(true)
  const [deliveryFee, setDeliveryFee] = useState(3.0)
  const [isPromoActive, setIsPromoActive] = useState(false)

  // Endereços do cliente
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>("")
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery")
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)

  // Dados de contato
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const savedProfilePhoneRef = useRef<string>("")

  // Formulário de novo endereço
  const [rua, setRua] = useState("")
  const [numero, setNumero] = useState("")
  const [complemento, setComplemento] = useState("")
  const [bairro, setBairro] = useState("")
  const [cep, setCep] = useState("")
  const [newAddressCoords, setNewAddressCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  })
  const [enderecoError, setEnderecoError] = useState("")
  const [buscandoCep, setBuscandoCep] = useState(false)
  const cepAbortRef = useRef<AbortController | null>(null)
  const cepRequestIdRef = useRef(0)
  const selectedAddressIdRef = useRef(selectedAddressId)

  useEffect(() => {
    selectedAddressIdRef.current = selectedAddressId
  }, [selectedAddressId])

  // Pagamento e opções do pedido
  const [formaPagamento, setFormaPagamento] = useState<
    | "pix"
    | "cartao_credito"
    | "cartao_debito"
    | "cartao_entrega"
    | "cartao_credito_entrega"
    | "cartao_debito_entrega"
    | "dinheiro"
  >("pix")
  const [selectedSavedCard, setSelectedSavedCard] = useState<any | null>(null)
  const [savedCardCvv, setSavedCardCvv] = useState("")
  const [cardCpf, setCardCpf] = useState("")
  const [installments, setInstallments] = useState(1)
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentOption[]>([])
  const [loadingInstallments, setLoadingInstallments] = useState(false)
  const { cards: savedCards, loadCards, addCard, savingCard } = usePaymentCards()
  const [troco, setTroco] = useState("")
  const [precisaTalheres, setPrecisaTalheres] = useState<"sim" | "nao" | "">("")
  const [observacoes, setObservacoes] = useState("")

  // Cupons
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponError, setCouponError] = useState("")
  const [validandoCupom, setValidandoCupom] = useState(false)

  // Produtos recomendados para o carrossel "Aproveite e peça também"
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([])

  // Modal de Pedido Mínimo
  const [showMinOrderSheet, setShowMinOrderSheet] = useState(false)

  // Modal de edição de item da sacola
  const [editingCartItem, setEditingCartItem] = useState<{ index: number; item: CartItem } | null>(null)

  // Estados de submissão e carregamento
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const pendingOrderIdRef = useRef<string | null>(null)
  const pendingOrderTotalRef = useRef<number | null>(null)

  useEffect(() => {
    pendingOrderIdRef.current = null
    pendingOrderTotalRef.current = null
  }, [items, formaPagamento, appliedCoupon, deliveryType])

  const applyStoreSettings = useCallback((val: any) => {
    if (!val) return
    setStoreStatus(val)
    if (typeof val.isOpen === "boolean") {
      setIsStoreOpen(val.isOpen)
    }
    if (typeof val.isDeliveryEnabled === "boolean") {
      setIsDeliveryEnabled(val.isDeliveryEnabled)
      if (!val.isDeliveryEnabled) {
        setDeliveryType("pickup")
      }
    }
    if (val.isDeliveryFeeEnabled === true) {
      setIsDeliveryFeeEnabled(true)
      const parsedFee = Number(val.deliveryFee)
      setDeliveryFee(Number.isFinite(parsedFee) && parsedFee >= 0 ? parsedFee : 3.0)
    } else if (val.isDeliveryFeeEnabled === false) {
      setIsDeliveryFeeEnabled(false)
      setDeliveryFee(0)
    }
    const promoOn = Boolean(
      val.itemPromo?.isActive || val.superPromo?.isActive || val.isPromoActive
    )
    setIsPromoActive(promoOn)
  }, [])

  // ─── 1. Carregamento inicial de status da loja, usuário e produtos ─────────────
  useEffect(() => {
    async function init() {
      setIsLoadingData(true)
      try {
        // Status da Loja
        const status = await storeStatusManager.getStatus()
        applyStoreSettings(status)

        const supabase = getSupabaseBrowserClient()

        // Dados do Usuário e Endereços
        if (user) {
          setNome(user.user_metadata?.full_name || "")
          let userPhone = (user.phone || user.user_metadata?.phone || "").trim()

          const userAddrs = await addressesManager.getUserAddresses(user.id)
          setAddresses(userAddrs)
          const def = userAddrs.find((a) => a.is_default)
          if (def) {
            setSelectedAddressId(def.id)
            setUseNewAddress(false)
          } else if (userAddrs.length > 0) {
            setSelectedAddressId(userAddrs[0].id)
            setUseNewAddress(false)
          } else {
            setUseNewAddress(true)
          }

          loadCards()
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("cpf, phone")
              .eq("id", user.id)
              .maybeSingle()
            if (profile?.cpf) {
              setCardCpf(profile.cpf)
            }
            if (profile?.phone) {
              const cleanProfilePhone = profile.phone.replace(/\D/g, "").replace(/^55/, "")
              savedProfilePhoneRef.current = cleanProfilePhone
              if (!userPhone) {
                userPhone = profile.phone.trim()
              }
            }
          } catch {
            // Silêncio
          }

          if (userPhone) {
            setTelefone(formatPhone(userPhone) || userPhone)
          }
        }

        // Busca produtos disponíveis para o carrossel "Aproveite e peça também"
        const { data: prods } = await supabase
          .from("products")
          .select("*")
          .eq("available", true)
          .limit(12)

        if (prods && prods.length > 0) {
          const mapped = prods.map((p: any) => ({
            ...p,
            image: p.image_url || p.image || "/ui/placeholder.jpg",
          }))
          setRecommendedProducts(mapped)
        }
      } catch (err) {
        console.error("[Checkout] Erro ao carregar dados:", err)
      } finally {
        setIsLoadingData(false)
      }
    }
    init()
  }, [user, applyStoreSettings])

  // Sincroniza endereços quando alterados/removidos no AddressModal
  useEffect(() => {
    if (!user?.id) return
    let active = true

    const handleAddressChanged = async () => {
      try {
        const fresh = await addressesManager.getUserAddresses(user.id)
        if (!active) return
        setAddresses(fresh)
        const currentId = selectedAddressIdRef.current
        if (!fresh.some((a) => a.id === currentId)) {
          const fallback = fresh.find((a) => a.is_default) || fresh[0]
          if (fallback) {
            setSelectedAddressId(fallback.id)
            setUseNewAddress(false)
            setEnderecoError("")
          } else {
            setSelectedAddressId("")
            setUseNewAddress(true)
          }
        }
      } catch {
        // Silêncio
      }
    }

    window.addEventListener("address-changed", handleAddressChanged)
    return () => {
      active = false
      window.removeEventListener("address-changed", handleAddressChanged)
    }
  }, [user?.id])

  // Assina atualizações em tempo real de store_settings (loja aberta, taxa de entrega e promoção ativa)
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel("store_settings_checkout_realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "store_settings",
          filter: "setting_key=eq.store_status",
        },
        (payload: any) => {
          const nextVal = payload?.new?.setting_value
          if (nextVal) {
            const computedVal = { ...nextVal }
            if (computedVal.autoSchedule !== false && !computedVal.manualOverride) {
              computedVal.isOpen = storeStatusManager.shouldBeOpenBySchedule(computedVal)
            }
            applyStoreSettings(computedVal)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [applyStoreSettings])

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?returnUrl=/checkout")
    }
  }, [user, authLoading, router])

  // Pré-seleciona cartão padrão se usuário escolher pagamento com cartão
  useEffect(() => {
    if (formaPagamento === "cartao_credito" || formaPagamento === "cartao_debito") {
      if (selectedSavedCard) {
        const expectedMethod =
          selectedSavedCard.card_type === "cartão de débito" ? "cartao_debito" : "cartao_credito"
        if (formaPagamento !== expectedMethod) {
          setFormaPagamento(expectedMethod)
        }
      } else if (savedCards.length > 0) {
        const targetType =
          formaPagamento === "cartao_debito" ? "cartão de débito" : "cartão de crédito"
        const matchingCards = savedCards.filter((c) => c.card_type === targetType)
        const pool = matchingCards.length > 0 ? matchingCards : savedCards
        const def = pool.find((c) => c.is_default) || pool[0]
        setSelectedSavedCard(def)
        if (def?.card_type) {
          const actualMethod =
            def.card_type === "cartão de débito" ? "cartao_debito" : "cartao_credito"
          if (formaPagamento !== actualMethod) {
            setFormaPagamento(actualMethod)
          }
        }
      }
    }
  }, [formaPagamento, selectedSavedCard, savedCards])

  // ─── Cálculos Financeiros ──────────────────────────────────────────────────
  const subtotal = getTotalPrice()
  // Base oficial do mínimo: subtotal bruto dos itens (sem frete, sem desconto).
  // Cupom pendente (abaixo do mínimo) ou promoção ativa não gera desconto nem trava o pedido.
  const discountAmount = isPromoActive ? 0 : evaluateCoupon(appliedCoupon, subtotal, items).discount
  const currentDeliveryFee = deliveryType === "pickup" || !isDeliveryFeeEnabled ? 0 : deliveryFee
  const baseTotal = Math.round((Math.max(0, subtotal - discountAmount) + currentDeliveryFee) * 100) / 100
  const selectedInstallmentOption =
    formaPagamento === "cartao_credito"
      ? installmentOptions.find((opt) => opt.installments === installments) || null
      : null
  const finalTotal =
    selectedInstallmentOption &&
    selectedInstallmentOption.installments > 1 &&
    formaPagamento === "cartao_credito"
      ? Math.round(selectedInstallmentOption.totalAmount * 100) / 100
      : baseTotal
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  // Carrega opções reais de parcelamento no Mercado Pago para cartão de crédito
  const loadInstallments = useCallback(
    async (overrideAmount?: number) => {
      const targetAmount =
        typeof overrideAmount === "number" && overrideAmount > 0 ? overrideAmount : baseTotal
      if (formaPagamento !== "cartao_credito" || targetAmount <= 0) {
        setInstallmentOptions([])
        return
      }

      if (!selectedSavedCard?.id) {
        setInstallmentOptions([
          {
            installments: 1,
            installmentAmount: targetAmount,
            totalAmount: targetAmount,
          },
        ])
        return
      }

      setLoadingInstallments(true)
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: sessionRes } = await supabase.auth.getSession()
        const token = sessionRes?.session?.access_token
        if (!token) {
          setInstallmentOptions([
            {
              installments: 1,
              installmentAmount: targetAmount,
              totalAmount: targetAmount,
            },
          ])
          return
        }

        const res = await fetch("/api/mercadopago/installments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: targetAmount,
            savedCardId: selectedSavedCard.id,
          }),
        })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.success && Array.isArray(data.payerCosts) && data.payerCosts.length > 0) {
          setInstallmentOptions(data.payerCosts)
          setInstallments((prev) => {
            const match = data.payerCosts.find((c: InstallmentOption) => c.installments === prev)
            return match ? match.installments : data.payerCosts[0].installments
          })
        } else {
          setInstallmentOptions([
            {
              installments: 1,
              installmentAmount: targetAmount,
              totalAmount: targetAmount,
            },
          ])
          setInstallments(1)
        }
      } catch (err) {
        console.error("[Checkout] Erro ao consultar parcelamento:", err)
        setInstallmentOptions([
          {
            installments: 1,
            installmentAmount: targetAmount,
            totalAmount: targetAmount,
          },
        ])
      } finally {
        setLoadingInstallments(false)
      }
    },
    [baseTotal, formaPagamento, selectedSavedCard?.id]
  )

  useEffect(() => {
    if (formaPagamento !== "cartao_credito") {
      setInstallments(1)
      setInstallmentOptions([])
      return
    }
    loadInstallments(pendingOrderTotalRef.current ?? undefined)
  }, [formaPagamento, selectedSavedCard?.id, baseTotal, loadInstallments])

  const hasTrackedCheckoutRef = useRef(false)
  useEffect(() => {
    if (!authLoading && !isLoadingData && items.length > 0 && !hasTrackedCheckoutRef.current) {
      hasTrackedCheckoutRef.current = true
      trackInitiateCheckout({
        contentIds: items.map((i) => String(i.id)),
        numItems: totalItemCount,
        value: Number(finalTotal) || 0,
      })
    }
  }, [authLoading, isLoadingData, items, totalItemCount, finalTotal])

  // ─── Formatação de Máscaras ────────────────────────────────────────────────
  const handleTelefoneChange = (value: string) => {
    setTelefone(formatPhone(value))
  }

  const handleCepChange = async (value: string) => {
    const formatted = value
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .substring(0, 9)
    setCep(formatted)
    const digits = formatted.replace(/\D/g, "")

    cepAbortRef.current?.abort()
    const requestId = ++cepRequestIdRef.current

    if (digits.length < 8) {
      setEnderecoError("")
      setBuscandoCep(false)
      return
    }

    const controller = new AbortController()
    cepAbortRef.current = controller
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
        signal: controller.signal,
      })
      const data = await res.json()
      if (requestId !== cepRequestIdRef.current) return
      if (!data.erro) {
        setRua(data.logradouro || "")
        setBairro(data.bairro || "")
        const normalizedCity = (data.localidade || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
        const normalizedUf = (data.uf || "").toUpperCase().trim()
        if (normalizedCity !== "iacanga" || (normalizedUf && normalizedUf !== "SP")) {
          setEnderecoError("No momento entregamos exclusivamente em Iacanga - SP.")
        } else {
          setEnderecoError("")
        }
      } else {
        setEnderecoError("")
        appToast.warning("CEP não encontrado", "Digite a rua e o bairro manualmente.")
      }
    } catch {
      // Silêncio em abort ou erro de rede ViaCEP
    } finally {
      if (requestId === cepRequestIdRef.current) {
        setBuscandoCep(false)
      }
    }
  }

  // ─── Cupons ────────────────────────────────────────────────────────────────
  const handleApplyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride || couponCode).trim()
    if (!code) return
    setValidandoCupom(true)
    setCouponError("")
    try {
      // Sem total: o mínimo não invalida o cupom, ele só fica pendente (evaluateCoupon).
      const res = await couponsManager.validateCoupon(code, user?.id)
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon)
        setCouponCode(res.coupon.code)
        if (setCartCoupon) setCartCoupon(res.coupon)
        try {
          sessionStorage.setItem("batata top-coupon", JSON.stringify(res.coupon))
          localStorage.removeItem("batata top-coupon")
          localStorage.removeItem("batata_applied_coupon")
          localStorage.removeItem("batata_pending_coupon")
        } catch {}
      } else {
        const errorMsg = res.message || "Cupom inválido ou esgotado."
        setCouponError(errorMsg)
        setAppliedCoupon(null)
        if (setCartCoupon) setCartCoupon(null)
        try {
          sessionStorage.removeItem("batata top-coupon")
        } catch {}
        appToast.error(errorMsg)
      }
    } catch {
      setCouponError("Erro ao validar cupom.")
    } finally {
      setValidandoCupom(false)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode("")
    setCouponError("")
    if (setCartCoupon) setCartCoupon(null)
    try {
      sessionStorage.removeItem("batata top-coupon")
      localStorage.removeItem("batata top-coupon")
      localStorage.removeItem("batata_applied_coupon")
      localStorage.removeItem("batata_pending_coupon")
    } catch {}
  }

  // Sincroniza cupom vindo do banner da Home ou alterado/removido na sacola (StepItens -> CouponModal)
  useEffect(() => {
    let pendingCode: string | null = null
    if (cartCoupon?.code) {
      pendingCode = cartCoupon.code
    } else {
      try {
        const raw = sessionStorage.getItem("batata top-coupon")
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.code) pendingCode = parsed.code
        }
      } catch {}
    }

    if (!pendingCode || !pendingCode.trim()) {
      if (appliedCoupon) {
        setAppliedCoupon(null)
        setCouponCode("")
        setCouponError("")
      }
      return
    }

    const cleanCode = pendingCode.trim()
    if (!appliedCoupon || String(appliedCoupon.code || "").toUpperCase() !== cleanCode.toUpperCase()) {
      handleApplyCoupon(cleanCode)
    }
  }, [cartCoupon, user])

  // Adição rápida pelo carrossel "Aproveite e peça também"
  const handleAddQuickItem = (product: any) => {
    addItem({
      id: String(product.id),
      name: product.name || product.nome,
      price: Number(product.price || product.preco || 0),
      image: product.image || product.image_url || product.imagem || "/ui/placeholder.jpg",
      quantity: 1,
      category: product.category || product.categoria || "batata",
      adicionais: [],
    })
  }

  // ─── Esvaziamento e Remoção de Itens da Sacola ────────────────────────────
  const handleEmptyCart = useCallback(() => {
    clearCart()
    setAppliedCoupon(null)
    setCouponCode("")
    try {
      localStorage.removeItem("batata top-cart")
      localStorage.removeItem("batata top-coupon")
      localStorage.removeItem("batata_applied_coupon")
      localStorage.removeItem("batata_pending_coupon")
      sessionStorage.removeItem("batata top-coupon")
      sessionStorage.removeItem("batata_applied_coupon")
      sessionStorage.removeItem("batata_pending_coupon")
    } catch {}

    router.push("/")
    appToast.info("Sacola esvaziada", "Sua sacola foi esvaziada. Escolha novos produtos!")
  }, [clearCart, router])

  const handleRemoveItem = useCallback(
    (id: string) => {
      if (items.length <= 1) {
        handleEmptyCart()
        return
      }
      removeItem(id)
    },
    [items.length, handleEmptyCart, removeItem]
  )

  const handleUpdateQuantity = useCallback(
    (id: string, quantity: number) => {
      if (quantity <= 0) {
        if (items.length <= 1) {
          handleEmptyCart()
          return
        }
        removeItem(id)
        return
      }
      updateQuantity(id, quantity)
    },
    [items.length, handleEmptyCart, removeItem, updateQuantity]
  )

  // ─── Validações por Etapa ──────────────────────────────────────────────────
  const validateStep1 = (): boolean => {
    if (items.length === 0 || subtotal <= 0) {
      setErrorMessage("Sua sacola está vazia. Adicione itens antes de continuar.")
      return false
    }
    // Trava de Pedido Mínimo de R$ 20,00 (apenas para entrega)
    if (deliveryType === "delivery" && subtotal < MIN_ORDER_VALUE) {
      setShowMinOrderSheet(true)
      return false
    }
    setErrorMessage(null)
    return true
  }

  const validateStep2 = (): boolean => {
    if (deliveryType === "delivery" && subtotal < MIN_ORDER_VALUE) {
      setShowMinOrderSheet(true)
      return false
    }
    if (!nome.trim() || nome.trim().length < 3) {
      setErrorMessage("Por favor, digite seu nome completo para identificação.")
      return false
    }
    if (!telefone.trim() || !isValidPhone(telefone)) {
      setErrorMessage("Informe um número de WhatsApp válido com DDD (ex: 14 99999-9999).")
      return false
    }

    if (deliveryType === "delivery") {
      if (useNewAddress) {
        if (enderecoError) {
          setErrorMessage(enderecoError)
          return false
        }
        if (!rua.trim() || !numero.trim() || !bairro.trim()) {
          setErrorMessage("Preencha Rua, Número e Bairro do seu endereço de entrega.")
          return false
        }
      } else {
        const found = addresses.find((a) => a.id === selectedAddressId)
        if (!found) {
          setErrorMessage("Selecione um endereço salvo ou cadastre um novo.")
          return false
        }
      }
    }
    setErrorMessage(null)
    return true
  }

  const validateStep3 = (): boolean => {
    if (formaPagamento === "cartao_credito" || formaPagamento === "cartao_debito") {
      if (!selectedSavedCard) {
        setErrorMessage("Selecione ou adicione um cartão para realizar o pagamento.")
        return false
      }
      const cleanCvv = savedCardCvv.trim()
      if (cleanCvv.length < 3) {
        setErrorMessage("Informe o CVV do cartão salvo (3 ou 4 dígitos).")
        return false
      }
      if (!isValidCpf(cardCpf)) {
        setErrorMessage("Informe um CPF válido do titular do cartão.")
        return false
      }
    }
    if (!precisaTalheres) {
      setErrorMessage("Por favor, informe se você precisa de colher descartável.")
      return false
    }

    if (formaPagamento === "dinheiro" && troco) {
      const numericTroco = Number(troco.replace(",", "."))
      if (isNaN(numericTroco) || numericTroco < finalTotal) {
        setErrorMessage(
          `O valor para troco deve ser maior ou igual a R$ ${finalTotal.toFixed(2).replace(".", ",")}.`
        )
        return false
      }
    }

    setErrorMessage(null)
    return true
  }

  // ─── Navegação entre Etapas ────────────────────────────────────────────────
  const handleNextStep = () => {
    if (step === "itens") {
      if (validateStep1()) {
        setStep("entrega")
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    } else if (step === "entrega") {
      if (validateStep2()) {
        setStep("pagamento")
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    } else if (step === "pagamento") {
      handleFinalizarPedido()
    }
  }

  const handlePrevStep = () => {
    if (step === "pagamento") {
      setStep("entrega")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else if (step === "entrega") {
      setStep("itens")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      router.push("/cardapio")
    }
  }

  // ─── Finalização do Pedido (Supabase RPC create_order & Mercado Pago Pix) ───
  const persistUserPhone = () => {
    if (!user?.id || !telefone.trim()) return
    const cleanDigits = telefone.replace(/\D/g, "").replace(/^55/, "")
    const phoneToSave = cleanDigits || telefone.trim()
    if (!phoneToSave || phoneToSave === savedProfilePhoneRef.current) return
    savedProfilePhoneRef.current = phoneToSave
    const sb = getSupabaseBrowserClient()
    sb.from("profiles")
      .upsert({ id: user.id, phone: phoneToSave }, { onConflict: "id" })
      .then(
        ({ error }: any) => {
          if (error) console.warn("[Checkout] Falha ao atualizar telefone em profiles:", error)
        },
        (err: any) => console.warn("[Checkout] Erro profiles.upsert:", err)
      )
    sb.auth.updateUser({ data: { phone: phoneToSave } }).catch(() => {})
  }

  const handleFinalizarPedido = async () => {
    if (!isStoreOpen) {
      const msg = ERROR_MESSAGES.store_is_closed
      setErrorMessage(msg)
      appToast.error("Loja fechada", msg)
      return
    }
    if (deliveryType === "delivery" && subtotal < MIN_ORDER_VALUE) {
      setShowMinOrderSheet(true)
      return
    }
    if (!validateStep1() || !validateStep2() || !validateStep3()) return
    if (isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      let enderecoFormatado = "Retirada no Local"
      let bairroFormatado = ""
      let complementoFormatado = ""
      const selectedAddrObj =
        deliveryType === "delivery" && !useNewAddress
          ? addresses.find((a) => a.id === selectedAddressId) || null
          : null

      if (deliveryType === "delivery") {
        if (useNewAddress) {
          enderecoFormatado = `${rua}, ${numero}${complemento ? " - " + complemento : ""} - ${bairro}, Iacanga/SP`
          bairroFormatado = bairro
          complementoFormatado = complemento
        } else if (selectedAddrObj) {
          enderecoFormatado = `${selectedAddrObj.street}, ${selectedAddrObj.number}${selectedAddrObj.complement ? " - " + selectedAddrObj.complement : ""} - ${selectedAddrObj.neighborhood}, ${selectedAddrObj.city || "Iacanga"}/${selectedAddrObj.state || "SP"}`
          bairroFormatado = selectedAddrObj.neighborhood
          complementoFormatado = selectedAddrObj.complement || ""
        }
      }

      // Cupom pendente (subtotal_itens < mínimo) ou promoção ativa é ignorado: pedido segue sem desconto.
      const couponResolution = isPromoActive
        ? { couponCode: null, discount: 0 }
        : resolveCouponForCheckout(appliedCoupon, subtotal, items)

      const effectiveTotalBeforeMp = Math.max(0, subtotal - (couponResolution.discount || 0)) + currentDeliveryFee
      const isZeroTotalOrder = effectiveTotalBeforeMp <= 0 && subtotal > 0

      const isOnlineCard = !isZeroTotalOrder && (formaPagamento === "cartao_credito" || formaPagamento === "cartao_debito")
      const isOnlinePix = !isZeroTotalOrder && formaPagamento === "pix"
      const isPaymentOnline = isOnlinePix || isOnlineCard
      const mappedPaymentMethod = isZeroTotalOrder
        ? "dinheiro"
        : formaPagamento === "pix"
        ? "pix"
        : formaPagamento === "dinheiro"
        ? "dinheiro"
        : "cartao"

      const normalizedDeliveryType = deliveryType === "pickup" ? "retirada" : "delivery"

      const orderPayload = {
        customerName: nome.trim(),
        customerPhone: telefone.trim(),
        customerAddress: enderecoFormatado,
        customerNeighborhood: bairroFormatado,
        customerComplement: complementoFormatado,
        paymentMethod: mappedPaymentMethod,
        paymentOnline: isPaymentOnline,
        couponCode: couponResolution.couponCode,
        wantsCutlery: precisaTalheres === "sim",
        notes: `${observacoes ? `${observacoes}\n` : ""}Precisa de colher: ${precisaTalheres === "sim" ? "SIM" : "NÃO"}${formaPagamento === "dinheiro" && troco ? `\nTroco para: R$ ${troco}` : ""}`,
        deliveryType: normalizedDeliveryType,
        metadata: {
          source: "site",
          cep:
            deliveryType === "delivery"
              ? useNewAddress
                ? cep.trim() || null
                : selectedAddrObj?.cep || null
              : null,
          delivery_lat:
            deliveryType === "delivery"
              ? useNewAddress
                ? newAddressCoords.lat
                : selectedAddrObj?.latitude ?? null
              : null,
          delivery_lng:
            deliveryType === "delivery"
              ? useNewAddress
                ? newAddressCoords.lng
                : selectedAddrObj?.longitude ?? null
              : null,
          troco: formaPagamento === "dinheiro" && troco ? troco : null,
          deliveryFee: currentDeliveryFee,
          card_type:
            formaPagamento === "cartao_credito" || formaPagamento === "cartao_credito_entrega"
              ? "credit"
              : formaPagamento === "cartao_debito" || formaPagamento === "cartao_debito_entrega"
              ? "debit"
              : undefined,
          ...(isOnlineCard
            ? {
                installments: formaPagamento === "cartao_credito" ? installments : 1,
                saved_card_id: selectedSavedCard?.id,
                card_last_four: selectedSavedCard?.last_four,
              }
            : {}),
        },
        items: items.map((item) => ({
          product_id: item.id.slice(0, 36),
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.observacoes || null,
          adicionais: (item.adicionais || []).map((a) => ({
            id: a.id,
            name: a.name,
            price: Number(a.price || 0),
            quantity: Number(a.quantity || 1),
          })),
          pastaType: item.pastaType || null,
        })),
      }

      // Validação antecipada do cupom antes de enviar ao backend
      if (couponResolution.couponCode) {
        const couponCheck = await couponsManager.validateCoupon(couponResolution.couponCode, user?.id)
        if (!couponCheck.valid) {
          const msg = couponCheck.message || "O cupom selecionado atingiu o limite de usos ou não é mais válido."
          setCouponError(msg)
          setAppliedCoupon(null)
          if (setCartCoupon) setCartCoupon(null)
          try {
            sessionStorage.removeItem("batata top-coupon")
          } catch {}
          appToast.error("Cupom inválido", msg)
          setIsSubmitting(false)
          return
        }
      }

      // Reutiliza o pedido pendente em caso de nova tentativa de pagamento online
      let orderId = pendingOrderIdRef.current
      let authoritativeOrderTotal = pendingOrderTotalRef.current ?? baseTotal
      if (!orderId) {
        const createdOrder = await ordersManager.createOrder(orderPayload)
        if (!createdOrder?.id) {
          throw new Error("Não foi possível gerar seu pedido. Tente novamente.")
        }
        orderId = createdOrder.id
        if (Number.isFinite(Number(createdOrder.total)) && Number(createdOrder.total) > 0) {
          authoritativeOrderTotal = Number(createdOrder.total)
        }
        if (isPaymentOnline) {
          pendingOrderIdRef.current = orderId
          pendingOrderTotalRef.current = authoritativeOrderTotal
        }

        // Persiste o endereço preenchido para próximos pedidos
        if (deliveryType === "delivery" && useNewAddress && rua && numero) {
          if (user) {
            addressesManager
              .addAddress({
                user_id: user.id,
                street: rua.trim(),
                number: numero.trim(),
                complement: complemento.trim(),
                neighborhood: bairro.trim(),
                city: "Iacanga",
                state: "SP",
                cep: cep.trim() || "17180-000",
                is_default: addresses.length === 0,
                latitude: newAddressCoords?.lat ?? null,
                longitude: newAddressCoords?.lng ?? null,
              })
              .then((saved) => {
                if (saved) {
                  window.dispatchEvent(new Event("address-changed"))
                }
              })
              .catch(() => {})
          } else {
            try {
              localStorage.setItem("batata_top_guest_address", JSON.stringify({
                id: "guest-default",
                user_id: "guest",
                street: rua.trim(),
                number: numero.trim(),
                complement: complemento.trim(),
                neighborhood: bairro.trim(),
                city: "Iacanga",
                state: "SP",
                cep: cep.trim() || "17180-000",
                is_default: true,
              }))
            } catch {}
          }
        }
      }

      // Se for Cartão de Crédito ou Débito Online
      if (isOnlineCard) {
        let cardRes: Response | null = null
        let cardData: any = {}
        try {
          const tokenResult = await tokenizeSavedCardCvv({
            cardId: selectedSavedCard.mp_card_id,
            securityCode: savedCardCvv.trim(),
          })

          if (!tokenResult.success || !tokenResult.token) {
            const msg =
              tokenResult.error || "Não foi possível validar o código de segurança do cartão."
            setErrorMessage(msg)
            appToast.error("Atenção", msg)
            setIsSubmitting(false)
            return
          }

          const supabase = getSupabaseBrowserClient()
          const { data: sessionRes } = await supabase.auth.getSession()
          const token = sessionRes?.session?.access_token

          if (!token) {
            const msg = "Sessão expirada. Faça login novamente para concluir o pagamento."
            setErrorMessage(msg)
            appToast.error("Atenção", msg)
            setIsSubmitting(false)
            return
          }

          cardRes = await fetch("/api/mercadopago/card-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              orderId,
              token: tokenResult.token,
              savedCardId: selectedSavedCard.id,
              paymentMethodId: selectedSavedCard.payment_method_id,
              docNumber: cardCpf.replace(/\D/g, ""),
              installments: formaPagamento === "cartao_credito" ? installments : 1,
              installmentsBaseAmount: authoritativeOrderTotal,
            }),
          })

          cardData = await cardRes.json().catch(() => ({}))
        } finally {
          setSavedCardCvv("")
        }

        if (
          cardData?.code === "installments_amount_mismatch" ||
          cardData?.error === "installments_amount_mismatch" ||
          String(cardData?.error || "").includes("installments_amount_mismatch")
        ) {
          loadInstallments(authoritativeOrderTotal)
          const msg =
            "O valor total do pedido foi atualizado. Revise as parcelas e confirme o pagamento novamente."
          setErrorMessage(msg)
          appToast.error("Valor atualizado", msg)
          setIsSubmitting(false)
          return
        }

        if (cardData?.action === "held_underpaid" || cardData?.code === "held_underpaid") {
          persistUserPhone()
          pendingOrderIdRef.current = null
          pendingOrderTotalRef.current = null
          clearCart()
          appToast.info("Pagamento em análise", "Pagamento em análise — acompanhe no pedido")
          router.replace(`/pedidos/${orderId}`)
          return
        }
        if (
          !cardRes ||
          !cardRes.ok ||
          !cardData.success ||
          cardData.status === "rejected" ||
          (cardData.status !== "approved" && cardData.status !== "in_process")
        ) {
          if (
            cardRes?.status === 429 ||
            cardData?.code === "order_status_not_payable" ||
            cardData?.error === "order_status_not_payable" ||
            cardData?.code === "cc_rejected_max_attempts" ||
            cardData?.statusDetail === "cc_rejected_max_attempts"
          ) {
            pendingOrderIdRef.current = null
            pendingOrderTotalRef.current = null
          }
          const rejectMsg =
            cardData.status === "rejected"
              ? getCardRejectionMessage(cardData.statusDetail)
              : cardData.error || "Pagamento não aprovado. Verifique os dados do cartão."
          setErrorMessage(rejectMsg)
          appToast.error("Pedido recusado", rejectMsg)
          setIsSubmitting(false)
          return
        }

        if (cardData.status === "in_process") {
          appToast.info(
            "Pagamento em análise",
            "Seu pagamento está sendo analisado pelo Mercado Pago. Você pode acompanhar o status pelo pedido."
          )
        }

        if (cardData.status === "approved") {
          trackPurchase({
            orderId: String(orderId),
            value: Number(authoritativeOrderTotal) || 0,
            contentIds: items.map((i) => String(i.id)),
            numItems: totalItemCount,
          })
        }
        persistUserPhone()
        pendingOrderIdRef.current = null
        pendingOrderTotalRef.current = null
        clearCart()
        router.replace(`/pedidos/${orderId}`)
        return
      }

      // Se for PIX, aciona a rota interna do Mercado Pago para gerar a chave e QR Code imediatamente
      if (isOnlinePix) {
        const supabase = getSupabaseBrowserClient()
        const { data: sessionRes } = await supabase.auth.getSession()
        const token = sessionRes?.session?.access_token

        if (!token) {
          const msg = "Sessão expirada. Faça login novamente para gerar o QR Code Pix."
          setErrorMessage(msg)
          appToast.error("Atenção", msg)
          setIsSubmitting(false)
          return
        }

        const pixRes = await fetch("/api/mercadopago/pix", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId }),
        })
        const pixData = await pixRes.json().catch(() => null)
        if (!pixRes.ok || !pixData?.success) {
          if (
            pixData?.code === "order_status_not_payable" ||
            pixData?.code === "order_not_found"
          ) {
            pendingOrderIdRef.current = null
            pendingOrderTotalRef.current = null
          }
          const msg =
            pixData?.error || "Não foi possível gerar o QR Code Pix no momento. Tente novamente."
          setErrorMessage(msg)
          appToast.error("Falha ao gerar Pix", msg)
          setIsSubmitting(false)
          return
        }
      } else {
        trackPurchase({
          orderId: String(orderId),
          value: Number(authoritativeOrderTotal) || 0,
          contentIds: items.map((i) => String(i.id)),
          numItems: totalItemCount,
        })
        // Dispara notificação push para os administradores
        getSupabaseBrowserClient()
          .auth.getSession()
          .then((sessionRes: any) => {
            const token = sessionRes?.data?.session?.access_token
            if (token && orderId) {
              fetch("/api/notify-new-order", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ orderId }),
              }).catch(() => {})
            }
          })
          .catch(() => {})
      }

      // Limpa a sacola e redireciona direto para a tela de acompanhamento/pagamento
      persistUserPhone()
      pendingOrderIdRef.current = null
      pendingOrderTotalRef.current = null
      clearCart()
      router.replace(`/pedidos/${orderId}`)
    } catch (err: any) {
      console.error("[Checkout] Erro ao finalizar:", err)
      const rawMsg = err?.message || ""
      const mappedMsg =
        ERROR_MESSAGES[rawMsg] ||
        rawMsg ||
        "Ocorreu um erro ao processar seu pedido. Por favor, tente novamente."
      setErrorMessage(mappedMsg)
      appToast.error("Erro no pedido", mappedMsg)
      setIsSubmitting(false)
    }
  }

  // ─── Carregamento Inicial (Skeleton) ───────────────────────────────────────
  if (authLoading || isLoadingData) {
    return <CheckoutSkeleton />
  }

  // ─── Sacola Vazia (Copiado do App) ──────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F4EF]">
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="relative w-[200px] h-[200px] mb-4">
            <Image
              src="/assets/pedidos.png"
              alt="Sua sacola está vazia"
              width={200}
              height={200}
              className="w-full h-full object-contain mx-auto"
              priority
            />
          </div>
          <h2 className="text-[18px] font-bold text-[#1F1B16] mb-2">Sua sacola está vazia</h2>
          <p className="text-[14px] text-[#6B6157] text-center leading-5 mb-6 max-w-xs">
            Que tal adicionar algumas deliciosas batatas recheadas para começar?
          </p>
          <Link href="/cardapio">
            <button className="bg-[#E3A008] hover:bg-[#B5860A] active:scale-[0.98] text-white font-bold text-[15px] px-6 py-3 rounded-lg shadow-sm transition-all cursor-pointer">
              Ver Cardápio
            </button>
          </Link>
        </main>
      </div>
    )
  }

  const activeAddr = addresses.find((a) => a.id === selectedAddressId)
  const newAddrStr = useNewAddress
    ? `${rua}, ${numero}${complemento ? " - " + complemento : ""} - ${bairro}`
    : ""

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EF] text-[#1F1B16]">
      {/* 1. Stepper e Cabeçalho do Checkout */}
      <CartHeader
        step={step}
        onBack={handlePrevStep}
        onClear={handleEmptyCart}
        canClear={items.length > 0}
      />

      {/* 2. Conteúdo Centralizado Mobile-First */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-5">
        {/* Banner de Erro Global se houver */}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs sm:text-sm font-bold text-red-600 animate-in fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Etapa 1: Sacola de Itens */}
        {step === "itens" && (
          <StepItens
            items={items}
            subtotal={subtotal}
            deliveryFee={currentDeliveryFee}
            discountAmount={discountAmount}
            finalTotal={finalTotal}
            appliedCoupon={appliedCoupon}
            couponCode={couponCode}
            couponError={couponError}
            validandoCupom={validandoCupom}
            deliveryType={deliveryType}
            isStoreOpen={isStoreOpen}
            recommendedProducts={recommendedProducts}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onEditItem={(item, index) => setEditingCartItem({ item, index })}
            onSetCouponCode={setCouponCode}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
            onAddQuickItem={handleAddQuickItem}
          />
        )}

        {/* Etapa 2: Entrega e Identificação */}
        {step === "entrega" && (
          <StepEntrega
            deliveryType={deliveryType}
            setDeliveryType={setDeliveryType}
            isDeliveryEnabled={isDeliveryEnabled}
            deliveryFee={currentDeliveryFee}
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            setSelectedAddressId={setSelectedAddressId}
            useNewAddress={useNewAddress}
            setUseNewAddress={setUseNewAddress}
            rua={rua}
            setRua={setRua}
            numero={numero}
            setNumero={setNumero}
            complemento={complemento}
            setComplemento={setComplemento}
            bairro={bairro}
            setBairro={setBairro}
            cep={cep}
            setCep={setCep}
            handleCepChange={handleCepChange}
            buscandoCep={buscandoCep}
            enderecoError={enderecoError}
            setEnderecoError={setEnderecoError}
            setNewAddressCoords={setNewAddressCoords}
            nome={nome}
            setNome={setNome}
            telefone={telefone}
            handleTelefoneChange={handleTelefoneChange}
            onOpenAddressModal={() => setIsAddressModalOpen(true)}
          />
        )}

        {/* Etapa 3: Pagamento e Finalização */}
        {step === "pagamento" && (
          <StepPagamento
            formaPagamento={formaPagamento}
            selectedSavedCard={selectedSavedCard}
            setSelectedSavedCard={setSelectedSavedCard}
            savedCardCvv={savedCardCvv}
            setSavedCardCvv={setSavedCardCvv}
            cardCpf={cardCpf}
            setCardCpf={setCardCpf}
            installments={installments}
            setInstallments={setInstallments}
            installmentOptions={installmentOptions}
            loadingInstallments={loadingInstallments}
            baseTotal={baseTotal}
            savedCards={savedCards}
            addCard={addCard}
            savingCard={savingCard}
            onAddCardSuccess={async () => {
              const list = await loadCards()
              if (list && list.length > 0) {
                setSelectedSavedCard(list[0])
                setFormaPagamento(
                  list[0].card_type === "cartão de débito" ? "cartao_debito" : "cartao_credito"
                )
              }
            }}
            setFormaPagamento={setFormaPagamento}
            troco={troco}
            setTroco={setTroco}
            precisaTalheres={precisaTalheres}
            setPrecisaTalheres={setPrecisaTalheres}
            observacoes={observacoes}
            setObservacoes={setObservacoes}
            items={items}
            deliveryType={deliveryType}
            activeAddress={activeAddr}
            newAddressFormatted={newAddrStr}
            subtotal={subtotal}
            deliveryFee={currentDeliveryFee}
            discountAmount={discountAmount}
            finalTotal={finalTotal}
            appliedCoupon={appliedCoupon}
          />
        )}
      </main>

      {/* 3. Barra Inferior Fixa de Ação */}
      <CartFooter
        step={step}
        total={finalTotal}
        itemCount={totalItemCount}
        deliveryType={deliveryType}
        deliveryFee={currentDeliveryFee}
        isSubmitting={isSubmitting}
        onContinue={handleNextStep}
      />

      {/* 4. Trava de Pedido Mínimo */}
      <MinOrderSheet
        isOpen={showMinOrderSheet}
        onClose={() => setShowMinOrderSheet(false)}
        currentSubtotal={subtotal}
        minOrderValue={MIN_ORDER_VALUE}
        onChoosePickup={() => {
          setShowMinOrderSheet(false)
          setDeliveryType("pickup")
          setErrorMessage(null)
          setStep("entrega")
          window.scrollTo({ top: 0, behavior: "smooth" })
        }}
      />

      {/* 4.5. Modal de Edição de Item da Sacola */}
      {editingCartItem && (
        <AddToCartDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingCartItem(null)
          }}
          editMode={true}
          product={{
            id: editingCartItem.item.id.replace(/-\d{13}$/, ""),
            name: editingCartItem.item.name,
            price: editingCartItem.item.price,
            image: editingCartItem.item.image,
            description: "",
            category: editingCartItem.item.category,
          }}
          initialQuantity={editingCartItem.item.quantity}
          initialObservacoes={editingCartItem.item.observacoes}
          initialPastaType={editingCartItem.item.pastaType}
          initialAdicionais={editingCartItem.item.adicionais}
          onSaveEdit={(updated) => {
            updateItem(editingCartItem.item.id, updated)
            setEditingCartItem(null)
          }}
        />
      )}

      {/* 5. Modal de Seleção de Endereço no Mapa */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onAddressSelect={async (addr) => {
          setEnderecoError("")
          setRua(addr.street)
          setNumero(addr.number || "S/N")
          setComplemento(addr.complement || "")
          setBairro(addr.neighborhood)
          if (addr.cep) {
            setCep(addr.cep)
          }
          setNewAddressCoords({
            lat: addr.latitude ?? null,
            lng: addr.longitude ?? null,
          })
          setIsAddressModalOpen(false)

          if (user) {
            try {
              const fresh = await addressesManager.getUserAddresses(user.id)
              setAddresses(fresh)
              const matched =
                fresh.find((a) => a.id === addr.id) ||
                fresh.find(
                  (a) =>
                    a.street === addr.street &&
                    a.number === addr.number &&
                    a.neighborhood === addr.neighborhood
                ) ||
                fresh.find((a) => a.is_default) ||
                fresh[0]
              if (matched) {
                setSelectedAddressId(matched.id)
                setUseNewAddress(false)
              } else {
                setUseNewAddress(true)
              }
            } catch {
              setUseNewAddress(true)
            }
          } else {
            setUseNewAddress(true)
          }
        }}
      />
    </div>
  )
}
