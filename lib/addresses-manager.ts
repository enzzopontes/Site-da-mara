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

      if (shouldBeDefault) {
        const { error: resetError } = await client
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", address.user_id);

        if (resetError) throw resetError;
      }

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

      const { is_default, ...safeUpdates } = updates;
      let payload: Partial<Address>;

      if (is_default === true) {
        if (!userId) {
          const { data: existing, error: fetchError } = await client
            .from("addresses")
            .select("user_id")
            .eq("id", id)
            .single();

          if (fetchError) throw fetchError;
          userId = existing?.user_id;
        }

        if (!userId) {
          throw new Error("Usuário não identificado para definir endereço padrão.");
        }

        const { error: resetError } = await client
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", userId)
          .neq("id", id);

        if (resetError) throw resetError;

        payload = { ...safeUpdates, is_default: true };
      } else {
        payload = safeUpdates;
      }

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

      const { error: resetError } = await client
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId);

      if (resetError) throw resetError;

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
