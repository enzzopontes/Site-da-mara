'use client'

import { appToast } from "@/lib/app-toast"
import { normalizeLegacyCategorySlug } from "@/lib/category-icons"

import { createBrowserClient } from "./supabase/client"

export interface Adicional {
  id: string
  name: string
  price: number
  available?: boolean
  adicional_categoria?: string | null
  category?: string | null
}

async function callAdminAdicionalApi<T = any>(body: Record<string, unknown>): Promise<T | null> {
  let res: Response
  try {
    res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    })
  } catch {
    return null
  }
  let json: any = null
  try {
    json = await res.json()
  } catch {}
  if (res.status === 404 && !json) return null
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `Falha na API (HTTP ${res.status}).`)
  }
  return json.data as T
}

class AdicionaisManagerClient {
  async getAdicionais(): Promise<Adicional[]> {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("adicionais")
        .select("*")
        .eq("available", true)
        .order("name")

      if (error) {
        console.error("[Supabase] Erro ao buscar adicionais disponíveis:", error.message)
        throw new Error("Erro ao buscar adicionais no banco de dados: " + error.message)
      }
      return (data || []).map((a: any) => ({ ...a, price: Number(a.price) || 0 }))
    } catch (error) {
      console.error("[AdicionaisManager] Falha no getAdicionais:", error)
      throw error
    }
  }

  async getAllAdicionais(): Promise<Adicional[]> {
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("adicionais")
        .select("*")
        .order("name")

      if (error) {
        console.error("[Supabase] Erro ao buscar todos os adicionais:", error.message)
        throw new Error("Erro ao carregar lista completa de adicionais: " + error.message)
      }
      return (data || []).map((a: any) => ({ ...a, price: Number(a.price) || 0 }))
    } catch (error) {
      console.error("[AdicionaisManager] Falha no getAllAdicionais:", error)
      throw error
    }
  }

  async getAdicionaisByProductId(
    productId: string
  ): Promise<{
    allowsAddons: boolean | null
    allowsNotes: boolean | null
    adicionais: Adicional[]
    loadError?: boolean
  }> {
    const trimmedId = String(productId || "").trim()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedId)) {
      return { allowsAddons: null, allowsNotes: null, adicionais: [] }
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined
    try {
      const timeoutPromise = new Promise<{
        allowsAddons: boolean | null
        allowsNotes: boolean | null
        adicionais: Adicional[]
        loadError?: boolean
      }>((resolve) => {
        timeoutId = setTimeout(() => {
          resolve({ allowsAddons: null, allowsNotes: null, adicionais: [], loadError: true })
        }, 8000)
      })

      const fetchPromise = (async (): Promise<{
        allowsAddons: boolean | null
        allowsNotes: boolean | null
        adicionais: Adicional[]
        loadError?: boolean
      }> => {
        try {
          const supabase = createBrowserClient()
          let row: any = null
          const { data, error } = await supabase
            .from("products")
            .select(
              "id, category, category_id, categories ( allows_addons, allows_notes ), product_adicionais ( adicional_id, adicionais (*) )"
            )
            .eq("id", trimmedId)
            .maybeSingle()

          if (error) {
            const { data: retryData, error: retryError } = await supabase
              .from("products")
              .select("id, category, product_adicionais ( adicional_id, adicionais (*) )")
              .eq("id", trimmedId)
              .maybeSingle()

            if (retryError) {
              console.warn("[AdicionaisManager] Falha ao buscar adicionais do produto:", retryError.message)
              return { allowsAddons: null, allowsNotes: null, adicionais: [], loadError: true }
            }
            row = retryData
          } else {
            row = data
          }

          if (!row) {
            return { allowsAddons: null, allowsNotes: null, adicionais: [] }
          }

          const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories
          let allowsAddons: boolean | null =
            typeof cat?.allows_addons === "boolean" ? cat.allows_addons : null
          let allowsNotes: boolean | null =
            typeof cat?.allows_notes === "boolean" ? cat.allows_notes : null

          if (
            (allowsAddons === null || allowsNotes === null) &&
            typeof row.category === "string" &&
            row.category.trim() !== ""
          ) {
            const slug = normalizeLegacyCategorySlug(row.category)
            if (slug) {
              const { data: catRow, error: catErr } = await supabase
                .from("categories")
                .select("allows_addons, allows_notes")
                .eq("slug", slug)
                .maybeSingle()
              if (!catErr && catRow) {
                if (allowsAddons === null && typeof (catRow as any).allows_addons === "boolean") {
                  allowsAddons = (catRow as any).allows_addons
                }
                if (allowsNotes === null && typeof (catRow as any).allows_notes === "boolean") {
                  allowsNotes = (catRow as any).allows_notes
                }
              }
            }
          }

          if (allowsAddons === false) {
            return { allowsAddons: false, allowsNotes, adicionais: [] }
          }

          const seen = new Set<string>()
          const adicionais: Adicional[] = (row.product_adicionais || [])
            .map((pa: any) => (Array.isArray(pa?.adicionais) ? pa.adicionais[0] : pa?.adicionais))
            .filter((a: any) => a && a.available !== false)
            .filter((a: any) => {
              const id = String(a.id)
              if (seen.has(id)) return false
              seen.add(id)
              return true
            })
            .map((a: any) => ({
              id: String(a.id),
              name: String(a.name),
              price: Number(a.price) || 0,
              available: a.available,
              adicional_categoria: a.adicional_categoria ?? null,
              category: a.category ?? null,
            }))
            .sort((a: Adicional, b: Adicional) => a.name.localeCompare(b.name, "pt-BR"))

          return { allowsAddons, allowsNotes, adicionais }
        } catch (error) {
          console.warn("[AdicionaisManager] Falha no getAdicionaisByProductId:", error)
          return { allowsAddons: null, allowsNotes: null, adicionais: [], loadError: true }
        }
      })()

      return await Promise.race([fetchPromise, timeoutPromise])
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }

  async addAdicional(adicional: Omit<Adicional, "id">): Promise<Adicional | null> {
    try {
      const apiRes = await callAdminAdicionalApi<{ adicional: Adicional }>({
        action: "createAdicional",
        adicional: {
          name: adicional.name,
          price: adicional.price,
          available: adicional.available ?? true,
          adicional_categoria: adicional.adicional_categoria ?? null,
          category: adicional.category ?? null,
        },
      })
      if (apiRes?.adicional) return apiRes.adicional

      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("adicionais")
        .insert([{
          name: adicional.name,
          price: adicional.price,
          available: adicional.available ?? true,
          ...(adicional.adicional_categoria ? { adicional_categoria: adicional.adicional_categoria } : {}),
        }])
        .select()
        .single()

      if (error) {
        appToast.error("Erro ao salvar", error.message)
        return null
      }

      return data
    } catch (error: any) {
      appToast.error("Erro ao salvar adicional", error?.message || "Erro inesperado")
      return null
    }
  }

  async updateAdicional(id: string, updates: Partial<Adicional>): Promise<Adicional | null> {
    try {
      const { id: _, ...dataToUpdate } = updates as any
      const apiRes = await callAdminAdicionalApi<{ adicional: Adicional }>({
        action: "updateAdicional",
        adicionalId: id,
        updates: dataToUpdate,
      })
      if (apiRes?.adicional) return apiRes.adicional

      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from("adicionais")
        .update(dataToUpdate)
        .eq("id", id)
        .select()
        .single()

      if (error) {
        appToast.error("Erro ao atualizar adicional", error.message)
        return null
      }
      return data
    } catch (error: any) {
      appToast.error("Erro ao atualizar adicional", error?.message || "Erro inesperado")
      return null
    }
  }

  async deleteAdicional(id: string): Promise<boolean> {
    try {
      const apiRes = await callAdminAdicionalApi<{ deleted: boolean }>({
        action: "deleteAdicional",
        adicionalId: id,
      })
      if (apiRes?.deleted) return true

      const supabase = createBrowserClient()
      const { error: relErr } = await supabase
        .from("product_adicionais")
        .delete()
        .eq("adicional_id", id)

      if (relErr) {
        appToast.error("Erro ao desvincular adicional", relErr.message)
        return false
      }

      const { error } = await supabase
        .from("adicionais")
        .delete()
        .eq("id", id)

      if (error) {
        appToast.error("Erro ao excluir adicional", error.message)
        return false
      }
      return true
    } catch (error: any) {
      appToast.error("Erro ao excluir adicional", error?.message || "Erro inesperado")
      return false
    }
  }

  private getDefaultAdicionais(): Adicional[] {
    return [
      { id: "1", name: "Requeijão Scala Catupiry", price: 4.0 },
      { id: "2", name: "Cheddar", price: 4.0 },
      { id: "3", name: "Mussarela", price: 4.0 },
      { id: "4", name: "Bacon", price: 3.0 },
      { id: "5", name: "Calabresa", price: 3.0 },
    ]
  }
}

export const adicionaisManager = new AdicionaisManagerClient()
