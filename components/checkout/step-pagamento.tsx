"use client"

import { useState } from "react"
import {
  CreditCard,
  Utensils,
  CheckCircle2,
  FileText,
  Bike,
  Home,
  ShieldCheck,
  ChevronRight,
  X,
} from "lucide-react"
import { CartItem } from "@/lib/cart-context"
import { Address } from "@/lib/addresses-manager"
import { Coupon } from "@/lib/cupons-manager"
import { PaymentCard } from "@/components/checkout/payment-card"
import { PaymentModal } from "@/components/checkout/payment-modal"
import { CardWizardModal } from "@/components/payment/card-wizard-modal"
import { isValidCpf, formatCpf } from "@/lib/mercado-pago-client"

interface StepPagamentoProps {
  formaPagamento:
    | "pix"
    | "cartao_credito"
    | "cartao_debito"
    | "cartao_entrega"
    | "cartao_credito_entrega"
    | "cartao_debito_entrega"
    | "dinheiro"
  setFormaPagamento: (v: any) => void
  selectedSavedCard: any | null
  setSelectedSavedCard: (c: any) => void
  savedCardCvv: string
  setSavedCardCvv: (v: string) => void
  cardCpf: string
  setCardCpf: (v: string) => void
  installments: number
  setInstallments: (n: number) => void
  savedCards: any[]
  addCard: (params: any) => Promise<any>
  savingCard: boolean
  onAddCardSuccess?: () => Promise<void> | void
  troco: string
  setTroco: (v: string) => void
  precisaTalheres: "sim" | "nao" | ""
  setPrecisaTalheres: (v: "sim" | "nao") => void
  observacoes: string
  setObservacoes: (v: string) => void
  items: CartItem[]
  deliveryType: "delivery" | "pickup"
  activeAddress?: Address | null
  newAddressFormatted?: string
  subtotal: number
  deliveryFee: number
  discountAmount: number
  finalTotal: number
  appliedCoupon: Coupon | null
}

export function StepPagamento({
  formaPagamento,
  setFormaPagamento,
  selectedSavedCard,
  setSelectedSavedCard,
  savedCardCvv,
  setSavedCardCvv,
  cardCpf,
  setCardCpf,
  installments,
  setInstallments,
  savedCards = [],
  addCard,
  savingCard,
  onAddCardSuccess,
  troco,
  setTroco,
  precisaTalheres,
  setPrecisaTalheres,
  observacoes,
  setObservacoes,
  items,
  deliveryType,
  activeAddress,
  newAddressFormatted,
  subtotal,
  deliveryFee,
  discountAmount,
  finalTotal,
  appliedCoupon,
}: StepPagamentoProps) {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isTypeSelectionOpen, setIsTypeSelectionOpen] = useState(false)
  const [wizardCardType, setWizardCardType] = useState<
    "cartão de crédito" | "cartão de débito"
  >("cartão de crédito")
  const [isCardWizardOpen, setIsCardWizardOpen] = useState(false)
  const [isInstallmentsOpen, setIsInstallmentsOpen] = useState(false)

  const handleSelectWizardType = (type: "cartão de crédito" | "cartão de débito") => {
    setWizardCardType(type)
    setIsTypeSelectionOpen(false)
    setIsCardWizardOpen(true)
  }

  const getAddressDisplay = () => {
    if (deliveryType === "pickup") {
      return "Retirada na Casa: Rua Carlos Roberto Crepaldi, 120 - Jd Alvorada"
    }
    if (newAddressFormatted) return newAddressFormatted
    if (activeAddress) {
      return `${activeAddress.street}, ${activeAddress.number} - ${activeAddress.neighborhood}`
    }
    return "Endereço em Iacanga - SP"
  }

  return (
    <div className="space-y-6 pb-28">
      {/* 1. Escolha do Método de Pagamento */}
      <div className="bg-white rounded-3xl p-5 border border-[#ECE7E0] shadow-xs space-y-4">
        <PaymentCard
          paymentMethod={formaPagamento}
          selectedSavedCard={selectedSavedCard}
          total={finalTotal}
          installments={installments}
          onOpenPaymentSelector={() => setIsPaymentModalOpen(true)}
          onOpenInstallments={() => setIsInstallmentsOpen(true)}
        />

        {/* Se dinheiro, pergunta sobre o troco */}
        {formaPagamento === "dinheiro" && (
          <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/60 space-y-2 animate-in fade-in">
            <label className="text-xs font-bold text-[#1F1B16] block">
              Precisa de troco para quanto? (Deixe em branco se não precisar)
            </label>
            <input
              type="text"
              placeholder="Ex: 50,00"
              value={troco}
              onChange={(e) => setTroco(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[#ECE7E0] bg-white text-sm font-bold text-[#1F1B16] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
            />
          </div>
        )}

        {/* Se cartão de crédito ou débito online */}
        {(formaPagamento === "cartao_credito" || formaPagamento === "cartao_debito") && (
          <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/60 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-black text-[#1F1B16]">
              <ShieldCheck className="w-4 h-4 text-[#E3A008]" />
              <span>Dados de segurança do cartão</span>
            </div>

            {selectedSavedCard ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-[#1F1B16] block mb-1">
                    CVV do cartão salvo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="123"
                    value={savedCardCvv}
                    onChange={(e) => setSavedCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-32 h-11 px-3.5 rounded-xl border border-[#ECE7E0] bg-white text-sm font-bold text-[#1F1B16] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                  />
                  <p className="text-[11px] text-[#6B6157] mt-1">
                    Código de 3 ou 4 dígitos impresso no verso do cartão.
                  </p>
                </div>

                {!isValidCpf(cardCpf) && (
                  <div>
                    <label className="text-xs font-bold text-[#1F1B16] block mb-1">
                      CPF do titular <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="000.000.000-00"
                      value={cardCpf}
                      onChange={(e) => setCardCpf(formatCpf(e.target.value))}
                      className="w-full h-11 px-3.5 rounded-xl border border-[#ECE7E0] bg-white text-sm font-bold text-[#1F1B16] focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
                    />
                    <p className="text-[11px] text-[#6B6157] mt-1">
                      Exigido pela operadora para autorização antifraude.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#6B6157]">
                  Nenhum cartão selecionado. Escolha um cartão salvo ou cadastre um novo.
                </p>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-4 py-2 bg-[#E3A008] text-white rounded-xl text-xs font-bold hover:bg-[#C1440E] transition-colors"
                >
                  Selecionar ou cadastrar cartão
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Pergunta Obrigatória: Colher / Talheres Descartáveis */}
      <div className="bg-white rounded-3xl p-5 border border-[#ECE7E0] shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Utensils className="w-4 h-4 text-[#E3A008]" />
          <h3 className="text-sm font-black text-[#1F1B16]">
            Precisa de colher descartável? <span className="text-red-500">*</span>
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setPrecisaTalheres("sim")}
            className={`h-12 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${
              precisaTalheres === "sim"
                ? "border-[#E3A008] bg-amber-50 text-[#1F1B16] font-black ring-1 ring-[#E3A008]"
                : "border-[#ECE7E0] bg-[#F7F5F0] text-[#6B6157] hover:bg-gray-100"
            }`}
          >
            <span>Sim, enviar</span>
          </button>

          <button
            onClick={() => setPrecisaTalheres("nao")}
            className={`h-12 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition-all cursor-pointer ${
              precisaTalheres === "nao"
                ? "border-[#E3A008] bg-amber-50 text-[#1F1B16] font-black ring-1 ring-[#E3A008]"
                : "border-[#ECE7E0] bg-[#F7F5F0] text-[#6B6157] hover:bg-gray-100"
            }`}
          >
            <span>Não preciso</span>
          </button>
        </div>
      </div>

      {/* 3. Observações Opcionais */}
      <div className="bg-white rounded-3xl p-5 border border-[#ECE7E0] shadow-xs space-y-3">
        <h3 className="text-sm font-black text-[#1F1B16] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#E3A008]" />
          Observações para a cozinha ou entregador
        </h3>
        <textarea
          placeholder="Ex: Tirar cebola, campainha não funciona, deixar na portaria..."
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          className="w-full p-3.5 rounded-xl border border-[#ECE7E0] bg-[#F7F5F0] text-sm text-[#1F1B16] placeholder:text-[#9C9188] focus:outline-none focus:ring-2 focus:ring-[#E3A008] resize-none"
        />
      </div>

      {/* 4. Revisão Final Consolidada */}
      <div className="bg-white rounded-3xl p-5 border border-[#ECE7E0] shadow-xs space-y-4">
        <h3 className="text-sm font-black text-[#1F1B16] uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Revisão do Pedido
        </h3>

        {/* Resumo de Entrega */}
        <div className="p-3 bg-[#F7F5F0] rounded-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#ECE7E0] flex items-center justify-center text-[#E3A008] shrink-0">
            {deliveryType === "delivery" ? <Bike className="w-4 h-4" /> : <Home className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-[#8C827A] uppercase block">
              {deliveryType === "delivery" ? "Entrega Delivery" : "Retirada na Casa"}
            </span>
            <p className="text-xs font-bold text-[#1F1B16] truncate">
              {getAddressDisplay()}
            </p>
          </div>
        </div>

        {/* Resumo de Itens */}
        <div className="space-y-1.5 text-xs text-[#6B6157] max-h-40 overflow-y-auto">
          {items.map((i) => (
            <div key={i.id} className="flex justify-between items-center py-1 border-b border-[#F3F0EB] last:border-none">
              <span className="font-bold text-[#1F1B16]">
                {i.quantity}x {i.name}
              </span>
              <span>
                R$ {((i.price + (i.adicionais || []).reduce((s, a) => s + a.price * a.quantity, 0)) * i.quantity).toFixed(2).replace(".", ",")}
              </span>
            </div>
          ))}
        </div>

        {/* Totais Finais */}
        <div className="pt-2 border-t border-[#F3F0EB] space-y-1.5 text-xs">
          <div className="flex justify-between text-[#6B6157]">
            <span>Subtotal</span>
            <span className="font-bold text-[#1F1B16]">R$ {subtotal.toFixed(2).replace(".", ",")}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Cupom {appliedCoupon?.code}</span>
              <span>- R$ {discountAmount.toFixed(2).replace(".", ",")}</span>
            </div>
          )}
          <div className="flex justify-between text-[#6B6157]">
            <span>Taxa de Entrega</span>
            <span className="font-bold text-[#1F1B16]">
              {deliveryType === "pickup" ? (
                <span className="text-emerald-700">Grátis</span>
              ) : deliveryFee > 0 ? (
                `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <span className="line-through text-stone-400 text-xs font-normal">R$ 5,00</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-xs">
                    Grátis
                  </span>
                </span>
              )}
            </span>
          </div>
          <div className="pt-2 border-t border-[#F3F0EB] flex justify-between items-baseline text-sm">
            <span className="font-black text-[#1F1B16]">Total Final</span>
            <span className="font-black text-xl text-[#1F1B16]">
              R$ {finalTotal.toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>
      </div>

      {/* Modal seletor de pagamento */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        currentMethod={formaPagamento}
        selectedCard={selectedSavedCard}
        savedCards={savedCards}
        onClose={() => setIsPaymentModalOpen(false)}
        onSelectPayment={(method, card) => {
          setFormaPagamento(method)
          if (card && card.id) {
            setSelectedSavedCard(card)
          }
        }}
        onAddNewCard={() => {
          setIsPaymentModalOpen(false)
          setIsTypeSelectionOpen(true)
        }}
      />

      {/* Modal minimalista para Escolha do Tipo de Cartão (Crédito / Débito) */}
      {isTypeSelectionOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="fixed inset-0 bg-black/45 transition-opacity"
            onClick={() => setIsTypeSelectionOpen(false)}
          />
          <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#18181B]">
                Escolha uma opção de pagamento
              </h3>
              <button
                type="button"
                onClick={() => setIsTypeSelectionOpen(false)}
                className="p-1 rounded-full text-[#71717A] hover:bg-neutral-100 cursor-pointer transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleSelectWizardType("cartão de crédito")}
                className="w-full flex items-center justify-between py-3.5 px-3 rounded-xl hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-[#18181B]" />
                  <span className="text-sm font-semibold text-[#18181B]">
                    Crédito
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#71717A]" />
              </button>

              <div className="border-t border-[#F4F4F5] my-1" />

              <button
                type="button"
                onClick={() => handleSelectWizardType("cartão de débito")}
                className="w-full flex items-center justify-between py-3.5 px-3 rounded-xl hover:bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-[#18181B]" />
                  <span className="text-sm font-semibold text-[#18181B]">
                    Débito
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#71717A]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Wizard de novo cartão */}
      <CardWizardModal
        isOpen={isCardWizardOpen}
        cardType={wizardCardType}
        existingCardsCount={savedCards?.length || 0}
        addCard={addCard}
        savingCard={savingCard}
        onClose={() => setIsCardWizardOpen(false)}
        onSaved={async () => {
          setIsCardWizardOpen(false)
          if (onAddCardSuccess) {
            await onAddCardSuccess()
          }
        }}
      />

      {/* Modal seletor de parcelas */}
      {isInstallmentsOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsInstallmentsOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-t-[28px] sm:rounded-3xl p-5 shadow-2xl z-10 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h4 className="text-sm font-black text-[#1F1B16]">Opções de Parcelamento</h4>
              <button
                type="button"
                onClick={() => setIsInstallmentsOpen(false)}
                className="text-xs font-bold text-[#6B6157] hover:text-[#1F1B16] p-1"
              >
                Fechar
              </button>
            </div>
            <div className="py-2 space-y-1.5 max-h-64 overflow-y-auto">
              {[1, 2, 3, 4, 5, 6].map((num) => {
                const installmentVal = (finalTotal / num).toFixed(2).replace(".", ",")
                const isSelected = installments === num
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setInstallments(num)
                      setIsInstallmentsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      isSelected
                        ? "border-[#E3A008] bg-amber-50 text-[#1F1B16] ring-1 ring-[#E3A008]"
                        : "border-[#ECE7E0] hover:bg-gray-50 text-[#6B6157]"
                    }`}
                  >
                    <span>
                      {num}x de R$ {installmentVal} sem juros
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-[#E3A008] bg-[#E3A008]" : "border-gray-300"
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
