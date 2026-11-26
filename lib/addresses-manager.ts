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
      if (!client || !address.user_id) return null;

      const { count, error: countError } = await client
        .from("addresses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", address.user_id);

      if (countError) throw countError;

      const hasExistingAddresses = (count ?? 0) > 0;
      const shouldBeDefault = address.is_default === true || !hasExistingAddresses;

      const { data, error } = await client
        .from("addresses")
        .insert([{ ...address, is_default: shouldBeDefault }])
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

      let userId = updates.user_id;
      if (!userId) {
        const { data: userData } = await client.auth.getUser();
        userId = userData?.user?.id;
      }

      const { id: _id, user_id: _userId, ...safeUpdates } = updates;
      const payload: Partial<Address> = { ...safeUpdates };

      if (Object.keys(payload).length === 0) {
        let selectQuery = client.from("addresses").select("*").eq("id", id);
        if (userId) selectQuery = selectQuery.eq("user_id", userId);
        const { data, error } = await selectQuery.single();
        if (error) throw error;
        return data;
      }

      let updateQuery = client
        .from("addresses")
        .update(payload)
        .eq("id", id);
      if (userId) updateQuery = updateQuery.eq("user_id", userId);

      const { data, error } = await updateQuery
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("[AddressesManager] Erro ao atualizar endereço:", error.message || error);
      return null;
    }
  }

  async deleteAddress(id: string, userId?: string): Promise<boolean> {
    try {
      const client = this.supabase;
      if (!client) return false;

      let resolvedUserId = userId;
      if (!resolvedUserId) {
        const { data: userData, error: authError } = await client.auth.getUser();
        if (authError) throw authError;
        resolvedUserId = userData?.user?.id;
      }

      if (!resolvedUserId) {
        console.error("[AddressesManager] Usuário não autenticado ao deletar endereço.");
        return false;
      }

      const { error } = await client
        .from("addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", resolvedUserId);

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
      if (!client || !userId) return false;

      const { data, error } = await client
        .from("addresses")
        .update({ is_default: true })
        .eq("id", addressId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      return Boolean(data?.id);
    } catch (error: any) {
      console.error("[AddressesManager] Erro ao definir padrão:", error.message || error);
      return false;
    }
  }
}

export const addressesManager = new AddressesManager()
