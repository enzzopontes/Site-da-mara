// Configurações do Sistema de Progressão de Pedidos
export const ORDERS_CONFIG = {
  // Tempo base em minutos para pedido único na cozinha
  BASE_MINUTES: 15,
  // Minutos adicionais por cada pedido à frente na cozinha
  STEP_MINUTES: 5,
  // Tempo máximo de ETA em minutos
  MAX_MINUTES: 45,
  // Fração do ETA para transição preparing -> ready (0.4 * 15min = 6min)
  READY_FRACTION: 0.4,
  // Tempo em minutos para transição pending -> preparing (>= 1 min)
  PENDING_TO_PREPARING_MINUTES: 1,
  // Se true, avança automaticamente de ready -> delivered ao atingir o ETA
  AUTO_DELIVERED: false,
} as const;
