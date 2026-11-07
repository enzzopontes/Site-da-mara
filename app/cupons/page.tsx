"use client"

import React, { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { ChevronLeft, XCircle } from "lucide-react"
import { appToast } from "@/lib/app-toast"
import { useCart } from "@/lib/cart-context"
import { useCoupons } from "@/hooks/use-coupons"
import { CouponCard } from "@/components/coupons/coupon-card"
import { FreeCouponCard } from "@/components/coupons/free-coupon-card"
import { SelectorCircle } from "@/components/coupons/selector-circle"
import { CuponsSkeleton } from "@/components/coupons/cupons-skeleton"

function CuponsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get("from")
  const { getTotalPrice, coupon: selectedCoupon, setCoupon } = useCart()

  const currentTotal = getTotalPrice()

  const {
    coupons,
    freeCoupons,
    loading,
    validateCoupon,
    getCouponMissingAmount,
  } = useCoupons(currentTotal)

  const [code, setCode] = useState("")
  const [applying, setApplying] = useState(false)
  const [rejectCoupon, setRejectCoupon] = useState(false)

  const handleReturn = () => {
    if (from === "cart" || from === "carrinho" || from === "checkout") {
      router.push("/checkout")
    } else {
      router.back()
    }
  }

  const handleApply = async () => {
    if (!code.trim() || applying) return
    setApplying(true)
    const result = await validateCoupon(code)
    setApplying(false)

    if (!result.valid) {
      appToast.error("Cupom indisponível", result.reason || "Limite de usos atingido ou inválido.")
      return
    }

    setCoupon(result.coupon)
    setRejectCoupon(false)
    appToast.success("Cupom aplicado com sucesso!", `Cupom ${result.coupon.code} ativado para este pedido.`)
    setTimeout(() => {
      handleReturn()
    }, 300)
  }

  const handleSelect = (coupon: any) => {
    if (coupon.isExhausted) {
      appToast.error("Cupom indisponível", coupon.exhaustedReason || "Este cupom atingiu o limite de usos.")
      return
    }

    setRejectCoupon(false)
    const isSame = selectedCoupon?.id === coupon.id
    const nextCoupon = isSame ? null : coupon
    setCoupon(nextCoupon)
    if (nextCoupon) {
      appToast.success("Cupom selecionado!", `Cupom ${coupon.code} ativado para este pedido.`)
      // Retorna automaticamente para o carrinho/checkout após seleção
      setTimeout(() => {
        handleReturn()
      }, 300)
    }
  }

  const handleToggleReject = () => {
    const next = !rejectCoupon
    setRejectCoupon(next)
    if (next) {
      setCoupon(null)
      appToast.info("Nenhum cupom selecionado")
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#1F1B16] flex flex-col">
      {/* Header Fiel ao App */}
      <header className="relative flex items-center justify-between px-4 py-3.5 border-b border-[#ECE7E0] max-w-xl w-full mx-auto bg-white">
        <button
          type="button"
          onClick={handleReturn}
          className="p-1 -ml-1 text-[#E3A008] hover:opacity-80 active:scale-95 transition-all z-10 cursor-pointer"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
        </button>

        <h1 className="absolute inset-0 flex items-center justify-center text-sm font-black tracking-widest text-[#1F1B16] uppercase pointer-events-none">
          CUPONS
        </h1>

        <div className="w-6" />
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-4 pb-12">
        {/* Campo de Código com ticketsolo.png */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 border border-[#ECE7E0] rounded-2xl px-3 py-1 bg-white focus-within:border-[#E3A008] transition-colors">
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <Image
                src="/assets/ticketsolo.png"
                alt="Ticket"
                width={38}
                height={38}
                className="object-contain"
              />
            </div>

            <input
              type="text"
              placeholder="Código de cupom"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply()
              }}
              className="flex-1 text-sm text-[#1F1B16] placeholder-[#9C9188] bg-transparent outline-none uppercase font-medium"
            />

            {code.length > 0 && (
              <button
                type="button"
                onClick={() => setCode("")}
                className="p-1 text-[#9C9188] hover:text-[#1F1B16]"
                aria-label="Limpar código"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleApply}
            disabled={!code.trim() || applying}
            className={`text-sm font-black px-2 py-2 transition-colors ${
              code.trim() && !applying
                ? "text-[#E3A008] hover:opacity-80 cursor-pointer"
                : "text-[#9C9188] cursor-not-allowed"
            }`}
          >
            {applying ? "..." : "Aplicar"}
          </button>
        </div>

        {/* Card de Cupons Grátis */}
        <FreeCouponCard
          count={freeCoupons.length}
          onPress={() =>
            appToast.info(`Você tem ${freeCoupons.length} cupom(ns) grátis disponível(is).`)
          }
        />

        {/* Linha "Não quero cupom" */}
        <div
          onClick={handleToggleReject}
          className="flex items-center justify-between border border-[#ECE7E0] rounded-xl px-3 py-2 mb-4 bg-white cursor-pointer active:scale-[0.99] transition-transform select-none"
        >
          <div className="flex items-center gap-2">
            <div className="w-11 h-9 flex items-center justify-center flex-shrink-0">
              <Image
                src="/assets/cuponpretobranco.png"
                alt="Sem cupom"
                width={44}
                height={44}
                className="object-contain"
              />
            </div>
            <span className="text-sm font-medium text-[#6B6157]">Não quero cupom</span>
          </div>

          <div className="p-1">
            <SelectorCircle selected={rejectCoupon} size={27} />
          </div>
        </div>

        {/* Lista de Cupons */}
        {loading ? (
          <CuponsSkeleton count={3} />
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <p className="text-sm font-bold text-[#6B6157]">
              Nenhum cupom disponível no momento.
            </p>
            <p className="text-xs text-[#9C9188]">
              Fique atento às nossas promoções e notificações!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                currentTotal={currentTotal}
                missingAmount={getCouponMissingAmount(coupon)}
                isSelected={!rejectCoupon && selectedCoupon?.id === coupon.id}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function CuponsPage() {
  return (
    <Suspense fallback={<CuponsSkeleton count={4} />}>
      <CuponsContent />
    </Suspense>
  )
}
