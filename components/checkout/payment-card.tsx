"use client"

import React from "react"
import { ChevronRight, QrCode, Banknote } from "lucide-react"
import { CardBrandBadge } from "@/components/payment/card-brand-badge"

export type PaymentMethod =
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "cartao_entrega"
  | "cartao_credito_entrega"
  | "cartao_debito_entrega"
  | "dinheiro"

export interface PaymentCardProps {
  paymentMethod: PaymentMethod
  selectedSavedCard: any | null
  total: number
  installments: number
  onOpenPaymentSelector: () => void
  onOpenInstallments?: () => void
}

export function PaymentCard({
  paymentMethod,
  selectedSavedCard,
  total,
  installments,
  onOpenPaymentSelector,
  onOpenInstallments,
}: PaymentCardProps) {
  const isOnlineCard =
    paymentMethod === "cartao_credito" || paymentMethod === "cartao_debito"

  const isCreditCard =
    paymentMethod === "cartao_credito" ||
    (isOnlineCard &&
      (selectedSavedCard?.card_type === "cartao_credito" ||
        selectedSavedCard?.card_type === "cartão de crédito" ||
        selectedSavedCard?.card_type === "credit_card"))

  const sectionTitle =
    paymentMethod === "dinheiro" ||
    paymentMethod === "cartao_entrega" ||
    paymentMethod === "cartao_credito_entrega" ||
    paymentMethod === "cartao_debito_entrega"
      ? "Pagamento na entrega"
      : "Pagamento pelo app"

  const getLabel = () => {
    if (isOnlineCard) {
      if (selectedSavedCard) {
        const isDebit =
          selectedSavedCard.card_type === "cartão de débito" ||
          selectedSavedCard.card_type === "cartao_debito" ||
          selectedSavedCard.card_type === "debit_card" ||
          paymentMethod === "cartao_debito"
        return `${selectedSavedCard.card_type === 'cartão de débito' || isDebit ? 'Débito' : 'Crédito'} •••• ${selectedSavedCard.last_four}`
      }
      return paymentMethod === "cartao_credito" ? "Cartão de crédito" : "Cartão de débito"
    }

    if (paymentMethod === "pix") {
      return "Pix"
    }

    if (paymentMethod === "dinheiro") {
      return "Dinheiro"
    }

    if (
      paymentMethod === "cartao_credito_entrega" ||
      paymentMethod === "cartao_entrega"
    ) {
      return "Crédito na entrega"
    }

    if (paymentMethod === "cartao_debito_entrega") {
      return "Débito na entrega"
    }

    return "Selecione uma forma"
  }

  const renderLeadingIcon = () => {
    if (paymentMethod === "pix") {
      return (
        <div className="w-8 h-5 flex items-center justify-center">
          <QrCode className="w-[18px] h-[18px] text-[#1A1A1A]" />
        </div>
      )
    }

    if (paymentMethod === "dinheiro") {
      return (
        <div className="w-8 h-5 flex items-center justify-center">
          <Banknote className="w-5 h-5 text-[#1A1A1A]" />
        </div>
      )
    }

    return (
      <CardBrandBadge
        brand={isOnlineCard ? selectedSavedCard?.payment_method_id : null}
        size="sm"
      />
    )
  }

  const installmentAmount = (total / Math.max(1, installments || 1))
    .toFixed(2)
    .replace(".", ",")

  return (
    <div>
      <h3 className="text-[17px] font-semibold text-[#1A1A1A] mb-3">{sectionTitle}</h3>

      {/* Casca cinza externa */}
      <div className="bg-[#F3F3F3] border border-[#E8E8E8] rounded-[22px] px-1 pb-1">
        {/* Cabeçalho */}
        <button
          type="button"
          onClick={onOpenPaymentSelector}
          className="w-full h-[46px] px-3 flex items-center hover:opacity-70 transition-opacity"
          aria-label="Mudar forma de pagamento"
        >
          <div className="w-[78.4px] h-[30px] overflow-hidden relative">
            <img
              src="/assets/batatatopestendida.png"
              alt="Batata Top"
              className="w-[80.9px] h-[40.2px] -left-[2.5px] -top-[10.2px] max-w-none absolute select-none"
            />
          </div>
        </button>

        {/* Cartão branco interno */}
        <div className="bg-white rounded-[18px] border border-[#EBEBEB] overflow-hidden">
          {/* Linha principal */}
          <button
            type="button"
            onClick={onOpenPaymentSelector}
            className="w-full h-14 px-4 flex items-center justify-between hover:bg-gray-50/70 transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0 mr-3">
              {renderLeadingIcon()}
              <span className="text-[16px] font-normal text-[#1A1A1A] truncate">
                {getLabel()}
              </span>
            </div>
            <ChevronRight className="w-[18px] h-[18px] text-[#1A1A1A] shrink-0" />
          </button>

          {/* Linha de parcelamento para cartão de crédito */}
          {isCreditCard && (
            <>
              <div className="border-t border-[#EEEEEE]" />
              <button
                type="button"
                onClick={onOpenInstallments}
                className="w-full h-11 px-4 flex items-center justify-between text-[13px] text-[#6B6B6B] hover:bg-gray-50/70 transition-colors text-left"
              >
                <span className="truncate mr-3">
                  {installments || 1}x de R$ {installmentAmount} sem juros
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-[#6B6B6B] shrink-0" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentCard
