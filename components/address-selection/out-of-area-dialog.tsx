"use client"

import { MapPin, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface OutOfAreaDialogProps {
  isOpen: boolean
  onClose: () => void
  onRecenterIacanga: () => void
}

export function OutOfAreaDialog({
  isOpen,
  onClose,
  onRecenterIacanga,
}: OutOfAreaDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl p-6 text-center border-none shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-[#FFB800] mb-3">
          <MapPin className="h-7 w-7" />
        </div>

        <DialogHeader className="text-center">
          <DialogTitle className="text-lg font-black text-neutral-900 tracking-tight">
            Fora da área de entrega
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-600 mt-2">
            Só entregamos em{" "}
            <strong className="text-neutral-900 font-bold">Iacanga/SP</strong>. Mova o
            mapa até essa região pra continuar.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 flex flex-col gap-2">
          <Button
            type="button"
            onClick={onRecenterIacanga}
            className="w-full h-11 rounded-xl bg-[#FFB800] text-neutral-950 font-bold hover:bg-[#E5A600] active:scale-98 transition-all"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Centralizar em Iacanga
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full h-10 rounded-xl text-neutral-600 hover:text-neutral-900 font-medium"
          >
            Entendi, vou mover o mapa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
