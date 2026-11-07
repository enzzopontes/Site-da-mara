"use client"

import { useState, useEffect, useCallback } from "react"
import { loyaltyManager, type LoyaltyState, LOYALTY_TARGET_ORDERS } from "@/lib/loyalty-manager"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { triggerPixConfettiCannons } from "@/lib/pix-confetti"
import { appToast } from "@/lib/app-toast"

export function useLoyalty() {
  const auth = useAuth?.()
  const userId = auth?.user?.id
  const cart = useCart?.()

  const [state, setState] = useState<LoyaltyState>(() => ({
    ordersCount: 0,
    targetOrders: LOYALTY_TARGET_ORDERS,
    remainingOrders: LOYALTY_TARGET_ORDERS,
    hasRewardAvailable: false,
    rewardsClaimedCount: 0,
    activeRewardCode: null,
    history: [],
  }))

  const [isRedeeming, setIsRedeeming] = useState(false)
  const [showRedeemModal, setShowRedeemModal] = useState(false)

  // Carrega estado e escuta atualizações locais / cross-tabs
  useEffect(() => {
    let isMounted = true

    loyaltyManager.getLoyaltyState(userId).then((s) => {
      if (isMounted) setState(s)
    })

    const handleUpdate = (e: any) => {
      if (e.detail) {
        setState(e.detail)
      }
    }

    window.addEventListener("loyalty-update", handleUpdate)
    window.addEventListener("storage", (e) => {
      if (e.key === "batata_top_loyalty_data_v2") {
        loyaltyManager.getLoyaltyState(userId).then((s) => {
          if (isMounted) setState(s)
        })
      }
    })

    return () => {
      isMounted = false
      window.removeEventListener("loyalty-update", handleUpdate)
    }
  }, [userId])

  // Ação de Resgatar Recompensa (Gatilho 10/10)
  const redeemReward = useCallback(async () => {
    setIsRedeeming(true)
    try {
      const { couponCode, newState } = await loyaltyManager.redeemReward(userId)
      setState(newState)

      // Efeito festivo de confetes
      triggerPixConfettiCannons()

      // Aplica cupom de 100% ou adiciona item cortesia na sacola
      if (cart?.setCoupon) {
        cart.setCoupon({
          code: couponCode,
          title: "Batata Grátis Fidelidade 🥔",
          description: "100% de desconto na sua batata pelo Programa de Fidelidade!",
          discount: 100,
          discount_value: 100,
          type: "percentage",
          discount_type: "percentage",
          minOrderValue: 0,
          badgeLabel: "100% OFF",
        })
      }

      appToast.success(
        "🎉 Batata Grátis Resgatada!",
        `Cupom ${couponCode} aplicado na sua sacola. Escolha sua batata favorita!`
      )

      setShowRedeemModal(false)
    } catch (e: any) {
      appToast.error("Erro no resgate", e.message || "Tente novamente")
    } finally {
      setIsRedeeming(false)
    }
  }, [userId, cart])

  const countDeliveredOrder = useCallback(
    async (orderId: string, createdAt: string | Date = new Date()) => {
      const updated = await loyaltyManager.incrementFromOrder({
        orderId,
        orderCreatedAt: createdAt,
        orderStatus: "delivered",
        userId,
      })
      setState(updated)
      if (updated.hasRewardAvailable) {
        triggerPixConfettiCannons()
      }
      return updated
    },
    [userId]
  )

  return {
    ...state,
    isRedeeming,
    showRedeemModal,
    setShowRedeemModal,
    redeemReward,
    countDeliveredOrder,
    setTestCount: (n: number) => {
      const s = loyaltyManager.setTestCount(n)
      setState(s)
    },
  }
}
