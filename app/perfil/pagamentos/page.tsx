"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { usePaymentCards, type SavedCard } from "@/hooks/use-payment-cards"
import { CardBrandBadge } from "@/components/payment/card-brand-badge"
import { CardWizardModal } from "@/components/payment/card-wizard-modal"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  CreditCard,
  Tag,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

export default function PagamentosPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { cards, loadingCards, savingCard, loadCards, addCard, removeCard } =
    usePaymentCards()

  const [typeSelectionOpen, setTypeSelectionOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<
    "cartão de crédito" | "cartão de débito"
  >("cartão de crédito")
  const [cardToDelete, setCardToDelete] = useState<SavedCard | null>(null)
  const [deletingCard, setDeletingCard] = useState(false)

  // Autenticação obrigatória: redireciona para login se não autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Carrega cartões salvos do usuário
  useEffect(() => {
    if (user) {
      loadCards()
    }
  }, [user, loadCards])

  const handleSelectType = (type: "cartão de crédito" | "cartão de débito") => {
    setSelectedType(type)
    setTypeSelectionOpen(false)
    setWizardOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return
    setDeletingCard(true)
    try {
      const res = await removeCard(cardToDelete)
      if (res.success) {
        toast.success("Cartão removido com sucesso.")
        setCardToDelete(null)
      } else {
        toast.error(res.error || "Não foi possível remover o cartão.")
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover cartão.")
    } finally {
      setDeletingCard(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#E3A008]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#18181B] flex flex-col relative">
      {/* Degradê amarelo suave no topo */}
      <div className="bg-gradient-to-b from-[#FDE68A] via-[#FEF3C7] to-[#FFFFFF] h-40 absolute top-0 left-0 right-0 pointer-events-none" />

      {/* Header com botão voltar circular e logo centralizada */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-4 pb-3 max-w-xl w-full mx-auto">
        <button
          type="button"
          onClick={() => router.push("/perfil")}
          className="w-9.5 h-9.5 rounded-full bg-white shadow-xs flex items-center justify-center text-[#18181B] hover:bg-neutral-50 active:scale-95 transition-all cursor-pointer shrink-0"
          aria-label="Voltar para perfil"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <img
          src="/assets/batatatopestendida.png"
          alt="Batata Top"
          className="w-[225px] h-[54px] object-contain"
        />

        <div className="w-9.5 h-9.5 shrink-0" />
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 pt-2 pb-28 relative z-10">
        <h1 className="text-xl font-bold text-[#18181B]">
          Formas de pagamento
        </h1>
        <p className="text-sm text-[#71717A] mb-4">
          Adicione e gerencie
        </p>

        {/* Linha horizontal com scroll para os cartões */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none">
          {/* Saved cards */}
          {cards.map((card) => (
            <div
              key={card.id}
              className="w-[108px] h-[108px] rounded-[20px] bg-[#F4F4F5] border border-[#E4E4E7] p-3 flex flex-col justify-between shrink-0"
            >
              <div className="flex items-center justify-between">
                <CardBrandBadge brand={card.payment_method_id} size="md" />
                <button
                  type="button"
                  onClick={() => setCardToDelete(card)}
                  className="text-[#A1A1AA] hover:text-[#71717A] p-0.5 transition-colors cursor-pointer"
                  aria-label="Remover cartão"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 512 512"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm75.31 260.69a16 16 0 11-22.62 22.62L256 278.63l-52.69 52.68a16 16 0 01-22.62-22.62L233.37 256l-52.68-52.69a16 16 0 0122.62-22.62L256 233.37l52.69-52.68a16 16 0 0122.62 22.62L278.63 256z" />
                  </svg>
                </button>
              </div>

              <div>
                <span className="block text-[11px] text-[#71717A]">
                  {card.card_type === "cartão de crédito" ? "Crédito" : "Débito"}
                </span>
                <span className="block font-bold text-[#18181B] text-sm truncate">
                  {card.last_four || "••••"}
                </span>
              </div>
            </div>
          ))}

          {/* Tile "Adicionar novo" */}
          <button
            type="button"
            onClick={() => setTypeSelectionOpen(true)}
            className="w-[108px] h-[108px] rounded-[20px] border-[1.5px] border-dashed border-[#D4D4D8] bg-white flex flex-col items-center justify-center p-2.5 gap-2 shrink-0 cursor-pointer hover:bg-neutral-50 active:scale-95 transition-all text-center"
          >
            <Plus className="w-7 h-7 text-[#71717A]" />
            <span className="text-xs font-medium text-[#71717A]">
              Adicionar novo
            </span>
          </button>
        </div>

        {/* Skeletons de carregamento abaixo da linha horizontal */}
        {loadingCards && (
          <div className="flex items-center gap-3 pb-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="w-[108px] h-[108px] rounded-[20px] bg-[#F4F4F5] border border-[#E4E4E7] p-3 flex flex-col justify-between shrink-0 animate-pulse"
              >
                <div className="w-9 h-5 bg-[#E4E4E7] rounded" />
                <div className="space-y-1.5">
                  <div className="w-10 h-2.5 bg-[#E4E4E7] rounded" />
                  <div className="w-16 h-3.5 bg-[#E4E4E7] rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state quando não há cartões e não está carregando */}
        {!loadingCards && cards.length === 0 && (
          <div className="py-8 flex flex-col items-center text-center">
            <img
              src="/assets/batatatoppagamento.png"
              alt="Sem cartões"
              className="w-[200px] h-[200px] object-contain mb-4"
            />
            <h2 className="font-bold text-[#18181B] text-base">
              Nenhum cartão por aqui
            </h2>
            <p className="text-sm text-[#71717A] max-w-xs mt-1">
              Adicione um cartão pra agilizar seus próximos pedidos.
            </p>
          </div>
        )}
      </main>

      {/* Rodapé fixo com linha divisória e Meus cupons */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#ECE7E0] bg-white p-4 z-20">
        <div className="max-w-xl mx-auto">
          <button
            type="button"
            onClick={() => router.push("/cupons")}
            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-neutral-50 active:scale-[0.99] transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-[#717171] shrink-0">
                <Tag className="w-4.5 h-4.5 text-[#717171]" />
              </div>
              <span className="text-[15px] font-medium text-[#18181B]">
                Meus cupons
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#717171]" />
          </button>
        </div>
      </div>

      {/* Bottom Sheet / Modal minimalista para Escolha do Tipo de Pagamento */}
      {typeSelectionOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="fixed inset-0 bg-black/45 transition-opacity"
            onClick={() => setTypeSelectionOpen(false)}
          />
          <div className="relative z-10 w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#18181B]">
                Escolha uma opção de pagamento
              </h3>
              <button
                type="button"
                onClick={() => setTypeSelectionOpen(false)}
                className="p-1 rounded-full text-[#71717A] hover:bg-neutral-100 cursor-pointer transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleSelectType("cartão de crédito")}
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
                onClick={() => handleSelectType("cartão de débito")}
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

      {/* CardWizardModal */}
      <CardWizardModal
        isOpen={wizardOpen}
        cardType={selectedType}
        existingCardsCount={cards.length}
        addCard={addCard}
        savingCard={savingCard}
        onClose={() => setWizardOpen(false)}
        onSaved={() => {
          setWizardOpen(false)
          loadCards()
        }}
      />

      {/* Modal de confirmação para remover cartão */}
      {cardToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => !deletingCard && setCardToDelete(null)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-base font-bold text-[#18181B] mb-2">
              Remover cartão
            </h4>
            <p className="text-sm text-[#71717A] mb-5">
              Deseja remover o cartão final {cardToDelete.last_four}?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deletingCard}
                onClick={() => setCardToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-[#71717A] hover:bg-neutral-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingCard}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer transition-colors flex items-center gap-2"
              >
                {deletingCard && <Loader2 className="w-4 h-4 animate-spin" />}
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
