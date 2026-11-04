"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X, MapPin, Plus, Check, Trash2, Loader2, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addressesManager, type Address } from "@/lib/addresses-manager"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { AddressModalSkeleton } from "@/components/skeletons/address-skeleton"

interface AddressModalProps {
  isOpen: boolean
  onClose: () => void
  onAddressSelect?: (address: Address) => void
}

const GUEST_STORAGE_KEY = "batata_top_guest_address"

export function AddressModal({ isOpen, onClose, onAddressSelect }: AddressModalProps) {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  
  // Estados do formulário
  const [cep, setCep] = useState("")
  const [rua, setRua] = useState("")
  const [numero, setNumero] = useState("")
  const [complemento, setComplemento] = useState("")
  const [bairro, setBairro] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [naoSeiCep, setNaoSeiCep] = useState(false)

  useEffect(() => {
    if (!isOpen || authLoading) return
    loadAddresses()
  }, [isOpen, user, authLoading])

  const loadAddresses = async () => {
    setLoading(true)
    try {
      if (user) {
        const data = await addressesManager.getUserAddresses(user.id)
        setAddresses(data)
      } else {
        const raw = typeof window !== "undefined" ? localStorage.getItem(GUEST_STORAGE_KEY) : null
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            if (parsed?.street && parsed?.number) {
              setAddresses([{
                id: parsed.id || "guest-default",
                user_id: "guest",
                street: parsed.street,
                number: parsed.number,
                complement: parsed.complement || "",
                neighborhood: parsed.neighborhood || "",
                city: parsed.city || "Iacanga",
                state: parsed.state || "SP",
                cep: parsed.cep || "17150-000",
                is_default: true,
              }])
            } else {
              setAddresses([])
            }
          } catch {
            setAddresses([])
          }
        } else {
          setAddresses([])
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCepChange = async (value: string) => {
    const formatted = value.replace(/\D/g, "").replace(/(\d{5})(\d)/, "$1-$2").substring(0, 9)
    setCep(formatted)

    if (formatted.replace(/\D/g, "").length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${formatted.replace(/\D/g, "")}/json/`)
        const data = await response.json()
        
        if (data.erro) {
          toast({
            title: "CEP não encontrado",
            description: "Por favor, verifique o número digitado.",
            variant: "destructive",
          })
          return
        }

        // Validação de cidade (Iacanga)
        if (data.localidade.toLowerCase() !== "iacanga") {
          toast({
            title: "Fora da área de entrega",
            description: `Desculpe, entregamos apenas em Iacanga. O CEP informado pertence a ${data.localidade}/${data.uf}.`,
            variant: "destructive",
          })
          resetForm()
          return
        }

        setRua(data.logradouro || "")
        setBairro(data.bairro || "")
      } catch (error) {
        console.error("Erro ao buscar CEP:", error)
      }
    }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (user) {
        const newAddress = await addressesManager.addAddress({
          user_id: user.id,
          street: rua,
          number: numero,
          complement: complemento,
          neighborhood: bairro,
          city: "Iacanga",
          state: "SP",
          cep: cep,
          is_default: addresses.length === 0 // Primeiro endereço vira padrão
        })

        if (newAddress) {
          await loadAddresses()
          window.dispatchEvent(new Event("address-changed"))
          onAddressSelect?.(newAddress)
          setShowAddForm(false)
          resetForm()
        }
      } else {
        const guestAddress: Address = {
          id: "guest-default",
          user_id: "guest",
          street: rua,
          number: numero,
          complement: complemento,
          neighborhood: bairro,
          city: "Iacanga",
          state: "SP",
          cep: cep || "17150-000",
          is_default: true,
        }
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestAddress))
        setAddresses([guestAddress])
        window.dispatchEvent(new Event("address-changed"))
        onAddressSelect?.(guestAddress)
        setShowAddForm(false)
        resetForm()
        toast({
          title: "Endereço salvo",
          description: "Seu endereço de entrega em Iacanga foi atualizado.",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setCep("")
    setRua("")
    setNumero("")
    setComplemento("")
    setBairro("")
    setNaoSeiCep(false)
  }

  const handleSelectDefault = async (addressId: string) => {
    const selected = addresses.find((a) => a.id === addressId)
    if (!user) {
      if (selected) {
        onAddressSelect?.(selected)
        window.dispatchEvent(new Event("address-changed"))
      }
      onClose()
      return
    }
    await addressesManager.setDefaultAddress(user.id, addressId)
    await loadAddresses()
    if (selected) onAddressSelect?.(selected)
    // Dispara evento para o Header atualizar
    window.dispatchEvent(new Event("address-changed"))
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    // Usando um confirm simples, mas poderíamos usar um modal customizado se necessário.
    // Para manter a agilidade, vamos manter o confirm mas adicionar um toast após a exclusão.
    if (confirm("Deseja excluir este endereço?")) {
      if (user) {
        await addressesManager.deleteAddress(id)
        await loadAddresses()
      } else {
        localStorage.removeItem(GUEST_STORAGE_KEY)
        setAddresses([])
      }
      window.dispatchEvent(new Event("address-changed"))
      toast({
        title: "Endereço excluído",
        description: "O endereço foi removido com sucesso.",
      })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#ECE7E0] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* HEADER DO MODAL */}
        <div className="p-6 border-b border-[#ECE7E0] flex items-center justify-between bg-[#F7F5F0]">
          <h2 className="text-lg sm:text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#E3A008] shrink-0" />
            Onde você quer receber seu pedido?
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-2 hover:bg-[#ECE7E0] rounded-full transition-all active:scale-[0.98]"
          >
            <X className="h-5 w-5 text-[#717171]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showAddForm ? (
            <div className="space-y-4">
              {/* LISTA DE ENDEREÇOS */}
              {loading ? (
                <AddressModalSkeleton />
              ) : addresses.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-[#717171] uppercase tracking-wider">
                    {user ? "Meus Endereços" : "Endereço Salvo"}
                  </p>
                  {addresses.map((addr) => (
                    <div 
                      key={addr.id}
                      onClick={() => handleSelectDefault(addr.id)}
                      className={`group relative p-4 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                        addr.is_default 
                        ? "border-[#E3A008] bg-[#E3A008]/10" 
                        : "border-[#ECE7E0] hover:border-[#E3A008]/50 hover:bg-[#F7F5F0]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 p-2 rounded-full ${addr.is_default ? "bg-[#E3A008] text-[#1A1A1A]" : "bg-[#F7F5F0] text-[#717171]"}`}>
                          <MapPin className="h-4 w-4" />
                        </div>
                        <div className="flex-1 pr-8">
                          <p className="font-bold text-[#1A1A1A]">{addr.street}, {addr.number}</p>
                          <p className="text-sm text-[#717171]">{addr.neighborhood} - {addr.city}/{addr.state}</p>
                          {addr.complement && <p className="text-xs text-[#717171] mt-1 italic">{addr.complement}</p>}
                        </div>
                        {addr.is_default && (
                          <div className="absolute top-4 right-4">
                            <Check className="h-5 w-5 text-[#E3A008]" />
                          </div>
                        )}
                        <button 
                          onClick={(e) => handleDelete(e, addr.id)}
                          aria-label="Excluir endereço"
                          className="absolute bottom-4 right-4 p-2 text-[#717171] hover:text-[#D92D20] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all active:scale-[0.98]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-[#F7F5F0] border border-[#ECE7E0] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="h-8 w-8 text-[#E3A008]" />
                  </div>
                  <p className="text-[#1A1A1A] font-semibold">Você ainda não informou seu endereço.</p>
                  <p className="text-xs text-[#717171] mt-1">Informe onde deseja receber seu pedido em Iacanga.</p>
                </div>
              )}

              {/* BOTÃO ADICIONAR NOVO */}
              <Button 
                onClick={() => setShowAddForm(true)}
                variant="outline" 
                className="w-full h-14 border-dashed border-2 border-[#ECE7E0] hover:border-[#E3A008] hover:text-[#1A1A1A] hover:bg-[#F7F5F0] text-[#1A1A1A] rounded-xl flex items-center justify-center gap-2 font-bold transition-transform active:scale-[0.98]"
              >
                <Plus className="h-5 w-5 text-[#E3A008]" />
                {!user && addresses.length > 0 ? "Alterar endereço de entrega" : "Adicionar novo endereço"}
              </Button>

              {!user && (
                <div className="pt-3 border-t border-[#ECE7E0] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F7F5F0] p-4 rounded-xl">
                  <div className="text-center sm:text-left">
                    <p className="text-xs font-bold text-[#1A1A1A]">Já tem uma conta?</p>
                    <p className="text-[11px] text-[#717171]">Entre para acessar seus endereços salvos.</p>
                  </div>
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-lg bg-[#E3A008] hover:bg-[#C88B06] text-[#1A1A1A] text-xs font-bold transition-transform active:scale-[0.98] shrink-0"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    Entrar na conta
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* FORMULÁRIO DE ADIÇÃO */
            <form onSubmit={handleAddAddress} className="space-y-4 animate-in slide-in-from-right-4 duration-200">
              <div className="flex items-center gap-2 mb-6">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="text-sm font-bold text-[#1A1A1A] hover:text-[#E3A008] transition-transform active:scale-[0.98]"
                >
                  ← Voltar para a lista
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#1A1A1A] font-semibold">CEP</Label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="naoSeiCep" 
                        checked={naoSeiCep} 
                        onChange={(e) => {
                          setNaoSeiCep(e.target.checked)
                          if (e.target.checked) setCep("17150-000")
                        }}
                        className="h-4 w-4 rounded border-[#ECE7E0] text-[#E3A008] focus:ring-[#E3A008]"
                      />
                      <label htmlFor="naoSeiCep" className="text-xs font-bold text-[#717171] cursor-pointer">Não sei meu CEP</label>
                    </div>
                  </div>
                  <Input 
                    value={cep} 
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000" 
                    maxLength={9}
                    required
                    disabled={naoSeiCep}
                    className={`border-[#ECE7E0] text-[#1A1A1A] ${naoSeiCep ? "bg-[#F7F5F0] text-[#717171]" : ""}`}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[#1A1A1A] font-semibold">Rua</Label>
                  <Input value={rua} onChange={(e) => setRua(e.target.value)} placeholder="Nome da rua" required className="border-[#ECE7E0] text-[#1A1A1A]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A] font-semibold">Número</Label>
                  <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex: 123" required className="border-[#ECE7E0] text-[#1A1A1A]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#1A1A1A] font-semibold">Complemento</Label>
                  <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, bloco..." className="border-[#ECE7E0] text-[#1A1A1A]" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[#1A1A1A] font-semibold">Bairro</Label>
                  <Input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Nome do bairro" required className="border-[#ECE7E0] text-[#1A1A1A]" />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-12 bg-[#E3A008] hover:bg-[#C88B06] text-[#1A1A1A] font-bold rounded-xl mt-6 transition-transform active:scale-[0.98]"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar Endereço"}
              </Button>
            </form>
          )}
        </div>

        <div className="p-4 bg-[#F7F5F0] border-t border-[#ECE7E0] text-center">
          <p className="text-[11px] text-[#717171] font-medium uppercase tracking-widest">
            Entregamos apenas em Iacanga, SP
          </p>
        </div>
      </div>
    </div>
  )
}
