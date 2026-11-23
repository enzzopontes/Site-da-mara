import { createBrowserClient } from "./supabase/client"

export interface Address {
  id: string
  user_id: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  cep: string
  is_default: boolean
  label?: "casa" | "trabalho" | null
  reference_point?: string | null
  latitude?: number | null
  longitude?: number | null
  created_at?: string
  updated_at?: string
}

class AddressesManager {
  private _supabase: any = null;

  private get supabase() {
    if (!this._supabase) {
      try {
        this._supabase = createBrowserClient();
      } catch (e) {
        console.error("[AddressesManager] Erro ao inicializar cliente Supabase:", e);
      }
    }
    return this._supabase;
  }

  async getUserAddresses(userId: string): Promise<Address[]> {
    try {
      if (!userId) return [];
      
      const client = this.supabase;
      if (!client) return [];

      const { data, error } = await client
        .from("addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[AddressesManager] Erro Supabase:", error.message);
        return [];
      }
      
      return data || [];
    } catch (error: any) {
      console.error("[AddressesManager] Erro de rede ou conexão:", error.message || error);
      return [];
    }
  }

  async addAddress(address: Omit<Address, "id" | "created_at" | "updated_at">): Promise<Address | null> {
    try {
      const client = this.supabase;
      if (!client) return null;

      const { data, error } = await client
        .from("addresses")
        .insert([address])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("[AddressesManager] Erro ao adicionar endereço:", error.message || error);
      return null;
    }
  }

  async updateAddress(id: string, updates: Partial<Address>): Promise<Address | null> {
    try {
      const client = this.supabase;
      if (!client) return null;

      const { data, error } = await client
        .from("addresses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("[AddressesManager] Erro ao atualizar endereço:", error.message || error);
      return null;
    }
  }

  async deleteAddress(id: string): Promise<boolean> {
    try {
      const client = this.supabase;
      if (!client) return false;

      const { error } = await client
        .from("addresses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("[AddressesManager] Erro ao deletar endereço:", error.message || error);
      return false;
    }
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<boolean> {
    try {
      const client = this.supabase;
      if (!client) return false;

      await client
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId);

      const { error } = await client
        .from("addresses")
        .update({ is_default: true })
        .eq("id", addressId)
        .eq("user_id", userId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("[AddressesManager] Erro ao definir padrão:", error.message || error);
      return false;
    }
  }
}

export const addressesManager = new AddressesManager()
