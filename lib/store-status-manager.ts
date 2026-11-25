// Sistema de gerenciamento de status da loja e tempo de espera com FILA INDEPENDENTE
import { getSupabaseBrowserClient } from "./supabase/client"

export interface PromoProduct {
  productId: string
  productName: string
  promoPrice: number
}

export interface SuperPromo {
  isActive: boolean
  price: number
  imageId?: string
  imageUrl?: string
  useUrl?: boolean
}

export interface ItemPromo {
  isActive: boolean
  imageId?: string
  imageUrl?: string
  useUrl?: boolean
}

export interface StoreStatus {
  isOpen: boolean
  isDeliveryEnabled: boolean // Controle de entregas
  deliveryFee: number // Taxa de entrega
  isDeliveryFeeEnabled: boolean // Se a taxa de entrega está ativa
  waitTimeMin: number
  waitTimeMax: number
  activeOrders?: number[] // Lista de timestamps (ms) de cada pedido realizado
  manualOverride?: boolean // Se true, sobrepõe horário automático até o próximo ciclo
  lastManualChange?: string // Timestamp da última mudança manual
  lastCycleState?: boolean // Estado do ciclo programado no momento da sobreposição manual
  openTime?: string // Horário de abertura programado (ex: "10:00")
  closeTime?: string // Horário de fechamento programado (ex: "22:00")
  autoSchedule?: boolean // Se a automação por horário está ativada
  lastAutoSync?: string // Timestamp da última sincronização automática
  // Campos para promoção
  isPromoActive?: boolean
  promoPrice?: number
  promoImage?: string
  promoProducts?: PromoProduct[] // Produtos específicos em promoção
  superPromo?: SuperPromo // Super promoção (todos os preços)
  itemPromo?: ItemPromo // Promoção de itens específicos
}

class StoreStatusManager {
  private get supabase() {
    return getSupabaseBrowserClient()
  }
  private settingKey = "store_status"
  private defaultWaitTime = { min: 30, max: 45 }
  private cachedStatus: StoreStatus | null = null

  // Horários padrão de fallback
  private readonly DEFAULT_OPEN_TIME = "10:00"
  private readonly DEFAULT_CLOSE_TIME = "22:30"

  // Métodos síncronos para UI rápida
  isStoreOpenSync(): boolean {
    return this.cachedStatus?.isOpen ?? true
  }

  getWaitTimeSync(): { min: number; max: number } {
    return {
      min: this.cachedStatus?.waitTimeMin ?? this.defaultWaitTime.min,
      max: this.cachedStatus?.waitTimeMax ?? this.defaultWaitTime.max
    }
  }

  /**
   * Verifica se a loja deve estar aberta baseado no horário programado
   * Respeita o fuso horário de São Paulo (America/Sao_Paulo) e suporta virada de noite
   */
  shouldBeOpenBySchedule(status?: StoreStatus): boolean {
    const openTime = status?.openTime || this.cachedStatus?.openTime || this.DEFAULT_OPEN_TIME
    const closeTime = status?.closeTime || this.cachedStatus?.closeTime || this.DEFAULT_CLOSE_TIME

    // Obtém hora e minuto atual no fuso de São Paulo
    const now = new Date()
    const spTimeStr = now.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })

    const [curH, curM] = spTimeStr.split(":").map(Number)
    const [openH, openM] = openTime.split(":").map(Number)
    const [closeH, closeM] = closeTime.split(":").map(Number)

    const curTotal = (isNaN(curH) ? 0 : curH) * 60 + (isNaN(curM) ? 0 : curM)
    const openTotal = (isNaN(openH) ? 10 : openH) * 60 + (isNaN(openM) ? 0 : openM)
    const closeTotal = (isNaN(closeH) ? 22 : closeH) * 60 + (isNaN(closeM) ? 30 : closeM)

    if (openTotal <= closeTotal) {
      // Janela no mesmo dia (ex: 10:00 às 22:00)
      return curTotal >= openTotal && curTotal < closeTotal
    } else {
      // Janela que vira a meia-noite (ex: 18:00 às 02:00)
      return curTotal >= openTotal || curTotal < closeTotal
    }
  }

  private processActiveOrders(status: StoreStatus): StoreStatus {
    const now = Date.now()
    const tenMinutesInMs = 10 * 60 * 1000
    const orders = status.activeOrders || []
    
    // Filtra apenas pedidos feitos nos últimos 10 minutos
    const validOrders = orders.filter(timestamp => (now - timestamp) < tenMinutesInMs)
    const additionalTime = validOrders.length * 5

    return {
      ...status,
      activeOrders: validOrders,
      waitTimeMin: this.defaultWaitTime.min + additionalTime,
      waitTimeMax: this.defaultWaitTime.max + additionalTime
    }
  }

  async getStatus(): Promise<StoreStatus> {
    try {
      const { data, error } = await this.supabase
        .from("store_settings")
        .select("setting_value")
        .eq("setting_key", this.settingKey)
        .maybeSingle()

      if (error) {
        // Silenciamos erros de conexão no localhost para não travar a interface
        return this.cachedStatus || this.getDefaultStatus()
      }

      let status: StoreStatus
      if (!data) {
        status = this.getDefaultStatus()
      } else {
        status = data.setting_value as StoreStatus
        // Garante que novos campos existam
        if (status.openTime === undefined) status.openTime = this.DEFAULT_OPEN_TIME
        if (status.closeTime === undefined) status.closeTime = this.DEFAULT_CLOSE_TIME
        if (status.autoSchedule === undefined) status.autoSchedule = true
        if (status.manualOverride === undefined) status.manualOverride = false
        if (status.deliveryFee === undefined) status.deliveryFee = 3.00
        if (status.isDeliveryFeeEnabled === undefined) status.isDeliveryFeeEnabled = true
        if (status.isPromoActive === undefined) status.isPromoActive = false
        if (status.promoPrice === undefined) status.promoPrice = 24.99
        if (status.promoImage === undefined) status.promoImage = undefined
        if (status.promoProducts === undefined) status.promoProducts = []
        if (status.superPromo === undefined) status.superPromo = { isActive: false, price: 26.00, imageId: undefined, imageUrl: undefined, useUrl: false }
        if (status.itemPromo === undefined) status.itemPromo = { isActive: false, imageId: undefined, imageUrl: undefined, useUrl: false }
      }

      // Aplica cálculo de horário em memória na leitura (NEW-10: sem disparar UPSERT não autorizado em store_settings)
      if (status.autoSchedule !== false) {
        const scheduledOpen = this.shouldBeOpenBySchedule(status)
        if (status.manualOverride) {
          if (status.lastCycleState !== undefined && scheduledOpen !== status.lastCycleState) {
            status.manualOverride = false
            status.isOpen = scheduledOpen
            status.lastCycleState = scheduledOpen
          }
        } else if (status.isOpen !== scheduledOpen) {
          status.isOpen = scheduledOpen
          status.lastCycleState = scheduledOpen
        }
      }

      const adjustedStatus = this.processActiveOrders(status)
      this.cachedStatus = adjustedStatus
      return adjustedStatus
    } catch (err) {
      return this.cachedStatus || this.getDefaultStatus()
    }
  }

  private getDefaultStatus(): StoreStatus {
    const baseStatus: StoreStatus = {
      isOpen: true,
      openTime: this.DEFAULT_OPEN_TIME,
      closeTime: this.DEFAULT_CLOSE_TIME,
      autoSchedule: true,
      manualOverride: false,
      lastCycleState: true,
      isDeliveryEnabled: true, // Padrão: entregas ativas
      deliveryFee: 3.00,
      isDeliveryFeeEnabled: true,
      waitTimeMin: this.defaultWaitTime.min,
      waitTimeMax: this.defaultWaitTime.max,
      activeOrders: [],
      lastManualChange: undefined,
      isPromoActive: false,
      promoPrice: 24.99,
      promoImage: undefined,
      promoProducts: [],
      superPromo: {
        isActive: false,
        price: 26.00,
        imageId: undefined,
        imageUrl: undefined,
        useUrl: false
      },
      itemPromo: {
        isActive: false,
        imageId: undefined,
        imageUrl: undefined,
        useUrl: false
      }
    }
    baseStatus.isOpen = this.shouldBeOpenBySchedule(baseStatus)
    baseStatus.lastCycleState = baseStatus.isOpen
    return baseStatus
  }

  async toggleStoreStatus(): Promise<boolean> {
    const status = await this.getStatus()
    const scheduledOpen = this.shouldBeOpenBySchedule(status)
    const newStatus: StoreStatus = {
      ...status,
      isOpen: !status.isOpen,
      manualOverride: true, // Marca sobreposição manual válida até o próximo ciclo
      lastCycleState: scheduledOpen, // Salva o estado do ciclo programado no momento
      lastManualChange: new Date().toISOString()
    }
    await this.saveStatus(newStatus)
    return newStatus.isOpen
  }

  async toggleDeliveryStatus(): Promise<boolean> {
    const status = await this.getStatus()
    const newStatus = {
      ...status,
      isDeliveryEnabled: !status.isDeliveryEnabled
    }
    await this.saveStatus(newStatus)
    return newStatus.isDeliveryEnabled
  }

  async toggleDeliveryFeeStatus(): Promise<boolean> {
    const status = await this.getStatus()
    const newStatus = {
      ...status,
      isDeliveryFeeEnabled: !status.isDeliveryFeeEnabled
    }
    await this.saveStatus(newStatus)
    return newStatus.isDeliveryFeeEnabled
  }

  async updateDeliveryFee(fee: number): Promise<void> {
    const status = await this.getStatus()
    const newStatus = {
      ...status,
      deliveryFee: fee
    }
    await this.saveStatus(newStatus)
  }

  // Novos métodos para promoção
  async togglePromoStatus(): Promise<boolean> {
    const status = await this.getStatus()
    const newStatus = {
      ...status,
      isPromoActive: !status.isPromoActive
    }
    await this.saveStatus(newStatus)
    return newStatus.isPromoActive || false
  }

  async updatePromoPrice(price: number): Promise<void> {
    const status = await this.getStatus()
    const newStatus = {
      ...status,
      promoPrice: price
    }
    await this.saveStatus(newStatus)
  }

  async updatePromoImage(imageUrl: string): Promise<void> {
    const status = await this.getStatus()
    const newStatus = {
      ...status,
      promoImage: imageUrl
    }
    await this.saveStatus(newStatus)
  }

  async updatePromoProducts(products: PromoProduct[]): Promise<void> {
    const status = await this.getStatus()
    const newStatus = {
      ...status,
      promoProducts: products
    }
    await this.saveStatus(newStatus)
  }

  getPromoProductPrice(productId: string): number | null {
    const promoProduct = this.cachedStatus?.promoProducts?.find(p => p.productId === productId)
    return promoProduct ? promoProduct.promoPrice : null
  }

  isProductInPromo(productId: string): boolean {
    return (this.cachedStatus?.promoProducts || []).some(p => p.productId === productId)
  }

  // Novos métodos para Super Promoção e Promoção de Itens
  async updateSuperPromo(superPromo: SuperPromo): Promise<void> {
    const status = await this.getStatus()
    const newStatus = {
      ...status,
      superPromo
    }
    await this.saveStatus(newStatus)
  }

  async updateItemPromo(itemPromo: ItemPromo): Promise<void> {
    const status = await this.getStatus()
    const newStatus = {
      ...status,
      itemPromo
    }
    await this.saveStatus(newStatus)
  }

  getSuperPromo(): SuperPromo | undefined {
    return this.cachedStatus?.superPromo
  }

  getItemPromo(): ItemPromo | undefined {
    return this.cachedStatus?.itemPromo
  }

  /**
   * Atualiza os horários programados de abertura e fechamento
   */
  async updateSchedule(openTime: string, closeTime: string, autoSchedule: boolean = true): Promise<StoreStatus> {
    const status = await this.getStatus()
    const tempStatus: StoreStatus = { ...status, openTime, closeTime, autoSchedule }
    const scheduledOpen = this.shouldBeOpenBySchedule(tempStatus)

    const newStatus: StoreStatus = {
      ...tempStatus,
      // Se não estiver em sobreposição manual, sincroniza o isOpen imediatamente
      isOpen: status.manualOverride ? status.isOpen : scheduledOpen,
      lastCycleState: scheduledOpen,
    }
    await this.saveStatus(newStatus)
    return newStatus
  }

  /**
   * Remove a sobreposição manual e volta a usar o horário automático imediatamente
   */
  async resetToAutoSchedule(): Promise<StoreStatus> {
    const status = await this.getStatus()
    const shouldBeOpen = this.shouldBeOpenBySchedule(status)
    const newStatus: StoreStatus = {
      ...status,
      isOpen: shouldBeOpen,
      manualOverride: false,
      lastCycleState: shouldBeOpen,
      lastManualChange: undefined
    }
    await this.saveStatus(newStatus)
    return newStatus
  }

  /**
   * Retorna informações sobre o status de agendamento
   */
  getScheduleInfo(): {
    openingTime: string
    closingTime: string
    isManualOverride: boolean
    shouldBeOpenNow: boolean
    autoSchedule: boolean
  } {
    const status = this.cachedStatus
    return {
      openingTime: status?.openTime || this.DEFAULT_OPEN_TIME,
      closingTime: status?.closeTime || this.DEFAULT_CLOSE_TIME,
      isManualOverride: status?.manualOverride ?? false,
      shouldBeOpenNow: this.shouldBeOpenBySchedule(status || undefined),
      autoSchedule: status?.autoSchedule ?? true,
    }
  }

  /**
   * ADICIONA UM NOVO PEDIDO À FILA (Incrementa 5 minutos)
   */
  async addOrderIncrement(): Promise<StoreStatus> {
    const currentStatus = await this.getStatus()
    const newOrders = [...(currentStatus.activeOrders || []), Date.now()]
    const additionalTime = newOrders.length * 5
    
    const newStatus = {
      ...currentStatus,
      activeOrders: newOrders,
      waitTimeMin: this.defaultWaitTime.min + additionalTime,
      waitTimeMax: this.defaultWaitTime.max + additionalTime
    }
    
    await this.saveStatus(newStatus)
    return newStatus
  }

  /**
   * ALIAS PARA COMPATIBILIDADE: incrementWaitTime
   * Mantido para evitar erros caso o checkout chame este nome.
   */
  async incrementWaitTime(minutes: number = 5): Promise<StoreStatus> {
    // Ignoramos o parâmetro 'minutes' e usamos sempre 5 para manter a lógica da fila
    return this.addOrderIncrement()
  }

  /**
   * ALIAS PARA COMPATIBILIDADE: decrementWaitTime
   */
  async decrementWaitTime(minutes: number = 5): Promise<StoreStatus> {
    const status = await this.getStatus()
    const orders = status.activeOrders || []
    // Remove o pedido mais antigo se houver
    const newOrders = orders.length > 0 ? orders.slice(1) : []
    const additionalTime = newOrders.length * 5
    
    const newStatus = {
      ...status,
      activeOrders: newOrders,
      waitTimeMin: this.defaultWaitTime.min + additionalTime,
      waitTimeMax: this.defaultWaitTime.max + additionalTime
    }
    await this.saveStatus(newStatus)
    return newStatus
  }

  /**
   * ALIAS PARA COMPATIBILIDADE: removeOrderDecrement
   */
  async removeOrderDecrement(): Promise<StoreStatus> {
    return this.decrementWaitTime()
  }

  async resetWaitTime(): Promise<StoreStatus> {
    const newStatus = {
      ...this.getDefaultStatus(),
      activeOrders: []
    }
    await this.saveStatus(newStatus)
    return newStatus
  }

  private async saveStatus(status: StoreStatus): Promise<void> {
    const { error } = await this.supabase
      .from("store_settings")
      .upsert(
        {
          setting_key: this.settingKey,
          setting_value: status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      )

    if (error) {
      console.error("[StoreStatusManager] Error in saveStatus:", error)
      throw new Error(error.message || "Falha ao salvar configurações da loja.")
    }

    this.cachedStatus = status

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("store-status-changed", { detail: status }))
    }
  }

  private autoScheduleIntervalId: ReturnType<typeof setInterval> | null = null

  /**
   * Inicia verificação periódica do horário automático
   * Deve ser chamado uma vez quando a aplicação inicia
   */
  startAutoScheduleCheck(): void {
    if (this.autoScheduleIntervalId !== null) return
    // Verifica a cada minuto se o status deve mudar
    this.autoScheduleIntervalId = setInterval(async () => {
      const status = await this.getStatus()
      // O método getStatus já aplica a lógica de horário automático
    }, 60000) // A cada 60 segundos
  }
}

export const storeStatusManager = new StoreStatusManager()
