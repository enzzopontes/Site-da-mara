"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowRightLeft, EyeOff, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { CategoryWithCounts } from "@/lib/categories-db"
import {
  deleteCategorySafeAction,
  toggleCategoryActiveAction,
} from "@/app/admin/categorias/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface CategoryDeleteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: CategoryWithCounts | null
  productCount: number
  targetCategories: CategoryWithCounts[]
  onCompleted: () => void
}

type PendingAction = "delete" | "migrate" | "deactivate" | null

export function CategoryDeleteModal({
  open,
  onOpenChange,
  category,
  productCount,
  targetCategories,
  onCompleted,
}: CategoryDeleteModalProps) {
  const [migrateToCategoryId, setMigrateToCategoryId] = useState("")
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [serverBlockedCount, setServerBlockedCount] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMigrateToCategoryId("")
    setPendingAction(null)
    setServerBlockedCount(null)
    setErrorMessage(null)
  }, [open, category?.id])

  const availableTargets = useMemo(() => {
    if (!category) return []
    return targetCategories.filter(
      (item) => item.kind === "product_category" && item.id !== category.id
    )
  }, [targetCategories, category])

  const effectiveProductCount = Math.max(productCount, serverBlockedCount ?? 0)
  const hasLinkedProducts = effectiveProductCount > 0
  const isBusy = pendingAction !== null

  if (!category) return null

  async function handlePermanentDelete() {
    if (!category || isBusy) return
    setPendingAction("delete")
    setErrorMessage(null)

    try {
      const result = await deleteCategorySafeAction(category.id)
      if (!result.ok) {
        if (result.code === "HAS_PRODUCTS" && typeof result.productCount === "number") {
          setServerBlockedCount(result.productCount)
        }
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success(`Categoria "${category.name}" excluída com sucesso.`)
      onCompleted()
      onOpenChange(false)
    } catch {
      const msg = "Erro inesperado ao excluir categoria."
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setPendingAction(null)
    }
  }

  async function handleMigrateAndDelete() {
    if (!category || isBusy) return
    if (!migrateToCategoryId) {
      const msg = "Selecione a categoria de destino para migrar os produtos."
      setErrorMessage(msg)
      toast.error(msg)
      return
    }

    setPendingAction("migrate")
    setErrorMessage(null)

    try {
      const result = await deleteCategorySafeAction(category.id, {
        migrateToCategoryId,
      })
      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      const targetName = availableTargets.find((t) => t.id === migrateToCategoryId)?.name
      toast.success(
        targetName
          ? `Produtos migrados para "${targetName}" e categoria excluída.`
          : `Produtos migrados e categoria "${category.name}" excluída.`
      )
      onCompleted()
      onOpenChange(false)
    } catch {
      const msg = "Erro inesperado ao migrar produtos e excluir categoria."
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setPendingAction(null)
    }
  }

  async function handleDeactivateOnly() {
    if (!category || isBusy) return
    setPendingAction("deactivate")
    setErrorMessage(null)

    try {
      const result = await toggleCategoryActiveAction(category.id, false)
      if (!result.ok) {
        setErrorMessage(result.error)
        toast.error(result.error)
        return
      }

      toast.success(`Categoria "${category.name}" desativada com sucesso.`)
      onCompleted()
      onOpenChange(false)
    } catch {
      const msg = "Erro inesperado ao desativar categoria."
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isBusy) return
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="sm:max-w-lg bg-white border-[#ECE7E0] text-[#1F1B16]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[#1F1B16]">
            {hasLinkedProducts ? (
              <>
                <AlertTriangle className="w-5 h-5 text-[#E3A008] shrink-0" />
                Exclusão bloqueada por produtos vinculados
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5 text-[#C1440E] shrink-0" />
                Excluir categoria permanentemente
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-[#1F1B16]/70">
            {hasLinkedProducts
              ? `A categoria "${category.name}" não pode ser excluída diretamente enquanto houver produtos associados.`
              : `Tem certeza que deseja excluir permanentemente a categoria "${category.name}"?`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-[#C1440E]/30 bg-[#C1440E]/8 px-3.5 py-2.5 text-sm text-[#C1440E]"
            >
              {errorMessage}
            </div>
          )}

          {hasLinkedProducts ? (
            <>
              {/* Warning summary */}
              <div className="rounded-xl border border-[#E3A008]/50 bg-[#FEF8EC] px-4 py-3 text-sm text-[#1F1B16]">
                Existem{" "}
                <strong className="font-bold text-[#C1440E]">
                  {effectiveProductCount}{" "}
                  {effectiveProductCount === 1 ? "produto vinculado" : "produtos vinculados"}
                </strong>{" "}
                à categoria <strong>{category.name}</strong>. Escolha uma das ações seguras abaixo:
              </div>

              {/* Option A: Migrate & Delete */}
              <div className="rounded-xl border border-[#ECE7E0] bg-[#F7F5F0]/60 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <ArrowRightLeft className="w-4 h-4 text-[#C1440E] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#1F1B16]">
                      Opção A: Migrar produtos e excluir
                    </div>
                    <p className="text-xs text-[#1F1B16]/65 mt-0.5">
                      Move todos os {effectiveProductCount} produto(s) para outra categoria de
                      produto e remove <strong>{category.name}</strong> em seguida.
                    </p>
                  </div>
                </div>

                {availableTargets.length > 0 ? (
                  <div className="space-y-2">
                    <Label
                      htmlFor="migrate-target-select"
                      className="text-xs font-medium text-[#1F1B16]/80"
                    >
                      Categoria de destino
                    </Label>
                    <Select
                      value={migrateToCategoryId}
                      onValueChange={(value) => {
                        setMigrateToCategoryId(value)
                        if (errorMessage) setErrorMessage(null)
                      }}
                      disabled={isBusy}
                    >
                      <SelectTrigger
                        id="migrate-target-select"
                        className="w-full bg-white border-[#ECE7E0]"
                      >
                        <SelectValue placeholder="Selecione a nova categoria dos produtos" />
                      </SelectTrigger>
                      <SelectContent className="z-[150] bg-white border-[#ECE7E0]">
                        {availableTargets.map((target) => (
                          <SelectItem key={target.id} value={target.id}>
                            {target.name}
                            {!target.is_active ? " (Inativa)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      disabled={!migrateToCategoryId || isBusy}
                      onClick={handleMigrateAndDelete}
                      className="w-full bg-[#C1440E] hover:bg-[#9E350A] text-white font-semibold"
                    >
                      {pendingAction === "migrate" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Migrando e excluindo...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="w-4 h-4" />
                          Migrar produtos e excluir
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-[#C1440E] bg-white rounded-lg border border-[#ECE7E0] p-2.5">
                    Nenhuma outra categoria de produto disponível para migração. Crie outra
                    categoria primeiro ou use a opção de desativação abaixo.
                  </p>
                )}
              </div>

              {/* Option B: Deactivate only */}
              <div className="rounded-xl border border-[#ECE7E0] bg-white p-4 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <EyeOff className="w-4 h-4 text-[#E3A008] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#1F1B16]">
                      Opção B: Apenas desativar categoria
                    </div>
                    <p className="text-xs text-[#1F1B16]/65 mt-0.5">
                      Oculta a categoria da vitrine preservando os produtos e o histórico intactos.
                      {!category.is_active && " (Esta categoria já está desativada.)"}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={handleDeactivateOnly}
                  className="w-full border-[#E3A008] text-[#1F1B16] bg-[#FEF8EC]/60 hover:bg-[#FEF8EC] font-medium"
                >
                  {pendingAction === "deactivate" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Desativando...
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 text-[#C1440E]" />
                      Apenas desativar categoria
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-[#ECE7E0] bg-[#F7F5F0]/70 p-4 text-sm text-[#1F1B16]/80">
              Esta ação não pode ser desfeita. Nenhum produto está vinculado a{" "}
              <strong className="text-[#1F1B16]">{category.name}</strong>.
              {category.icon_type === "upload" && category.icon_url && (
                <span> O ícone enviado no Storage também será removido.</span>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={() => onOpenChange(false)}
            className="border-[#ECE7E0] bg-white hover:bg-[#F7F5F0] text-[#1F1B16]"
          >
            Cancelar
          </Button>

          {!hasLinkedProducts && (
            <Button
              type="button"
              disabled={isBusy}
              onClick={handlePermanentDelete}
              className="bg-[#C1440E] hover:bg-[#9E350A] text-white font-semibold"
            >
              {pendingAction === "delete" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Excluir permanentemente
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
