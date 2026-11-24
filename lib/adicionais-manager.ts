'use client'

import { appToast } from "@/lib/app-toast"

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
  if (res.status === 404) return null

  let json: any = null
  try {
    json = await res.json()
  } catch {}
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
