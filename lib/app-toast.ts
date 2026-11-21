import {
  hideThemedAlert,
  showErrorAlert,
  showInfoAlert,
  showSuccessAlert,
  showThemedAlert,
  showWarningAlert,
  type ThemedAlertOptions,
} from "@/lib/themed-alert"

export type AppToastOptions = ThemedAlertOptions

export const appToast = {
  success: (title: string, description?: string, options?: AppToastOptions) =>
    showThemedAlert(title, description, "success", options),
  error: (title: string, description?: string, options?: AppToastOptions) =>
    showThemedAlert(title, description, "error", options),
  warning: (title: string, description?: string, options?: AppToastOptions) =>
    showThemedAlert(title, description, "warning", options),
  info: (title: string, description?: string, options?: AppToastOptions) =>
    showThemedAlert(title, description, "info", options),
  dismiss: (id?: number | string) => hideThemedAlert(id),
}

export {
  showThemedAlert,
  showSuccessAlert,
  showErrorAlert,
  showWarningAlert,
  showInfoAlert,
  hideThemedAlert,
}
