"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { HeaderWrapper } from "@/components/header-wrapper"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import {
  ShoppingBag,
  MapPin,
  CreditCard,
  AlertCircle,
  Plus,
  Store,
  Ticket,
  Check,
  X,
  User,
  Loader2,
  Utensils,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Bike,
  QrCode,
  Banknote,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"
import { couponsManager, type Coupon } from "@/lib/cupons-manager"
import { storeStatusManager, type StoreStatus } from "@/lib/store-status-manager"
import { addressesManager, type Address } from "@/lib/addresses-manager"
import { ordersManager } from "@/lib/orders-manager"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

type CheckoutStep = "itens" | "entrega" | "pagamento"

export default function CheckoutPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { items, getTotalPrice, updateQuantity, removeItem, clearCart } = useCart()

  // Controle de etapas do fluxo (Padrão iFood)
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
  const [couponSuccess, setCouponSuccess] = useState(false)
  const [validandoCupom, setValidandoCupom] = useState(false)

  // Estados de submissão e carregamento
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // ─── Carregamento inicial de status da loja e usuário ────────────────────────
  useEffect(() => {
    async function init() {
      setIsLoadingData(true)
      try {
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
      } catch (err) {
        console.error("[Checkout] Erro ao carregar dados:", err)
      } finally {
        setIsLoadingData(false)
      }
    }
    init()
  }, [user])

  // Redireciona se não estiver logado
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/checkout")
    }
  }, [user, loading, router])

  // ─── Cálculos financeiros ────────────────────────────────────────────────────
  const subtotal = getTotalPrice()

  const discountAmount = appliedCoupon
    ? couponsManager.calculateDiscount(subtotal, appliedCoupon)
    : 0

  const currentDeliveryFee = deliveryType === "pickup" ? 0 : deliveryFee
  const finalTotal = Math.max(0, subtotal - discountAmount + currentDeliveryFee)

  // ─── Formatação e máscaras ───────────────────────────────────────────────────
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
    const formatted = value.replace(/\D/g, "").replace(/(\d{5})(\d)/, "$1-$2").substring(0, 9)
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
        }
      } catch {
        // Silêncio em erro de rede ViaCEP
      } finally {
        setBuscandoCep(false)
      }
    }
  }

  // ─── Ações de Cupom ──────────────────────────────────────────────────────────
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return
    setValidandoCupom(true)
    setCouponError("")
    try {
      const res = await couponsManager.validateCoupon(couponCode, user?.id)
      if (res.valid && res.coupon) {
        setAppliedCoupon(res.coupon)
        setCouponSuccess(true)
        setTimeout(() => setCouponSuccess(false), 3000)
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

  // ─── Validações por etapa ────────────────────────────────────────────────────
  const validateStep1 = (): boolean => {
    if (items.length === 0) {
      setErrorMessage("Sua sacola está vazia. Adicione itens antes de continuar.")
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
        setErrorMessage(`O valor para troco deve ser maior ou igual a R$ ${finalTotal.toFixed(2).replace(".", ",")}.`)
        return false
      }
    }

    setErrorMessage(null)
    return true
  }

  // ─── Navegação entre passos ──────────────────────────────────────────────────
  const handleNextStep = () => {
    if (step === "itens") {
      if (validateStep1()) setStep("entrega")
    } else if (step === "entrega") {
      if (validateStep2()) setStep("pagamento")
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handlePrevStep = () => {
    if (step === "pagamento") setStep("entrega")
    else if (step === "entrega") setStep("itens")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // ─── Finalização do Pedido (Embutido no Site, Sem WhatsApp) ───────────────────
  const handleFinalizarPedido = async () => {
    if (!validateStep1() || !validateStep2() || !validateStep3()) return
    if (isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      // 1. Monta a string de endereço
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
            enderecoFormatado = `${addr.street}, ${addr.number}${addr.complement ? " - " + addr.complement : ""} - ${addr.neighborhood}, ${addr.city}/${addr.state}`
            bairroFormatado = addr.neighborhood
            complementoFormatado = addr.complement || ""
          }
        }
      }

      // 2. Prepara os dados do pedido para a RPC
      const isOnlinePix = formaPagamento === "pix"
      const mappedPaymentMethod = formaPagamento === "pix" ? "pix" : formaPagamento === "cartao_entrega" ? "cartao" : "dinheiro"

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

      // 3. Salva o pedido atomicamente no Supabase
      const createdOrder = await ordersManager.createOrder(orderPayload)
      if (!createdOrder?.id) {
        throw new Error("Não foi possível gerar seu pedido. Tente novamente.")
      }

      // 4. Se for PIX, aciona a rota interna do Mercado Pago para gerar a chave e QR Code imediatamente
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
          console.warn("[Checkout] Geração de Pix em segundo plano falhou, tela do pedido reprocessará:", pixErr)
        }
      } else {
        // Dispara notificação push para os administradores caso seja dinheiro ou maquininha
        getSupabaseBrowserClient().auth.getSession().then((sessionRes: any) => {
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
        }).catch(() => {})
      }

      // 5. Limpa a sacola e redireciona direto para a tela de acompanhamento/pagamento
      clearCart()
      router.push(`/pedidos/${createdOrder.id}`)
    } catch (err: any) {
      console.error("[Checkout] Erro ao finalizar:", err)
      setErrorMessage(err.message || "Ocorreu um erro ao processar seu pedido. Por favor, tente novamente.")
      setIsSubmitting(false)
    }
  }

  // ─── Renderização de Carregamento ───────────────────────────────────────────
  if (loading || isLoadingData) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <HeaderWrapper variant="simple" />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
          <p className="text-sm font-bold text-gray-600">Preparando seu checkout...</p>
        </main>
        <Footer />
      </div>
    )
  }

  // ─── Sacola Vazia ────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <HeaderWrapper variant="simple" />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-amber-100 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Sua sacola está vazia</h2>
          <p className="text-sm text-gray-500 font-medium mb-6">
            Adicione batatas recheadas saborosas e acompanhamentos direto do cardápio para fazer seu pedido.
          </p>
          <Link href="/cardapio" className="w-full">
            <Button className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-black text-base rounded-2xl shadow-lg shadow-amber-200">
              Ver Cardápio Completo
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      {/* Top Header estilo App/iFood com Stepper */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-xs">
        <div className="container mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <button
            onClick={step === "itens" ? () => router.push("/cardapio") : handlePrevStep}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-gray-700"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
              Batata Top Delivery
            </span>
            <h1 className="text-base font-black text-gray-900">
              {step === "itens" ? "1. Minha Sacola" : step === "entrega" ? "2. Entrega" : "3. Pagamento"}
            </h1>
          </div>

          <div className="w-8 flex justify-end">
            <span className="text-xs font-black text-gray-400">
              {step === "itens" ? "1/3" : step === "entrega" ? "2/3" : "3/3"}
            </span>
          </div>
        </div>

        {/* Barra de Progresso visual dos passos */}
        <div className="w-full bg-gray-100 h-1">
          <div
            className="bg-amber-500 h-1 transition-all duration-300"
            style={{
              width: step === "itens" ? "33.3%" : step === "entrega" ? "66.6%" : "100%",
            }}
          />
        </div>
      </header>

      {/* Alerta de Loja Fechada */}
      {!isStoreOpen && (
        <div className="bg-red-500 text-white px-4 py-2.5 text-center text-xs font-black flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 shrink-0" />
          <span>A loja está fechada no momento. Os pedidos serão processados no próximo horário de funcionamento.</span>
        </div>
      )}

      {/* Conteúdo Principal do Checkout */}
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-5 pb-32">
        {errorMessage && (
          <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <p className="flex-1">{errorMessage}</p>
          </div>
        )}

        {/* ─── PASSO 1: ITENS DA SACOLA ────────────────────────────────────────── */}
        {step === "itens" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-500" /> Itens Adicionados ({items.length})
                </h2>
                <Link href="/cardapio" className="text-xs font-bold text-amber-600 hover:text-amber-700">
                  + Adicionar mais
                </Link>
              </div>

              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const itemAdicionaisTotal = (item.adicionais || []).reduce(
                    (s, a) => s + (a.price || 0) * (a.quantity || 1),
                    0
                  )
                  const unitPrice = (item.price || 0) + itemAdicionaisTotal
                  const itemTotal = unitPrice * (item.quantity || 1)

                  return (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-black text-gray-900 truncate">{item.name}</h3>
                        {item.pastaType && (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block mt-1">
                            Massa: {item.pastaType.toUpperCase()}
                          </span>
                        )}

                        {item.adicionais && item.adicionais.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.adicionais.map((ad, idx) => (
                              <p key={idx} className="text-xs text-gray-500 font-medium">
                                + {ad.quantity || 1}x {ad.name} (+R$ {((ad.price || 0) * (ad.quantity || 1)).toFixed(2).replace(".", ",")})
                              </p>
                            ))}
                          </div>
                        )}

                        <p className="text-xs font-bold text-gray-400 mt-1">
                          R$ {unitPrice.toFixed(2).replace(".", ",")} cada
                        </p>
                      </div>

                      {/* Controle de Quantidade */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-sm font-black text-gray-900">
                          R$ {itemTotal.toFixed(2).replace(".", ",")}
                        </span>

                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1">
                          <button
                            onClick={() => {
                              if (item.quantity <= 1) {
                                removeItem(item.id)
                              } else {
                                updateQuantity(item.id, item.quantity - 1)
                              }
                            }}
                            className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-700 active:scale-90 transition-all shadow-xs"
                            aria-label="Diminuir quantidade"
                          >
                            {item.quantity <= 1 ? (
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <span className="text-sm font-black">−</span>
                            )}
                          </button>

                          <span className="w-6 text-center text-xs font-black text-gray-900">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center text-white active:scale-90 transition-all shadow-xs"
                            aria-label="Aumentar quantidade"
                          >
                            <span className="text-sm font-black">+</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Seção de Cupom */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-amber-500" /> Cupom de Desconto
              </h3>

              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-xs font-black uppercase">Cupom {appliedCoupon.code} aplicado!</p>
                      <p className="text-[11px] font-semibold text-emerald-700">
                        Desconto de R$ {discountAmount.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors"
                    aria-label="Remover cupom"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: PRIMEIRACOMPRA"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="h-12 rounded-xl text-xs font-bold uppercase tracking-wider"
                    />
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={validandoCupom || !couponCode.trim()}
                      className="h-12 px-5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shrink-0"
                    >
                      {validandoCupom ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                    </Button>
                  </div>
                  {couponError && <p className="text-xs font-bold text-red-600">{couponError}</p>}
                </div>
              )}
            </div>

            {/* Resumo Parcial */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Subtotal dos itens</span>
                <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Desconto aplicado</span>
                  <span>- R$ {discountAmount.toFixed(2).replace(".", ",")}</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-sm font-black text-gray-900">
                <span>Total Parcial</span>
                <span className="text-base text-amber-600">
                  R$ {(subtotal - discountAmount).toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─── PASSO 2: ENTREGA OU RETIRADA ────────────────────────────────────── */}
        {step === "entrega" && (
          <div className="space-y-4">
            {/* Seletor Tipo: Delivery vs Retirada (Estilo iFood) */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => isDeliveryEnabled && setDeliveryType("delivery")}
                disabled={!isDeliveryEnabled}
                className={`p-4 rounded-3xl border-2 text-left transition-all active:scale-98 flex flex-col justify-between ${
                  deliveryType === "delivery"
                    ? "border-amber-500 bg-amber-50/40 shadow-sm"
                    : "border-gray-200 bg-white opacity-80"
                } ${!isDeliveryEnabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    deliveryType === "delivery" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    <Bike className="w-5 h-5" />
                  </div>
                  {deliveryType === "delivery" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 leading-tight">Entrega Delivery</h4>
                  <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                    {deliveryFee > 0 ? `Taxa: R$ ${deliveryFee.toFixed(2).replace(".", ",")}` : "Entrega Grátis"}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType("pickup")}
                className={`p-4 rounded-3xl border-2 text-left transition-all active:scale-98 flex flex-col justify-between ${
                  deliveryType === "pickup"
                    ? "border-amber-500 bg-amber-50/40 shadow-sm"
                    : "border-gray-200 bg-white opacity-80"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    deliveryType === "pickup" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    <Store className="w-5 h-5" />
                  </div>
                  {deliveryType === "pickup" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 leading-tight">Retirada na Loja</h4>
                  <p className="text-[11px] font-bold text-emerald-600 mt-0.5">Sem taxa (Grátis)</p>
                </div>
              </button>
            </div>

            {/* Dados do Cliente */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-3">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wide flex items-center gap-2">
                <User className="w-4 h-4 text-amber-500" /> Dados do Cliente
              </h3>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-600">Seu Nome Completo *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome e Sobrenome"
                  className="h-12 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-gray-600">Telefone / WhatsApp com DDD *</Label>
                <Input
                  value={telefone}
                  onChange={(e) => handleTelefoneChange(e.target.value)}
                  placeholder="(14) 99999-9999"
                  className="h-12 rounded-xl text-xs font-medium font-mono"
                />
              </div>
            </div>

            {/* Seção Delivery: Escolha de Endereço */}
            {deliveryType === "delivery" && (
              <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-800 uppercase tracking-wide flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-500" /> Endereço de Entrega
                  </h3>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setUseNewAddress(!useNewAddress)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700"
                    >
                      {useNewAddress ? "Usar endereço salvo" : "+ Novo endereço"}
                    </button>
                  )}
                </div>

                {/* Lista de Endereços Salvos */}
                {!useNewAddress && addresses.length > 0 && (
                  <div className="space-y-2">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                          selectedAddressId === addr.id
                            ? "border-amber-500 bg-amber-50/30"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="selected_address"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-1 text-amber-500 focus:ring-amber-400"
                        />
                        <div className="flex-1 text-xs">
                          <p className="font-black text-gray-900">
                            {addr.street}, {addr.number}
                            {addr.complement ? ` - ${addr.complement}` : ""}
                          </p>
                          <p className="text-gray-500 font-medium">
                            {addr.neighborhood} — {addr.city}/{addr.state}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Formulário Novo Endereço */}
                {(useNewAddress || addresses.length === 0) && (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-gray-600">CEP (Opcional)</Label>
                        <div className="relative">
                          <Input
                            value={cep}
                            onChange={(e) => handleCepChange(e.target.value)}
                            placeholder="17570-000"
                            className="h-11 rounded-xl text-xs font-mono"
                          />
                          {buscandoCep && (
                            <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-amber-500" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-gray-600">Bairro *</Label>
                        <Input
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                          placeholder="Bairro"
                          className="h-11 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs font-bold text-gray-600">Rua / Logradouro *</Label>
                        <Input
                          value={rua}
                          onChange={(e) => setRua(e.target.value)}
                          placeholder="Nome da rua"
                          className="h-11 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-gray-600">Número *</Label>
                        <Input
                          value={numero}
                          onChange={(e) => setNumero(e.target.value)}
                          placeholder="123"
                          className="h-11 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-gray-600">Complemento / Referência</Label>
                      <Input
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        placeholder="Apto, Casa 2, Perto do mercado..."
                        className="h-11 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Seção Retirada: Endereço da Loja */}
            {deliveryType === "pickup" && (
              <div className="bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-5 text-xs text-amber-950 space-y-2">
                <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
                  <Store className="w-5 h-5 text-amber-600" />
                  <span>Endereço para Retirada no Balcão:</span>
                </div>
                <p className="font-semibold text-gray-800">
                  Rua Carlos Roberto Crepaldi, 120 - Jardim Alvorada, Iacanga - SP
                </p>
                <p className="text-[11px] text-amber-800 font-medium">
                  Tempo estimado de preparo: <strong>{storeStatus?.waitTimeMin || 15} a {storeStatus?.waitTimeMax || 25} minutos</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── PASSO 3: FORMA DE PAGAMENTO E FINALIZAÇÃO ───────────────────────── */}
        {step === "pagamento" && (
          <div className="space-y-4">
            {/* Métodos de Pagamento (Cards Padrão iFood) */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-3">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wide flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-amber-500" /> Escolha como pagar
              </h3>

              {/* Opção 1: Pix */}
              <label
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all active:scale-98 ${
                  formaPagamento === "pix"
                    ? "border-amber-500 bg-amber-50/40 shadow-xs"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    formaPagamento === "pix" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700"
                  }`}>
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-gray-900">Pix</span>
                      <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Aprovação Imediata
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      Gere o código Copia e Cola seguro direto no site
                    </p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="forma_pagamento"
                  checked={formaPagamento === "pix"}
                  onChange={() => setFormaPagamento("pix")}
                  className="text-amber-500 focus:ring-amber-400"
                />
              </label>

              {/* Opção 2: Cartão na Entrega (Maquininha) */}
              <label
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all active:scale-98 ${
                  formaPagamento === "cartao_entrega"
                    ? "border-amber-500 bg-amber-50/40 shadow-xs"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    formaPagamento === "cartao_entrega" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700"
                  }`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-gray-900">Cartão na Entrega</span>
                    <p className="text-xs text-gray-500 font-medium">
                      O entregador leva a maquininha (Crédito, Débito ou VR)
                    </p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="forma_pagamento"
                  checked={formaPagamento === "cartao_entrega"}
                  onChange={() => setFormaPagamento("cartao_entrega")}
                  className="text-amber-500 focus:ring-amber-400"
                />
              </label>

              {/* Opção 3: Dinheiro */}
              <label
                className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all active:scale-98 ${
                  formaPagamento === "dinheiro"
                    ? "border-amber-500 bg-amber-50/40 shadow-xs"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    formaPagamento === "dinheiro" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-700"
                  }`}>
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-gray-900">Dinheiro na Entrega</span>
                    <p className="text-xs text-gray-500 font-medium">
                      Pague em dinheiro físico ao receber o pedido
                    </p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="forma_pagamento"
                  checked={formaPagamento === "dinheiro"}
                  onChange={() => setFormaPagamento("dinheiro")}
                  className="text-amber-500 focus:ring-amber-400"
                />
              </label>

              {/* Campo de Troco se Dinheiro */}
              {formaPagamento === "dinheiro" && (
                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5 animate-in fade-in">
                  <Label className="text-xs font-bold text-gray-700">Precisa de troco para quanto?</Label>
                  <Input
                    placeholder={`Ex: R$ ${(finalTotal + 20).toFixed(2).replace(".", ",")}`}
                    value={troco}
                    onChange={(e) => setTroco(e.target.value)}
                    className="h-11 rounded-xl text-xs font-mono"
                  />
                  <p className="text-[10px] text-gray-500">Deixe em branco caso tenha o valor exato.</p>
                </div>
              )}
            </div>

            {/* Talheres Descartáveis (Obrigatório Padrão iFood) */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-3">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-wide flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-500" /> Precisa de talher descartável? *
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPrecisaTalheres("sim")}
                  className={`h-12 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    precisaTalheres === "sim"
                      ? "border-amber-500 bg-amber-50 text-amber-900 shadow-xs"
                      : "border-gray-200 text-gray-700 bg-white"
                  }`}
                >
                  <Check className="w-4 h-4" /> Sim, enviar colher
                </button>
                <button
                  type="button"
                  onClick={() => setPrecisaTalheres("nao")}
                  className={`h-12 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    precisaTalheres === "nao"
                      ? "border-amber-500 bg-amber-50 text-amber-900 shadow-xs"
                      : "border-gray-200 text-gray-700 bg-white"
                  }`}
                >
                  <X className="w-4 h-4" /> Não preciso
                </button>
              </div>
            </div>

            {/* Observações do Pedido */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-2">
              <Label className="text-xs font-black text-gray-800 uppercase tracking-wide">
                Observações do Pedido (Opcional)
              </Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Tirar orégano, caprichar no queijo, campainha sem som..."
                className="rounded-2xl text-xs min-h-[70px] resize-none"
              />
            </div>

            {/* Resumo Final com Transparência Total */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 space-y-2.5 text-xs">
              <h4 className="font-black text-gray-800 uppercase tracking-wide text-xs pb-2 border-b border-gray-100">
                Resumo dos Valores
              </h4>
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Itens ({items.reduce((s, i) => s + (i.quantity || 1), 0)})</span>
                <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between text-gray-600 font-medium">
                <span>Taxa de Entrega</span>
                <span>{currentDeliveryFee > 0 ? `R$ ${currentDeliveryFee.toFixed(2).replace(".", ",")}` : "Grátis"}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Desconto Cupom ({appliedCoupon?.code})</span>
                  <span>- R$ {discountAmount.toFixed(2).replace(".", ",")}</span>
                </div>
              )}
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-base font-black text-gray-900">
                <span>Total a Pagar</span>
                <span className="text-xl text-amber-600 font-black">
                  R$ {finalTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── RODAPÉ FIXO MOBILE-FIRST (ESTILO IFOOD) ─────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 p-4 z-50 shadow-lg">
        <div className="container mx-auto max-w-2xl flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total</span>
            <span className="text-xl font-black text-gray-900">
              R$ {finalTotal.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <div className="flex-1 max-w-xs">
            {step === "itens" && (
              <Button
                onClick={handleNextStep}
                className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Continuar</span>
                <ChevronRight className="w-5 h-5" />
              </Button>
            )}

            {step === "entrega" && (
              <Button
                onClick={handleNextStep}
                className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-amber-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Ir para Pagamento</span>
                <ChevronRight className="w-5 h-5" />
              </Button>
            )}

            {step === "pagamento" && (
              <Button
                onClick={handleFinalizarPedido}
                disabled={isSubmitting}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Finalizar Pedido</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
