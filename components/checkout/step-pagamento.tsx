"use client"

import {
  QrCode,
  CreditCard,
  Banknote,
  Utensils,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  Bike,
  Store,
} from "lucide-react"
import { CartItem } from "@/lib/cart-context"
import { Address } from "@/lib/addresses-manager"
import { Coupon } from "@/lib/cupons-manager"

interface StepPagamentoProps {
  formaPagamento: "pix" | "cartao_entrega" | "dinheiro"
  setFormaPagamento: (method: "pix" | "cartao_entrega" | "dinheiro") => void
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
  const paymentMethods = [
    {
      id: "pix" as const,
      name: "Pix",
      desc: "QR Code e Copia e Cola gerados na hora",
      badge: "Aprovação Imediata",
      icon: QrCode,
    },
    {
      id: "cartao_entrega" as const,
      name: "Cartão na Entrega",
      desc: "Maquininha levada pelo entregador (Débito ou Crédito)",
      badge: null,
      icon: CreditCard,
    },
    {
      id: "dinheiro" as const,
      name: "Dinheiro na Entrega",
      desc: "Pagamento em espécie ao receber o pedido",
      badge: null,
      icon: Banknote,
    },
  ]

  const getAddressDisplay = () => {
    if (deliveryType === "pickup") {
      return "Retirada no Balcão: Rua Carlos Roberto Crepaldi, 120 - Jd Alvorada"
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
        <h3 className="text-sm font-black text-[#1F1B16] flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#E3A008]" />
          Como deseja pagar?
        </h3>

        <div className="space-y-2.5">
          {paymentMethods.map((method) => {
            const Icon = method.icon
            const isSelected = formaPagamento === method.id

            return (
              <div
                key={method.id}
                onClick={() => setFormaPagamento(method.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#E3A008] bg-amber-50/40 ring-1 ring-[#E3A008]"
                    : "border-[#ECE7E0] bg-[#F7F5F0] hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? "bg-[#E3A008] text-white"
                          : "bg-white text-[#6B6157] border border-[#ECE7E0]"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#1F1B16]">
                          {method.name}
                        </span>
                        {method.badge && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md">
                            {method.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6B6157] mt-0.5">{method.desc}</p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? "border-[#E3A008] bg-[#E3A008]"
                        : "border-[#D1C9BE] bg-white"
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                {/* Se dinheiro, pergunta sobre o troco */}
                {isSelected && method.id === "dinheiro" && (
                  <div className="mt-4 pt-3 border-t border-amber-200/60 space-y-2 animate-in fade-in">
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
              </div>
            )
          })}
        </div>
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
            {deliveryType === "delivery" ? <Bike className="w-4 h-4" /> : <Store className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-[#8C827A] uppercase block">
              {deliveryType === "delivery" ? "Entrega Delivery" : "Retirada na Loja"}
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
              {deliveryType === "pickup" ? "Grátis" : `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`}
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
    </div>
  )
}
