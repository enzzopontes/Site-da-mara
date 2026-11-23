import { getSupabaseBrowserClient } from "./supabase/client"

export const LOYALTY_TARGET_ORDERS = 10
export const LOYALTY_CUTOFF_DATE = "2026-11-07T13:40:00.000Z"

export interface LoyaltyReward {
  id: string
  code: string
  claimed: boolean
  claimedAt?: string
  createdAt: string
}

export interface LoyaltyState {
  ordersCount: number // 0 to 10
  targetOrders: number // 10
  remainingOrders: number // 10 - ordersCount (or 0)
  hasRewardAvailable: boolean // ordersCount >= 10
  rewardsClaimedCount: number // total batatas grátis resgatadas
  activeRewardCode?: string | null
  history: LoyaltyReward[]
}

// v2 para reiniciar contagem a partir de agora sem resquício de teste
const STORAGE_KEY = "batata_top_loyalty_data_v2"

class LoyaltyManager {
  private get supabase() {
    return getSupabaseBrowserClient()
  }

  private getLocalState(): LoyaltyState {
    if (typeof window === "undefined") {
      return {
        ordersCount: 0,
        targetOrders: LOYALTY_TARGET_ORDERS,
        remainingOrders: LOYALTY_TARGET_ORDERS,
        hasRewardAvailable: false,
        rewardsClaimedCount: 0,
        activeRewardCode: null,
        history: [],
      }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const count = Math.min(LOYALTY_TARGET_ORDERS, Math.max(0, Number(parsed.ordersCount) || 0))
        return {
          ordersCount: count,
          targetOrders: LOYALTY_TARGET_ORDERS,
          remainingOrders: Math.max(0, LOYALTY_TARGET_ORDERS - count),
          hasRewardAvailable: count >= LOYALTY_TARGET_ORDERS,
          rewardsClaimedCount: Number(parsed.rewardsClaimedCount) || 0,
          activeRewardCode: parsed.activeRewardCode || (count >= 10 ? "BATATA-GRATIS-10" : null),
          history: Array.isArray(parsed.history) ? parsed.history : [],
        }
      }
    } catch (e) {
      console.warn("Erro ao ler fidelidade do localStorage:", e)
    }

    // Inicial limpo (0 pedidos, contagem a partir de agora)
    const initial: LoyaltyState = {
      ordersCount: 0,
      targetOrders: LOYALTY_TARGET_ORDERS,
      remainingOrders: LOYALTY_TARGET_ORDERS,
      hasRewardAvailable: false,
      rewardsClaimedCount: 0,
      activeRewardCode: null,
      history: [],
    }
    this.saveLocalState(initial)
    return initial
  }

  private saveLocalState(state: LoyaltyState) {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      window.dispatchEvent(new CustomEvent("loyalty-update", { detail: state }))
    } catch (e) {
      console.warn("Erro ao salvar fidelidade no localStorage:", e)
    }
  }

  async getLoyaltyState(userId?: string | null): Promise<LoyaltyState> {
    const local = this.getLocalState()

    if (!userId) {
      return local
    }

    try {
      const { data, error } = await this.supabase
        .from("profiles")
        .select("loyalty_orders_count, loyalty_rewards_claimed")
        .eq("id", userId)
        .maybeSingle()

      if (!error && data) {
        const count = Math.min(LOYALTY_TARGET_ORDERS, Math.max(0, Number(data.loyalty_orders_count) || 0))
        const serverState: LoyaltyState = {
          ordersCount: count,
          targetOrders: LOYALTY_TARGET_ORDERS,
          remainingOrders: Math.max(0, LOYALTY_TARGET_ORDERS - count),
          hasRewardAvailable: count >= LOYALTY_TARGET_ORDERS,
          rewardsClaimedCount: Number(data.loyalty_rewards_claimed) || local.rewardsClaimedCount,
          activeRewardCode: count >= 10 ? (local.activeRewardCode || "BATATA-GRATIS-10") : null,
          history: local.history,
        }
        this.saveLocalState(serverState)
        return serverState
      }
    } catch {
      // Fallback local
    }

    return local
  }

  /**
   * Contabiliza pedido recém-entregue. Apenas pós corte atual.
   */
  async incrementFromOrder(params: {
    orderId: string
    orderCreatedAt: string | Date
    orderStatus: string
    userId?: string | null
  }): Promise<LoyaltyState> {
    const { orderId, orderCreatedAt, orderStatus, userId } = params

    // Apenas pedidos criados a partir de agora
    // NEW-07 FIX: Infraestrutura de fidelidade (process_order_loyalty / profiles.loyalty_orders_count) não está ativa no banco.
    // Evita chamar RPC inexistente e remove fallback que corrompia localStorage no navegador do admin.
    void orderId
    void orderCreatedAt
    void orderStatus
    void userId
    return this.getLocalState()
  }

  async redeemReward(_userId?: string | null): Promise<{ couponCode: string; newState: LoyaltyState }> {
    throw new Error("O programa de fidelidade está temporariamente indisponível para resgate automático.")
  }

  setTestCount(count: number) {
    const safeCount = Math.max(0, Math.min(10, count))
    const current = this.getLocalState()
    const updated: LoyaltyState = {
      ...current,
      ordersCount: safeCount,
      remainingOrders: Math.max(0, 10 - safeCount),
      hasRewardAvailable: safeCount >= 10,
      activeRewardCode: safeCount >= 10 ? (current.activeRewardCode || "BATATA-GRATIS-10") : null,
    }
    this.saveLocalState(updated)
    return updated
  }
}

export const loyaltyManager = new LoyaltyManager()
