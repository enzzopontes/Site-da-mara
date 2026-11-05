"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ShoppingBag, ArrowLeft, Loader2, AlertCircle } from "lucide-react"

import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { couponsManager, type Coupon } from "@/lib/cupons-manager"
import { storeStatusManager, type StoreStatus } from "@/lib/store-status-manager"
import { addressesManager, type Address } from "@/lib/addresses-manager"
import { ordersManager } from "@/lib/orders-manager"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

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
  const { items, getTotalPrice, updateQuantity, removeItem, addItem, clearCart } = useCart()

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
  const [formaPagamento, setFormaPagamento] = useState<"pix" | "cartao_entrega" | "dinheiro">("pix")
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
        }

        // Busca produtos disponíveis para o carrossel "Aproveite e peça também"
        const supabase = getSupabaseBrowserClient()
        const { data: prods } = await supabase
          .from("products")
          .select("*")
          .eq("available", true)
          .limit(12)

        if (prods && prods.length > 0) {
          setRecommendedProducts(prods)
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
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setValidandoCupom(true)
    setCouponError("")
    try {
      const res = await couponsManager.validateCoupon(couponCode, user?.id)
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon)
      } else {
        setCouponError(res.message || "Cupom inválido ou expirado.")
        setAppliedCoupon(null)
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
  }

  // Adição rápida pelo carrossel "Aproveite e peça também"
  const handleAddQuickItem = (product: any) => {
    addItem({
      id: String(product.id),
      name: product.name || product.nome,
      price: Number(product.price || product.preco || 0),
      image: product.image || product.imagem || "/products/default.jpg",
      quantity: 1,
      category: product.category || product.categoria || "batata",
      adicionais: [],
    })
  }

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

      const isOnlinePix = formaPagamento === "pix"
      const mappedPaymentMethod =
        formaPagamento === "pix"
          ? "pix"
          : formaPagamento === "cartao_entrega"
          ? "cartao"
          : "dinheiro"

      const orderPayload = {
        customerName: nome.trim(),
        customerPhone: telefone.trim(),
        customerAddress: enderecoFormatado,
        customerNeighborhood: bairroFormatado,
        customerComplement: complementoFormatado,
        paymentMethod: mappedPaymentMethod,
        paymentOnline: isOnlinePix,
        couponCode: appliedCoupon?.code || null,
        wantsCutlery: precisaTalheres === "sim",
        notes: `${observacoes ? `${observacoes}\n` : ""}Precisa de colher: ${precisaTalheres === "sim" ? "SIM" : "NÃO"}${formaPagamento === "dinheiro" && troco ? `\nTroco para: R$ ${troco}` : ""}`,
        deliveryType,
        metadata: {
          source: "site",
          troco: formaPagamento === "dinheiro" && troco ? troco : null,
          deliveryFee: currentDeliveryFee,
        },
        items: items.map((item) => ({
          product_id: item.id.slice(0, 36),
          quantity: item.quantity,
          adicionais: item.adicionais || [],
          pastaType: item.pastaType || null,
        })),
      }

      // Salva o pedido atomicamente no Supabase via RPC
      const createdOrder = await ordersManager.createOrder(orderPayload)
      if (!createdOrder?.id) {
        throw new Error("Não foi possível gerar seu pedido. Tente novamente.")
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
              body: JSON.stringify({ orderId: createdOrder.id }),
            })
          }
        } catch (pixErr) {
          console.warn("[Checkout] Geração de Pix em segundo plano falhou:", pixErr)
        }
      } else {
        // Dispara notificação push para os administradores
        getSupabaseBrowserClient()
          .auth.getSession()
          .then((sessionRes: any) => {
            const token = sessionRes?.data?.session?.access_token
            if (token && createdOrder?.id) {
              fetch("/api/notify-new-order", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ orderId: createdOrder.id }),
              }).catch(() => {})
            }
          })
          .catch(() => {})
      }

      // Limpa a sacola e redireciona direto para a tela de acompanhamento/pagamento
      clearCart()
      router.push(`/pedidos/${createdOrder.id}`)
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
        onClear={clearCart}
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
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
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
