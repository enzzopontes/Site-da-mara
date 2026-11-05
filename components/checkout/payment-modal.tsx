"use client"

import React, { useState, useEffect } from "react"
import { ChevronLeft, QrCode, Banknote, CreditCard } from "lucide-react"
import { CardBrandBadge } from "@/components/payment/card-brand-badge"

export type PaymentMethod =
  | "pix"
  | "cartao_credito"
  | "cartao_debito"
  | "cartao_entrega"
  | "cartao_credito_entrega"
  | "cartao_debito_entrega"
  | "dinheiro"

export interface PaymentModalProps {
  isOpen: boolean
  currentMethod: PaymentMethod
  selectedCard: any | null
  savedCards: any[]
  onClose: () => void
  onSelectPayment: (method: PaymentMethod, card?: any) => void
  onAddNewCard: () => void
}

function CustomRadio({ selected }: { selected: boolean }) {
  return (
    <div
      className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all shrink-0 ${
        selected ? "bg-white border-2 border-[#E3A008]" : "bg-[#E5E7EB]"
      }`}
    >
      {selected && <div className="w-3 h-3 rounded-full bg-[#E3A008]" />}
    </div>
  )
}

export function PaymentModal({
  isOpen,
  currentMethod,
  selectedCard,
  savedCards = [],
  onClose,
  onSelectPayment,
  onAddNewCard,
}: PaymentModalProps) {
  const [tab, setTab] = useState<"app" | "entrega">("app")

  useEffect(() => {
    if (
      currentMethod === "dinheiro" ||
      currentMethod === "cartao_entrega" ||
      currentMethod === "cartao_credito_entrega" ||
      currentMethod === "cartao_debito_entrega"
    ) {
      setTab("entrega")
    } else {
      setTab("app")
    }
  }, [currentMethod, isOpen])

  if (!isOpen) return null

  const handleSelect = (method: PaymentMethod, card?: any) => {
    onSelectPayment(method, card)
    onClose()
  }

  const isCardSelected = (card: any, method: "cartao_credito" | "cartao_debito") => {
    return currentMethod === method && selectedCard?.id === card?.id
  }

  const creditCards = savedCards.filter(
    (c) =>
      c.card_type === "cartao_credito" ||
      c.card_type === "cartão de crédito" ||
      c.card_type === "credit_card" ||
      !c.card_type
  )

  const debitCards = savedCards.filter(
    (c) =>
      c.card_type === "cartao_debito" ||
      c.card_type === "cartão de débito" ||
      c.card_type === "debit_card"
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg rounded-t-[24px] sm:rounded-3xl px-4 pt-3 pb-6 shadow-2xl max-h-[90vh] flex flex-col z-10 animate-in slide-in-from-bottom duration-300">
        {/* Handle bar on mobile */}
        <div className="w-[38px] h-1 bg-[#D4D4D8] rounded-full mx-auto mb-3 sm:hidden" />

        {/* Header: back button + logo centered */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-start rounded-full hover:bg-gray-100 transition-colors text-[#18181B]"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <img
            src="/assets/batatatopestendida.png"
            alt="Batata Top"
            className="w-[160px] h-[38px] object-contain mx-auto"
          />

          <div className="w-9" />
        </div>

        {/* Tabs: Pagar pelo app | Pagar na entrega */}
        <div className="flex border-b border-[#E4E4E7] mb-3">
          <button
            type="button"
            onClick={() => setTab("app")}
            className={`flex-1 py-3 text-center text-[14px] relative transition-colors ${
              tab === "app" ? "font-bold text-[#18181B]" : "font-medium text-[#71717A]"
            }`}
          >
            Pagar pelo app
            {tab === "app" && (
              <span className="absolute -bottom-[1px] left-0 right-0 h-[2.5px] bg-[#E3A008]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("entrega")}
            className={`flex-1 py-3 text-center text-[14px] relative transition-colors ${
              tab === "entrega" ? "font-bold text-[#18181B]" : "font-medium text-[#71717A]"
            }`}
          >
            Pagar na entrega
            {tab === "entrega" && (
              <span className="absolute -bottom-[1px] left-0 right-0 h-[2.5px] bg-[#E3A008]" />
            )}
          </button>
        </div>

        {/* Body content */}
        <div className="overflow-y-auto flex-1 py-2">
          {tab === "app" ? (
            <div className="space-y-3">
              {/* Cartões de crédito salvos */}
              {creditCards.map((card) => {
                const selected = isCardSelected(card, "cartao_credito")
                const cardName =
                  card.cardholder_name || card.name || card.holder_name || "Cartão"

                return (
                  <button
                    key={card.id || `credit-${card.last_four}`}
                    type="button"
                    onClick={() => handleSelect("cartao_credito", card)}
                    className={`w-full flex items-center justify-between p-3 bg-white border rounded-[14px] transition-all text-left ${
                      selected ? "border-[#18181B]" : "border-[#E4E4E7] hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <CardBrandBadge brand={card.payment_method_id || card.brand} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold text-[#18181B] truncate">
                          Crédito • {cardName}
                        </div>
                        <div className="flex items-center gap-2 mt-[3px]">
                          <span className="text-[12px] text-[#71717A] font-medium">
                            •••• {card.last_four}
                          </span>
                          <span className="bg-[#ECFDF5] text-[#059669] rounded-md px-1.5 py-0.5 text-[11px] font-semibold">
                            Parcele seu pedido
                          </span>
                        </div>
                      </div>
                    </div>
                    <CustomRadio selected={selected} />
                  </button>
                )
              })}

              {/* Cartões de débito salvos */}
              {debitCards.map((card) => {
                const selected = isCardSelected(card, "cartao_debito")
                const cardName =
                  card.cardholder_name || card.name || card.holder_name || "Cartão"

                return (
                  <button
                    key={card.id || `debit-${card.last_four}`}
                    type="button"
                    onClick={() => handleSelect("cartao_debito", card)}
                    className={`w-full flex items-center justify-between p-3 bg-white border rounded-[14px] transition-all text-left ${
                      selected ? "border-[#18181B]" : "border-[#E4E4E7] hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <CardBrandBadge brand={card.payment_method_id || card.brand} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold text-[#18181B] truncate">
                          Débito • {cardName}
                        </div>
                        <span className="text-[12px] text-[#71717A] font-medium">
                          •••• {card.last_four}
                        </span>
                      </div>
                    </div>
                    <CustomRadio selected={selected} />
                  </button>
                )
              })}

              {/* Opção Pix */}
              <button
                type="button"
                onClick={() => handleSelect("pix")}
                className={`w-full flex items-center justify-between p-3 bg-white border rounded-[14px] transition-all text-left ${
                  currentMethod === "pix"
                    ? "border-[#18181B]"
                    : "border-[#E4E4E7] hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-[26px] rounded-[4px] bg-[#F4F4F5] flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5 text-[#00B494]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-[#18181B]">Pix</div>
                    <div className="text-[12px] text-[#71717A] mt-0.5">Aprovação automática</div>
                  </div>
                </div>
                <CustomRadio selected={currentMethod === "pix"} />
              </button>

              {/* Adicionar novo cartão */}
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onAddNewCard()
                }}
                className="w-full py-3 px-4 mt-2 text-center text-[14px] font-bold text-[#E3A008] hover:opacity-80 transition-opacity"
              >
                Adicionar novo cartão
              </button>
            </div>
          ) : (
            <div>
              {/* Seção Dinheiro */}
              <div className="text-[15px] font-bold text-[#18181B] mt-3 mb-2">Dinheiro</div>
              <button
                type="button"
                onClick={() => handleSelect("dinheiro")}
                aria-label="Pagar em dinheiro na entrega"
                className="w-full flex items-center justify-between bg-white border border-[#E4E4E7] rounded-[14px] py-3.5 px-4 mb-1 transition-all text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-8 flex items-center justify-center">
                    <Banknote className="w-6 h-6 text-[#16A34A]" />
                  </div>
                  <span className="text-[14px] font-semibold text-[#18181B]">Dinheiro</span>
                </div>
                <CustomRadio selected={currentMethod === "dinheiro"} />
              </button>

              {/* Seção Crédito */}
              <div className="text-[15px] font-bold text-[#18181B] mt-3 mb-2">Crédito</div>
              <button
                type="button"
                onClick={() => handleSelect("cartao_credito_entrega")}
                aria-label="Pagar com cartão de crédito na entrega"
                className="w-full flex items-center justify-between bg-white border border-[#E4E4E7] rounded-[14px] py-3.5 px-4 mb-1 transition-all text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-8 flex items-center justify-center">
                    <CreditCard className="w-[22px] h-[22px] text-[#18181B]" />
                  </div>
                  <span className="text-[14px] font-semibold text-[#18181B]">
                    Cartão de Crédito
                  </span>
                </div>
                <CustomRadio
                  selected={
                    currentMethod === "cartao_credito_entrega" ||
                    currentMethod === "cartao_entrega"
                  }
                />
              </button>

              {/* Seção Débito */}
              <div className="text-[15px] font-bold text-[#18181B] mt-3 mb-2">Débito</div>
              <button
                type="button"
                onClick={() => handleSelect("cartao_debito_entrega")}
                aria-label="Pagar com cartão de débito na entrega"
                className="w-full flex items-center justify-between bg-white border border-[#E4E4E7] rounded-[14px] py-3.5 px-4 mb-1 transition-all text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-8 flex items-center justify-center">
                    <CreditCard className="w-[22px] h-[22px] text-[#18181B]" />
                  </div>
                  <span className="text-[14px] font-semibold text-[#18181B]">
                    Cartão de Débito
                  </span>
                </div>
                <CustomRadio selected={currentMethod === "cartao_debito_entrega"} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentModal
