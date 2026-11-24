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
      const { data: rpcRaw, error: rpcError } = await this.supabase.rpc("get_loyalty_status")
      const rpcData = Array.isArray(rpcRaw) ? rpcRaw[0] : rpcRaw

      if (!rpcError && rpcData && typeof rpcData === "object") {
        const target = Math.max(1, Number(rpcData.target_orders) || LOYALTY_TARGET_ORDERS)
        const count = Math.min(target, Math.max(0, Number(rpcData.orders_count) || 0))
        const remaining =
          rpcData.remaining_orders !== undefined && rpcData.remaining_orders !== null
            ? Math.max(0, Number(rpcData.remaining_orders) || 0)
            : Math.max(0, target - count)
        const hasReward =
          typeof rpcData.has_reward_available === "boolean"
            ? rpcData.has_reward_available
            : count >= target
        const claimedCount = Math.max(0, Number(rpcData.rewards_claimed_count) || 0)
        const activeCode =
          typeof rpcData.active_reward_code === "string" && rpcData.active_reward_code.trim()
            ? rpcData.active_reward_code.trim()
            : null
        const history: LoyaltyReward[] = Array.isArray(rpcData.history)
          ? rpcData.history.map((item: any) => ({
              id: String(item?.id ?? ""),
              code: String(item?.code ?? item?.coupon_code ?? ""),
              claimed: Boolean(item?.claimed),
              claimedAt: item?.claimedAt ?? item?.claimed_at ?? undefined,
              createdAt: String(item?.createdAt ?? item?.created_at ?? ""),
            }))
          : local.history

        const serverState: LoyaltyState = {
          ordersCount: count,
          targetOrders: target,
          remainingOrders: remaining,
          hasRewardAvailable: hasReward,
          rewardsClaimedCount: claimedCount,
          activeRewardCode: activeCode,
          history,
        }
        this.saveLocalState(serverState)
        return serverState
      }
    } catch {
      // Fallback para leitura direta em profiles caso a RPC ainda não esteja disponível
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
   * O incremento acontece server-side via trigger trg_orders_loyalty_on_delivered.
   */
  async incrementFromOrder(params: {
    orderId: string
    orderCreatedAt: string | Date
    orderStatus: string
    userId?: string | null
  }): Promise<LoyaltyState> {
    const { orderId, orderCreatedAt, orderStatus, userId } = params

    void orderId
    void orderCreatedAt
    void orderStatus

    if (userId) {
      return await this.getLoyaltyState(userId)
    }

    return this.getLocalState()
  }

  async redeemReward(userId?: string | null): Promise<{ couponCode: string; newState: LoyaltyState }> {
    if (!userId) {
      throw new Error("Faça login para resgatar sua batata grátis.")
    }

    const { data, error } = await this.supabase.rpc("redeem_loyalty_reward")

    if (error) {
      const rawMessage = `${error.message || ""} ${error.details || ""}`.toLowerCase()
      if (rawMessage.includes("loyalty_not_enough_orders")) {
        throw new Error("Você ainda não completou 10 pedidos para resgatar.")
      }
      if (rawMessage.includes("unauthorized") || error.code === "42501") {
        throw new Error("Faça login para resgatar sua batata grátis.")
      }
      if (rawMessage.includes("profile_not_found")) {
        throw new Error("Perfil de fidelidade não encontrado. Faça login novamente.")
      }
      throw new Error(error.message || "Não foi possível resgatar sua batata grátis. Tente novamente.")
    }

    const rpcData = Array.isArray(data) ? data[0] : data
    const couponCode = typeof rpcData?.coupon_code === "string" ? rpcData.coupon_code.trim() : ""

    if (!couponCode) {
      throw new Error("Não foi possível gerar o cupom de fidelidade. Tente novamente.")
    }

    const refreshed = await this.getLoyaltyState(userId)
    const nowIso = new Date().toISOString()
    const newState: LoyaltyState = {
      ...refreshed,
      ordersCount: 0,
      targetOrders: refreshed.targetOrders || LOYALTY_TARGET_ORDERS,
      remainingOrders: refreshed.targetOrders || LOYALTY_TARGET_ORDERS,
      hasRewardAvailable: false,
      rewardsClaimedCount: Math.max(
        Number(rpcData?.rewards_claimed_count) || 0,
        refreshed.rewardsClaimedCount
      ),
      activeRewardCode: refreshed.activeRewardCode || couponCode,
      history: refreshed.history.some((item) => item.code === couponCode)
        ? refreshed.history
        : [
            {
              id: `reward-${Date.now()}`,
              code: couponCode,
              claimed: true,
              claimedAt: nowIso,
              createdAt: nowIso,
            },
            ...refreshed.history,
          ],
    }

    this.saveLocalState(newState)
    return { couponCode, newState }
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
