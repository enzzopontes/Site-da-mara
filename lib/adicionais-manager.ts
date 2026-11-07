'use client'

import { appToast } from "@/lib/app-toast"

import { createBrowserClient } from "./supabase/client"

export interface Adicional {
  id: string
  name: string
  price: number
  available?: boolean
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
      return data || []
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
      return data || []
    } catch (error) {
      console.error("[AdicionaisManager] Falha no getAllAdicionais:", error)
      throw error
    }
  }

  async addAdicional(adicional: Omit<Adicional, "id">): Promise<Adicional | null> {
    console.log("--- TENTANDO ADICIONAR NOVO ADICIONAL ---")
    console.log("Dados recebidos:", adicional)
    
    try {
      const supabase = createBrowserClient()
      
      // Tentativa de inserção
      const { data, error, status, statusText } = await supabase
        .from("adicionais")
        .insert([{
          name: adicional.name,
          price: adicional.price,
          available: adicional.available ?? true
        }])
        .select()
        .single()

      if (error) {
        console.error("❌ ERRO NO SUPABASE AO ADICIONAR:")
        console.error("Mensagem:", error.message)
        console.error("Status HTTP:", status)
        console.error("Status Text:", statusText)
        appToast.error("Erro ao salvar", error.message)
        return null
      }

      console.log("✅ SUCESSO AO ADICIONAR:", data)
      return data
    } catch (error: any) {
      console.error("❌ ERRO INESPERADO AO ADICIONAR:", error)
      appToast.error("Erro inesperado", error.message)
      return null
    }
  }

  async updateAdicional(id: string, updates: Partial<Adicional>): Promise<Adicional | null> {
    try {
      const supabase = createBrowserClient()
      const { id: _, ...dataToUpdate } = updates as any
      const { data, error } = await supabase
        .from("adicionais")
        .update(dataToUpdate)
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("[Supabase] Erro ao atualizar:", error.message)
        return null
      }
      return data
    } catch (error) {
      return null
    }
  }

  async deleteAdicional(id: string): Promise<boolean> {
    try {
      const supabase = createBrowserClient()
      
      // Primeiro removemos os vínculos na tabela product_adicionais
      await supabase
        .from("product_adicionais")
        .delete()
        .eq("adicional_id", id)

      // Depois deletamos o adicional
      const { error } = await supabase
        .from("adicionais")
        .delete()
        .eq("id", id)

      if (error) {
        console.error("[Supabase] Erro ao deletar adicional:", error.message)
        return false
      }
      return true
    } catch (error) {
      console.error("[Supabase] Erro inesperado ao deletar adicional:", error)
      return false
    }
  }

  private getDefaultAdicionais(): Adicional[] {
    return [
      { id: "1", name: "Catupiry", price: 4.0 },
      { id: "2", name: "Cheddar", price: 3.5 },
      { id: "3", name: "Bacon", price: 5.0 },
      { id: "4", name: "Calabresa", price: 4.0 },
      { id: "5", name: "Frango Desfiado", price: 5.0 },
    ]
  }
}

export const adicionaisManager = new AdicionaisManagerClient()
