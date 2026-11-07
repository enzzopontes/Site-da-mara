"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Star,
  Clock,
  MapPin,
  Bike,
  Sparkles,
  ChevronRight,
  Gift,
  CheckCircle2,
  X,
  CookingPot,
} from "lucide-react"
import { useLoyalty } from "@/hooks/use-loyalty"

interface RestaurantHeaderCardProps {
  isOpen?: boolean
  waitTimeMin?: number
  waitTimeMax?: number
  isDeliveryFeeEnabled?: boolean
  deliveryFee?: number
  onOpenReviews?: () => void
}

export function RestaurantHeaderCard({
  isOpen = true,
  waitTimeMin = 15,
  waitTimeMax = 22,
  isDeliveryFeeEnabled = false,
  deliveryFee = 0,
  onOpenReviews,
}: RestaurantHeaderCardProps) {
  const {
    ordersCount,
    targetOrders,
    remainingOrders,
    hasRewardAvailable,
    isRedeeming,
    redeemReward,
    setTestCount,
  } = useLoyalty()

  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [showRewardModal, setShowRewardModal] = useState(false)

  // Porcentagem da barra de progresso (0% a 100%)
  const progressPercent = Math.min(100, Math.max(0, (ordersCount / targetOrders) * 100))

  const handleRedeemClick = () => {
    setShowRewardModal(true)
  }

  const handleConfirmRedeem = async () => {
    await redeemReward()
    setShowRewardModal(false)
  }

  return (
    <>
      {/* CARD FLUTUANTE BRANCO ESTILO IFOOD */}
      <div className="relative -mt-10 sm:-mt-14 md:-mt-16 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 shadow-md border border-[#ECE7E0] mb-4 sm:mb-6 z-10 transition-all">
        
        {/* PARTE SUPERIOR: LOGO + METADADOS + BOTÕES */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* IDENTIDADE E METADADOS (ESQUERDA) */}
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-5 min-w-0">
            {/* Logo Circular Oficial com Sombra e Borda */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-full bg-white p-1 shadow-md border-2 border-white ring-2 ring-[#E3A008]/20 flex items-center justify-center overflow-hidden">
                <img
                  src="/logo.png"
                  alt="Batata Top Logo"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
            </div>

            {/* Dados do Restaurante */}
            <div className="flex-1 min-w-0">
              {/* Linha 1: Nome + Avaliação + Super Restaurante */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-black text-[#1F1B16] tracking-tight truncate">
                  Batata Top
                </h1>

                {/* Avaliação Estrela Dourada */}
                <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm shrink-0">
                  <Star className="w-4 h-4 fill-[#FCBB00] text-[#FCBB00]" aria-hidden="true" />
                  <span className="font-bold text-[#1F1B16]">4.9</span>
                  <span className="text-[#717171] font-normal text-xs sm:text-sm">(500+ avaliações)</span>
                </div>

                {/* Selo Super Restaurante */}
                <span className="inline-flex items-center gap-1 bg-[#FEF8EC] text-[#8A6100] border border-[#FCE8C3] text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-[#E3A008]" />
                  <span>Super Restaurante</span>
                </span>
              </div>

              {/* Linha 2: Categorias */}
              <p className="text-xs sm:text-sm text-[#717171] font-medium mb-2.5">
                Batatas Recheadas • Macarrão • Bebidas
              </p>

              {/* Linha 3: Linha de Chips Informativos com Ícones */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#525252]">
                {/* Tempo de Preparo */}
                <div className="inline-flex items-center gap-1 bg-[#F9F7F2] px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold text-[#1F1B16] border border-[#EFECE6] shrink-0">
                  <Clock className="w-3.5 h-3.5 text-[#E3A008]" />
                  <span>{waitTimeMin}-{waitTimeMax} min</span>
                </div>

                {/* Taxa de Entrega */}
                <div className="inline-flex items-center gap-1 bg-[#F9F7F2] px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold border border-[#EFECE6] shrink-0">
                  <Bike className="w-3.5 h-3.5 text-[#27AE60]" />
                  {isDeliveryFeeEnabled && deliveryFee > 0 ? (
                    <span className="text-[#1F1B16]">Entrega R$ {deliveryFee.toFixed(2).replace(".", ",")}</span>
                  ) : (
                    <span className="text-[#27AE60]">Entrega Grátis</span>
                  )}
                </div>

                {/* Tag Preparo Artesanal */}
                <div className="inline-flex items-center gap-1 bg-[#F9F7F2] px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold text-[#1F1B16] border border-[#EFECE6] shrink-0">
                  <CookingPot className="w-3.5 h-3.5 text-[#E3A008]" />
                  <span>Preparo Artesanal</span>
                </div>

                {/* Localização */}
                <div className="inline-flex items-center gap-1 bg-[#F9F7F2] px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium text-[#717171] border border-[#EFECE6] shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-[#C1440E]" />
                  <span>Iacanga - SP</span>
                </div>

                {/* Status de Funcionamento */}
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-bold border shrink-0 ${
                    isOpen
                      ? "bg-[#E8F8EE] text-[#1E824C] border-[#BDE8CE]"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  <span>{isOpen ? "Aberto agora •" : "Fechado agora"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO (DIREITA) */}
          <div className="flex sm:flex-col sm:items-end justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F0EDE6]">
            {/* Botão Primário Âmbar/Laranja Quente */}
            <Link href="/cardapio" className="flex-1 sm:flex-none">
              <button
                type="button"
                className="w-full sm:w-auto h-10 sm:h-11 bg-[#E3A008] hover:bg-[#C1440E] text-white font-bold text-xs sm:text-sm px-5 rounded-xl shadow-xs hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Fazer pedido</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </Link>

            {/* Botão Secundário Outline/Ghost */}
            <button
              type="button"
              onClick={() => {
                if (onOpenReviews) onOpenReviews()
                else setShowReviewsModal(true)
              }}
              className="flex-1 sm:flex-none w-full sm:w-auto h-9 sm:h-10 bg-white hover:bg-neutral-50 text-[#525252] hover:text-[#1F1B16] font-semibold text-xs rounded-xl border border-neutral-200 hover:border-neutral-300 px-4 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Star className="w-3.5 h-3.5 text-[#FCBB00] fill-[#FCBB00]" />
              <span>Ver avaliações</span>
            </button>
          </div>
        </div>

        {/* BARRA DE FIDELIDADE INTEGRADA NO RODAPÉ DO CARD */}
        <div className="mt-4 pt-3.5 border-t border-[#F0EDE6] transition-all">
          {hasRewardAvailable ? (
            /* ESTADO 10/10: RECOMPENSA DESBLOQUEADA (IMAGEM 2) */
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-[#FEF8EC] via-[#FFF3D6] to-[#FEF8EC] p-3 sm:px-4 sm:py-2.5 rounded-xl border border-[#FCE8C3] shadow-xs animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-center sm:text-left">
                <span className="text-xl sm:text-2xl animate-bounce">🎉</span>
                <p className="text-xs sm:text-sm text-[#1F1B16] font-medium leading-tight">
                  Parabéns! Você completou <strong className="font-black text-[#1F1B16]">10 pedidos</strong> e ganhou{" "}
                  <strong className="font-black text-[#C1440E]">1 Batata Grátis!</strong> 🎉
                </p>
              </div>

              {/* Botão de Resgate Destacado */}
              <button
                type="button"
                onClick={handleRedeemClick}
                disabled={isRedeeming}
                className="w-full sm:w-auto shrink-0 bg-gradient-to-r from-[#C1440E] to-[#E3A008] hover:from-[#A83709] hover:to-[#C98A00] text-white font-bold text-xs sm:text-sm px-4 py-2 sm:py-2.5 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 animate-pulse"
              >
                <span>Resgatar Batata Grátis</span>
                <span className="text-base">🥔</span>
              </button>
            </div>
          ) : (
            /* ESTADO NORMAL: PROGRESSO DE PEDIDOS (IMAGEM 1) */
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full text-xs">
              {/* Texto de Motivação */}
              <div className="text-neutral-700 text-xs sm:text-[13px] font-medium leading-tight shrink-0">
                Faltam{" "}
                <span className="font-bold text-[#1F1B16]">
                  {remainingOrders} {remainingOrders === 1 ? "pedido" : "pedidos"}
                </span>{" "}
                para você ganhar{" "}
                <span className="font-bold text-[#C1440E]">1 Batata Grátis!</span>
              </div>

              {/* Barra que vai desde '1 Batata Grátis' até o outro lado ocupando todo o espaço */}
              <div className="flex-1 flex items-center gap-3 min-w-0 w-full">
                <div className="flex-1 h-2 bg-[#EAE7E1] rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#C1440E] via-[#E3A008] to-[#27AE60] transition-all duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                    role="progressbar"
                    aria-valuenow={ordersCount}
                    aria-valuemin={0}
                    aria-valuemax={targetOrders}
                  />
                </div>

                {/* Indicador Numérico à Direita em tom dourado */}
                <span className="text-xs sm:text-sm font-black text-[#D97706] shrink-0 font-mono tracking-tight">
                  {ordersCount}/{targetOrders}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE RESGATE DA BATATA GRÁTIS */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#FCE8C3] relative text-center">
            <button
              onClick={() => setShowRewardModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 rounded-full hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-[#FEF8EC] border-2 border-[#E3A008] rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner text-3xl">
              🥔
            </div>

            <span className="inline-flex items-center gap-1 bg-[#FEF8EC] text-[#8A6100] border border-[#FCE8C3] text-xs font-bold px-3 py-1 rounded-full mb-2">
              <Gift className="w-3.5 h-3.5 text-[#E3A008]" />
              Fidelidade Batata Top 10/10
            </span>

            <h3 className="text-xl sm:text-2xl font-black text-[#1F1B16] mb-2">
              Você Ganhou 1 Batata Grátis!
            </h3>

            <p className="text-xs sm:text-sm text-[#717171] mb-6 leading-relaxed">
              Obrigado pela preferência! Ao clicar em resgatar, disponibilizaremos um cupom de{" "}
              <strong className="text-[#C1440E]">100% de desconto</strong> para usar no seu próximo
              pedido e seu ciclo de fidelidade reiniciará.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleConfirmRedeem}
                disabled={isRedeeming}
                className="w-full py-3 bg-[#E3A008] hover:bg-[#C1440E] text-white font-extrabold text-sm rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isRedeeming ? "Aplicando..." : "Confirmar e Resgatar Agora"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRewardModal(false)}
                className="w-full py-2.5 text-xs text-neutral-500 hover:text-neutral-800 font-semibold"
              >
                Deixar para depois
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AVALIAÇÕES (QUANDO CLICADO EM "VER AVALIAÇÕES") */}
      {showReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 relative">
            <button
              onClick={() => setShowReviewsModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 p-1 rounded-full hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-[#FEF8EC] border border-[#FCE8C3] flex items-center justify-center">
                <Star className="w-6 h-6 fill-[#FCBB00] text-[#FCBB00]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#1F1B16]">Avaliações dos Clientes</h3>
                <p className="text-xs text-neutral-500">Batata Top • Iacanga - SP</p>
              </div>
            </div>

            <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#ECE7E0] flex items-center justify-around mb-5">
              <div className="text-center">
                <span className="text-3xl font-black text-[#1F1B16]">4.9</span>
                <div className="flex items-center justify-center gap-0.5 my-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#FCBB00] text-[#FCBB00]" />
                  ))}
                </div>
                <span className="text-[11px] text-neutral-500">Média geral</span>
              </div>
              <div className="h-10 w-px bg-neutral-200" />
              <div className="text-center">
                <span className="text-3xl font-black text-[#1F1B16]">500+</span>
                <p className="text-[11px] text-neutral-500 mt-1">Avaliações verificadas</p>
              </div>
              <div className="h-10 w-px bg-neutral-200" />
              <div className="text-center">
                <span className="text-3xl font-black text-[#27AE60]">99%</span>
                <p className="text-[11px] text-neutral-500 mt-1">Recomendam</p>
              </div>
            </div>

            {/* Destaques de clientes */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#1F1B16]">Mariana S.</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-[#FCBB00] text-[#FCBB00]" />
                    ))}
                  </div>
                </div>
                <p className="text-neutral-600">
                  &ldquo;A melhor batata recheada da região! Chegou quentinha, crocante por fora e muito bem recheada.&rdquo;
                </p>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#1F1B16]">Lucas R.</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-[#FCBB00] text-[#FCBB00]" />
                    ))}
                  </div>
                </div>
                <p className="text-neutral-600">
                  &ldquo;Entrega super rápida em Iacanga e o programa de fidelidade é incrível, já resgatei minha batata grátis!&rdquo;
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowReviewsModal(false)}
              className="mt-5 w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
