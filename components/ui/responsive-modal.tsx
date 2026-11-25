"use client"

import * as React from "react"
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
}: ResponsiveModalProps) {
  const isMobile = useIsMobile()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const activeIsMobile = mounted ? isMobile : false

  return (
    <ResponsiveModalContext.Provider value={{ isMobile: activeIsMobile }}>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        {children}
      </DialogPrimitive.Root>
    </ResponsiveModalContext.Provider>
  )
}

export function ResponsiveModalTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
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

    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs",
            overlayClassName
          )}
        />
        <DialogPrimitive.Content
          ref={innerRef}
          className={cn(
            "fixed inset-x-0 bottom-0 top-auto left-0 right-0 z-[80] flex flex-col w-full bg-white rounded-t-[28px] max-h-[92dvh] p-6 shadow-2xl focus:outline-none overflow-y-auto",
            "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-lg sm:rounded-3xl sm:max-h-[90vh]",
            className
          )}
          {...props}
        >
          {isMobile && showHandle && (
            <div className="w-10 h-1.5 bg-[#D6CEC4] rounded-full mx-auto my-3 shrink-0" />
          )}
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
  return <DialogPrimitive.Close {...props} />
}
