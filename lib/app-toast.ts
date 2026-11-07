import { toast, type ExternalToast } from "sonner"

export type AppToastOptions = ExternalToast

/**
 * Dispara feedback háptico seguro no dispositivo (se suportado pelo navegador e hardware).
 * - Sucesso / Carrinho: pulso curto de 35ms
 * - Avisos / Erros: pulso duplo (40ms vibra, 30ms pausa, 40ms vibra)
 */
function triggerHaptic(type: "success" | "error" | "warning" | "info") {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      if (type === "success") {
        navigator.vibrate(35)
      } else if (type === "error" || type === "warning") {
        navigator.vibrate([40, 30, 40])
      }
    } catch {
      // Previne falha em navegadores onde a API é bloqueada por política de segurança/permissão
    }
  }
}

export const appToast = {
  success: (title: string, description?: string, options?: AppToastOptions) => {
    triggerHaptic("success")
    return toast.success(title, {
      description,
      ...options,
    })
  },

  error: (title: string, description?: string, options?: AppToastOptions) => {
    triggerHaptic("error")
    return toast.error(title, {
      description,
      ...options,
    })
  },

  warning: (title: string, description?: string, options?: AppToastOptions) => {
    triggerHaptic("warning")
    return toast.warning(title, {
      description,
      ...options,
    })
  },

  info: (title: string, description?: string, options?: AppToastOptions) => {
    triggerHaptic("info")
    return toast.info(title, {
      description,
      ...options,
    })
  },

  dismiss: (id?: number | string) => toast.dismiss(id),
}
