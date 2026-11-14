"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react"

export const Toaster = ({ style, className, ...props }: ToasterProps) => {
  const { theme = "light" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      duration={3800}
      closeButton
      style={{ zIndex: 999999, ...style }}
      className={`toaster group z-[999999] ${className ?? ""}`.trim()}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#1F1B16] group-[.toaster]:border-zinc-200/80 group-[.toaster]:shadow-xl group-[.toaster]:rounded-[14px] group-[.toaster]:px-4 group-[.toaster]:py-3.5 group-[.toaster]:gap-3 group-[.toaster]:font-sans",
          title: "font-semibold text-sm leading-snug text-current",
          description: "text-xs opacity-90 mt-0.5 leading-relaxed text-current",
          actionButton:
            "group-[.toast]:bg-black/15 group-[.toast]:text-current group-[.toast]:rounded-xl group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:px-3 group-[.toast]:py-1.5",
          cancelButton:
            "group-[.toast]:bg-black/10 group-[.toast]:text-current group-[.toast]:rounded-xl group-[.toast]:text-xs group-[.toast]:font-medium group-[.toast]:px-3 group-[.toast]:py-1.5",
          closeButton:
            "group-[.toast]:bg-zinc-100/80 group-[.toast]:border-zinc-200/70 group-[.toast]:text-zinc-600 hover:group-[.toast]:text-zinc-900 group-data-[type=success]:!bg-white/20 group-data-[type=success]:!border-white/30 group-data-[type=success]:!text-white group-data-[type=error]:!bg-white/20 group-data-[type=error]:!border-white/30 group-data-[type=error]:!text-white group-data-[type=warning]:!bg-black/10 group-data-[type=warning]:!border-black/15 group-data-[type=warning]:!text-[#1F1B16]",
          success: "!bg-[#27AE60] !text-white !border-[#219653] shadow-lg",
          error: "!bg-[#EA1D2C] !text-white !border-[#D31725] shadow-lg",
          warning: "!bg-[#E3A008] !text-[#1F1B16] !border-[#C98D06] shadow-lg",
          info: "!bg-white !text-[#1F1B16] !border-zinc-200/90 shadow-lg",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-white shrink-0" />,
        error: <AlertCircle className="h-5 w-5 text-white shrink-0" />,
        warning: <AlertTriangle className="h-5 w-5 text-[#1F1B16] shrink-0" />,
        info: <Info className="h-5 w-5 text-sky-600 shrink-0" />,
        loading: <Loader2 className="h-5 w-5 text-zinc-400 animate-spin shrink-0" />,
      }}
      {...props}
    />
  )
}
