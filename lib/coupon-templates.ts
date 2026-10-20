/**
 * Templates Estratégicos de Cupons (Padrão iFood / Batata Top)
 * Presets testados para alta atração, recompra e conversão.
 */

export interface CouponTemplate {
  id: string
  tag: string
  badge: string
  icon: "sparkles" | "heart" | "bicycle" | "moon"
  iconColor: string
  title: string
  subtitle: string
  suggestedCode: string
  suggestedType: "percentage" | "fixed"
  suggestedValue: string
  suggestedMinOrder: string
  suggestedDaysValid: number
  suggestedMaxUsesPerUser: string
  suggestedQuantity: string
  showOnHome: boolean
  isBannerHighlight: boolean
  bannerHeadline: string
}

export const COUPON_TEMPLATES: CouponTemplate[] = [
  {
    id: "primeira_compra",
    tag: "first_order",
    badge: "PRIMEIRO PEDIDO",
    icon: "sparkles",
    iconColor: "#E3A008",
    title: "Atrair Novos Clientes",
    subtitle: "Cupom de boas-vindas com foco em conversão imediata de primeiro acesso.",
    suggestedCode: "BEMVINDO15",
    suggestedType: "percentage",
    suggestedValue: "15",
    suggestedMinOrder: "35",
    suggestedDaysValid: 14,
    suggestedMaxUsesPerUser: "1",
    suggestedQuantity: "100",
    showOnHome: true,
    isBannerHighlight: true,
    bannerHeadline: "15% OFF no seu 1º pedido no site!",
  },
  {
    id: "clientes_sumidos",
    tag: "winback",
    badge: "QUE SAUDADE",
    icon: "heart",
    iconColor: "#C1440E",
    title: "Resgatar Clientes Sumidos",
    subtitle: "Desconto atrativo em reais para incentivar o retorno de clientes inativos.",
    suggestedCode: "VOLTAPRABATATA",
    suggestedType: "fixed",
    suggestedValue: "10",
    suggestedMinOrder: "40",
    suggestedDaysValid: 7,
    suggestedMaxUsesPerUser: "1",
    suggestedQuantity: "50",
    showOnHome: true,
    isBannerHighlight: true,
    bannerHeadline: "R$ 10 de presente pra matar a saudade!",
  },
  {
    id: "frete_gratis",
    tag: "free_shipping",
    badge: "FRETE ZERO",
    icon: "bicycle",
    iconColor: "#27AE60",
    title: "Frete Grátis Batatop",
    subtitle: "Elimina o atrito do frete para elevar o ticket médio e volume do pedido.",
    suggestedCode: "ENTREGATOP",
    suggestedType: "fixed",
    suggestedValue: "8",
    suggestedMinOrder: "45",
    suggestedDaysValid: 5,
    suggestedMaxUsesPerUser: "2",
    suggestedQuantity: "80",
    showOnHome: true,
    isBannerHighlight: true,
    bannerHeadline: "Entrega na faixa acima de R$ 45!",
  },
  {
    id: "combo_noite",
    tag: "peak_hours",
    badge: "NOITE DA BATATA",
    icon: "moon",
    iconColor: "#8E44AD",
    title: "Aumentar Ticket Noturno",
    subtitle: "Desconto mais robusto condicionado a compras familiares e pedidos grandes.",
    suggestedCode: "SEXTATOP",
    suggestedType: "fixed",
    suggestedValue: "15",
    suggestedMinOrder: "70",
    suggestedDaysValid: 3,
    suggestedMaxUsesPerUser: "1",
    suggestedQuantity: "60",
    showOnHome: true,
    isBannerHighlight: true,
    bannerHeadline: "R$ 15 OFF pra curtir a noite recheada!",
  },
]
