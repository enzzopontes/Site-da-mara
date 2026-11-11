"use client"

import * as React from "react"
import { Drawer as VaulDrawer } from "vaul"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/components/ui/use-mobile"

interface ResponsiveModalContextValue {
  isMobile: boolean
}

const ResponsiveModalContext = React.createContext<ResponsiveModalContextValue>({
  isMobile: false,
})

export const useResponsiveModal = () => React.useContext(ResponsiveModalContext)

export interface ResponsiveModalProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  shouldScaleBackground?: boolean
  dismissible?: boolean
  nested?: boolean
}

export function ResponsiveModal({
  children,
  open,
  onOpenChange,
  shouldScaleBackground = false,
  dismissible = true,
  nested = false,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Se ainda não montou no cliente, sincroniza sem quebrar hidratação
  const activeIsMobile = mounted ? isMobile : false

  if (activeIsMobile) {
    return (
      <ResponsiveModalContext.Provider value={{ isMobile: true }}>
        <VaulDrawer.Root
          open={open}
          onOpenChange={onOpenChange}
          shouldScaleBackground={shouldScaleBackground}
          dismissible={dismissible}
          nested={nested}
          repositionInputs={false}
        >
          {children}
        </VaulDrawer.Root>
      </ResponsiveModalContext.Provider>
    )
  }

  return (
    <ResponsiveModalContext.Provider value={{ isMobile: false }}>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        {children}
      </DialogPrimitive.Root>
    </ResponsiveModalContext.Provider>
  )
}

export function ResponsiveModalTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  const { isMobile } = useResponsiveModal()
  if (isMobile) {
    return <VaulDrawer.Trigger {...props} />
  }
  return <DialogPrimitive.Trigger {...props} />
}

export interface ResponsiveModalContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  showHandle?: boolean
  showCloseButton?: boolean
  overlayClassName?: string
}

export const ResponsiveModalContent = React.forwardRef<
  HTMLDivElement,
  ResponsiveModalContentProps
>(
  (
    {
      children,
      className,
      showHandle = true,
      showCloseButton = true,
      overlayClassName,
      ...props
    },
    forwardedRef
  ) => {
    const { isMobile } = useResponsiveModal()
    const innerRef = React.useRef<HTMLDivElement>(null)

    // Unifica forwardedRef e innerRef
    React.useImperativeHandle(
      forwardedRef,
      () => innerRef.current as HTMLDivElement
    )

    // Garante data-vaul-no-drag em todos os inputs e controles para prevenir bugs de arraste e teclado
    React.useEffect(() => {
      if (!isMobile || !innerRef.current) return

      const markNoDrag = () => {
        if (!innerRef.current) return
        const interactiveElements = innerRef.current.querySelectorAll(
          "input, textarea, select, [role='slider'], [data-no-drag]"
        )
        interactiveElements.forEach((el) => {
          if (!el.hasAttribute("data-vaul-no-drag")) {
            el.setAttribute("data-vaul-no-drag", "true")
          }
        })
      }

      markNoDrag()
      const observer = new MutationObserver(markNoDrag)
      observer.observe(innerRef.current, { childList: true, subtree: true })
      return () => observer.disconnect()
    }, [isMobile])

    if (isMobile) {
      return (
        <VaulDrawer.Portal>
          <VaulDrawer.Overlay
            className={cn(
              "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "transition-opacity duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]",
              overlayClassName
            )}
          />
          <VaulDrawer.Content
            ref={innerRef}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 flex flex-col bg-white rounded-t-[28px] max-h-[92vh] focus:outline-none shadow-2xl",
              "transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]",
              className
            )}
            {...props}
          >
            {showHandle && (
              <div className="w-10 h-1.5 bg-[#D6CEC4] rounded-full mx-auto my-3 shrink-0" />
            )}
            {children}
          </VaulDrawer.Content>
        </VaulDrawer.Portal>
      )
    }

    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "transition-all duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]",
            overlayClassName
          )}
        />
        <DialogPrimitive.Content
          ref={innerRef}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] bg-white p-6 shadow-2xl rounded-3xl focus:outline-none max-h-[90vh] overflow-y-auto",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:scale-95 data-[state=open]:scale-100",
            "duration-200 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]",
            className
          )}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#E3A008]"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Fechar</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    )
  }
)
ResponsiveModalContent.displayName = "ResponsiveModalContent"

export function ResponsiveModalHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 p-4 sm:p-0 text-left", className)}
      {...props}
    />
  )
}

export function ResponsiveModalTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  const { isMobile } = useResponsiveModal()
  if (isMobile) {
    return (
      <VaulDrawer.Title
        className={cn("text-lg sm:text-xl font-bold text-[#1F1B16]", className)}
        {...props}
      />
    )
  }
  return (
    <DialogPrimitive.Title
      className={cn("text-lg sm:text-xl font-bold text-[#1F1B16]", className)}
      {...props}
    />
  )
}

export function ResponsiveModalDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  const { isMobile } = useResponsiveModal()
  if (isMobile) {
    return (
      <VaulDrawer.Description
        className={cn("text-sm text-gray-500", className)}
        {...props}
      />
    )
  }
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-gray-500", className)}
      {...props}
    />
  )
}

export function ResponsiveModalBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto overscroll-contain px-4 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    />
  )
}

export function ResponsiveModalFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-auto flex flex-col gap-2 p-4 sm:p-0 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

export function ResponsiveModalClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  const { isMobile } = useResponsiveModal()
  if (isMobile) {
    return <VaulDrawer.Close {...props} />
  }
  return <DialogPrimitive.Close {...props} />
}
