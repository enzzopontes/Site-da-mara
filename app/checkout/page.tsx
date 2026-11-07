"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ShoppingBag, ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import { appToast } from "@/lib/app-toast"

import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { couponsManager, type Coupon } from "@/lib/cupons-manager"
import { storeStatusManager, type StoreStatus } from "@/lib/store-status-manager"
import { addressesManager, type Address } from "@/lib/addresses-manager"
import { ordersManager } from "@/lib/orders-manager"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { usePaymentCards } from "@/hooks/use-payment-cards"
import { tokenizeSavedCardCvv, isValidCpf } from "@/lib/mercado-pago-client"

import { CartHeader, type CheckoutStep } from "@/components/checkout/cart-header"
import { CartFooter } from "@/components/checkout/cart-footer"
import { MinOrderSheet } from "@/components/checkout/min-order-sheet"
import { StepItens } from "@/components/checkout/step-itens"
import { StepEntrega } from "@/components/checkout/step-entrega"
import { StepPagamento } from "@/components/checkout/step-pagamento"
import { CheckoutSkeleton } from "@/components/skeletons/checkout-skeleton"

const MIN_ORDER_VALUE = 20.0

export default function CheckoutPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { items, getTotalPrice, updateQuantity, removeItem, addItem, clearCart, coupon: cartCoupon, setCoupon: setCartCoupon } = useCart()

  // Controle de etapas do fluxo (Padrão iFood: itens -> entrega -> pagamento)
  const [step, setStep] = useState<CheckoutStep>("itens")

  // Status da loja e regras de entrega
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null)
  const [isStoreOpen, setIsStoreOpen] = useState(true)
  const [isDeliveryEnabled, setIsDeliveryEnabled] = useState(true)
  const [deliveryFee, setDeliveryFee] = useState(5.0)

  // Endereços do cliente
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>("")
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery")

  // Dados de contato
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")

  // Formulário de novo endereço
  const [rua, setRua] = useState("")
  const [numero, setNumero] = useState("")
  const [complemento, setComplemento] = useState("")
  const [bairro, setBairro] = useState("")
  const [cep, setCep] = useState("")
  const [enderecoError, setEnderecoError] = useState("")
  const [buscandoCep, setBuscandoCep] = useState(false)

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

  // Estados de submissão e carregamento
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const pendingOrderIdRef = useRef<string | null>(null)

  useEffect(() => {
    pendingOrderIdRef.current = null
  }, [items, formaPagamento, appliedCoupon, deliveryType])

  // ─── 1. Carregamento inicial de status da loja, usuário e produtos ─────────────
  useEffect(() => {
    async function init() {
      setIsLoadingData(true)
      try {
        // Status da Loja
        const status = await storeStatusManager.getStatus()
        setStoreStatus(status)
        setIsStoreOpen(status.isOpen ?? true)
        const delivEnabled = status.isDeliveryEnabled ?? true
        setIsDeliveryEnabled(delivEnabled)
        if (!delivEnabled) {
          setDeliveryType("pickup")
        }
        if (status.isDeliveryFeeEnabled) {
          setDeliveryFee(Number(status.deliveryFee) || 5.0)
        } else {
          setDeliveryFee(0)
        }

        const supabase = getSupabaseBrowserClient()

        // Dados do Usuário e Endereços
        if (user) {
          setNome(user.user_metadata?.full_name || "")
          const rawPhone = user.user_metadata?.phone || ""
          if (rawPhone) handleTelefoneChange(rawPhone)

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
          const supabase = getSupabaseBrowserClient()
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("cpf")
              .eq("id", user.id)
              .maybeSingle()
            if (profile?.cpf) {
              setCardCpf(profile.cpf)
            }
          } catch {
            // Silêncio
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
            image: p.image_url || p.image || "/placeholder.jpg",
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
  }, [user])

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/checkout")
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
  const discountAmount = appliedCoupon
    ? couponsManager.calculateDiscount(subtotal, appliedCoupon)
    : 0
  const currentDeliveryFee = deliveryType === "pickup" ? 0 : deliveryFee
  const finalTotal = Math.max(0, subtotal - discountAmount + currentDeliveryFee)
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  // ─── Formatação de Máscaras ────────────────────────────────────────────────
  const handleTelefoneChange = (value: string) => {
    const nums = value.replace(/\D/g, "")
    if (nums.length <= 11) {
      let formatted = ""
      if (nums.length > 0) formatted = `(${nums.substring(0, 2)}`
      if (nums.length > 2) formatted += `) ${nums.substring(2, 7)}`
      if (nums.length > 7) formatted += `-${nums.substring(7, 11)}`
      setTelefone(formatted)
    }
  }

  const handleCepChange = async (value: string) => {
    const formatted = value
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .substring(0, 9)
    setCep(formatted)
    const digits = formatted.replace(/\D/g, "")
    if (digits.length === 8) {
      setBuscandoCep(true)
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setRua(data.logradouro || "")
          setBairro(data.bairro || "")
          if ((data.localidade || "").toLowerCase().trim() !== "iacanga") {
            setEnderecoError("No momento entregamos exclusivamente em Iacanga - SP.")
          } else {
            setEnderecoError("")
          }
        } else {
          setEnderecoError("CEP não encontrado. Digite o endereço manualmente.")
        }
      } catch {
        // Silêncio em erro de rede ViaCEP
      } finally {
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
      const res = await couponsManager.validateCoupon(code, user?.id, subtotal)
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

  // Auto-aplica cupom vindo do banner da Home ou da sacola (sessão única)
  useEffect(() => {
    if (appliedCoupon) return

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

    if (pendingCode && pendingCode.trim()) {
      handleApplyCoupon(pendingCode.trim())
    }
  }, [cartCoupon, user])

  // Adição rápida pelo carrossel "Aproveite e peça também"
  const handleAddQuickItem = (product: any) => {
    addItem({
      id: String(product.id),
      name: product.name || product.nome,
      price: Number(product.price || product.preco || 0),
      image: product.image || product.image_url || product.imagem || "/placeholder.jpg",
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
    if (items.length === 0) {
      setErrorMessage("Sua sacola está vazia. Adicione itens antes de continuar.")
      return false
    }
    // Trava de Pedido Mínimo de R$ 20,00
    if (subtotal < MIN_ORDER_VALUE) {
      setShowMinOrderSheet(true)
      return false
    }
    setErrorMessage(null)
    return true
  }

  const validateStep2 = (): boolean => {
    if (!nome.trim() || nome.trim().length < 3) {
      setErrorMessage("Por favor, digite seu nome completo para identificação.")
      return false
    }
    const phoneDigits = telefone.replace(/\D/g, "")
    if (phoneDigits.length < 10) {
      setErrorMessage("Informe um número de telefone com DDD válido para contato.")
      return false
    }

    if (deliveryType === "delivery") {
      if (enderecoError) {
        setErrorMessage(enderecoError)
        return false
      }
      if (useNewAddress) {
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
  const handleFinalizarPedido = async () => {
    if (!validateStep1() || !validateStep2() || !validateStep3()) return
    if (isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      let enderecoFormatado = "Retirada no Local"
      let bairroFormatado = ""
      let complementoFormatado = ""

      if (deliveryType === "delivery") {
        if (useNewAddress) {
          enderecoFormatado = `${rua}, ${numero}${complemento ? " - " + complemento : ""} - ${bairro}, Iacanga/SP`
          bairroFormatado = bairro
          complementoFormatado = complemento
        } else {
          const addr = addresses.find((a) => a.id === selectedAddressId)
          if (addr) {
            enderecoFormatado = `${addr.street}, ${addr.number}${addr.complement ? " - " + addr.complement : ""} - ${addr.neighborhood}, ${addr.city || "Iacanga"}/${addr.state || "SP"}`
            bairroFormatado = addr.neighborhood
            complementoFormatado = addr.complement || ""
          }
        }
      }

      const isOnlineCard = formaPagamento === "cartao_credito" || formaPagamento === "cartao_debito"
      const isOnlinePix = formaPagamento === "pix"
      const isPaymentOnline = isOnlinePix || isOnlineCard
      const mappedPaymentMethod =
        formaPagamento === "pix"
          ? "pix"
          : formaPagamento === "dinheiro"
          ? "dinheiro"
          : "cartao"

      const orderPayload = {
        customerName: nome.trim(),
        customerPhone: telefone.trim(),
        customerAddress: enderecoFormatado,
        customerNeighborhood: bairroFormatado,
        customerComplement: complementoFormatado,
        paymentMethod: mappedPaymentMethod,
        paymentOnline: isPaymentOnline,
        couponCode: appliedCoupon?.code || null,
        wantsCutlery: precisaTalheres === "sim",
        notes: `${observacoes ? `${observacoes}\n` : ""}Precisa de colher: ${precisaTalheres === "sim" ? "SIM" : "NÃO"}${formaPagamento === "dinheiro" && troco ? `\nTroco para: R$ ${troco}` : ""}`,
        deliveryType,
        metadata: {
          source: "site",
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
          quantity: item.quantity,
          adicionais: item.adicionais || [],
          pastaType: item.pastaType || null,
        })),
      }

      // Validação antecipada do cupom antes de enviar ao backend
      if (appliedCoupon?.code) {
        const couponCheck = await couponsManager.validateCoupon(appliedCoupon.code, user?.id, subtotal)
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
      if (!orderId) {
        const createdOrder = await ordersManager.createOrder(orderPayload)
        if (!createdOrder?.id) {
          throw new Error("Não foi possível gerar seu pedido. Tente novamente.")
        }
        orderId = createdOrder.id
        if (isPaymentOnline) {
          pendingOrderIdRef.current = orderId
        }

        // Persiste o endereço preenchido para próximos pedidos
        if (deliveryType === "delivery" && useNewAddress && rua && numero) {
          if (user) {
            addressesManager.addAddress({
              user_id: user.id,
              street: rua.trim(),
              number: numero.trim(),
              complement: complemento.trim(),
              neighborhood: bairro.trim(),
              city: "Iacanga",
              state: "SP",
              cep: cep.trim() || "17150-000",
              is_default: addresses.length === 0,
            }).catch(() => {})
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
                cep: cep.trim() || "17150-000",
                is_default: true,
              }))
            } catch {}
          }
        }
      }

      // Se for Cartão de Crédito ou Débito Online
      if (isOnlineCard) {
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

        const cardRes = await fetch("/api/mercadopago/card-payment", {
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
            installmentsBaseAmount: finalTotal,
          }),
        })

        const cardData = await cardRes.json().catch(() => ({}))
        if (
          !cardRes.ok ||
          !cardData.success ||
          cardData.status === "rejected" ||
          (cardData.status !== "approved" && cardData.status !== "in_process")
        ) {
          let rejectMsg =
            cardData.error || "Pagamento não aprovado. Verifique os dados do cartão."
          if (cardData.status === "rejected") {
            switch (cardData.statusDetail) {
              case "cc_rejected_insufficient_amount":
                rejectMsg = "Saldo insuficiente"
                break
              case "cc_rejected_bad_filled_security_code":
                rejectMsg = "Código de segurança (CVV) inválido"
                break
              case "cc_rejected_bad_filled_date":
                rejectMsg = "Cartão vencido ou data inválida"
                break
              case "cc_rejected_call_for_authorize":
                rejectMsg = "Autorize a transação junto ao seu banco"
                break
              default:
                rejectMsg = "Pagamento recusado pelo banco emissor"
            }
          }
          setErrorMessage(rejectMsg)
          appToast.error("Pedido recusado", rejectMsg)
          setIsSubmitting(false)
          return
        }

        fetch("/api/bark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "notify", orderId }),
        }).catch(() => {})

        fetch("/api/notify-new-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId }),
        }).catch(() => {})

        pendingOrderIdRef.current = null
        clearCart()
        router.push(`/pedidos/${orderId}`)
        return
      }

      // Se for PIX, aciona a rota interna do Mercado Pago para gerar a chave e QR Code imediatamente
      if (isOnlinePix) {
        try {
          const supabase = getSupabaseBrowserClient()
          const { data: sessionRes } = await supabase.auth.getSession()
          const token = sessionRes?.session?.access_token

          if (token) {
            await fetch("/api/mercadopago/pix", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ orderId }),
            })
          }
        } catch (pixErr) {
          console.warn("[Checkout] Geração de Pix em segundo plano falhou:", pixErr)
        }
      } else {
        // Disparo incondicional do alarme crítico Bark (iOS) para novos pedidos pendentes
        fetch("/api/bark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "notify", orderId }),
        }).catch(() => {})

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
      pendingOrderIdRef.current = null
      clearCart()
      router.push(`/pedidos/${orderId}`)
    } catch (err: any) {
      console.error("[Checkout] Erro ao finalizar:", err)
      setErrorMessage(
        err.message || "Ocorreu um erro ao processar seu pedido. Por favor, tente novamente."
      )
      setIsSubmitting(false)
    }
  }

  // ─── Carregamento Inicial (Skeleton) ───────────────────────────────────────
  if (authLoading || isLoadingData) {
    return <CheckoutSkeleton />
  }

  // ─── Sacola Vazia ──────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F4EF]">
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="relative w-44 h-44 mb-4">
            <Image
              src="/logo.png"
              alt="Sacola Vazia"
              width={160}
              height={160}
              className="w-full h-full object-contain mx-auto opacity-80"
            />
          </div>
          <h2 className="text-2xl font-black text-[#1F1B16] mb-2">Sua sacola está vazia</h2>
          <p className="text-sm text-[#6B6157] font-medium mb-6 leading-relaxed">
            Que tal escolher deliciosas batatas recheadas e acompanhamentos direto do cardápio?
          </p>
          <Link href="/cardapio" className="w-full">
            <button className="w-full h-14 bg-[#E3A008] hover:bg-[#C1440E] active:scale-[0.98] text-white font-black text-base rounded-2xl shadow-md transition-all cursor-pointer">
              Ver Cardápio Completo
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
            recommendedProducts={recommendedProducts}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
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
            nome={nome}
            setNome={setNome}
            telefone={telefone}
            handleTelefoneChange={handleTelefoneChange}
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
      />
    </div>
  )
}
