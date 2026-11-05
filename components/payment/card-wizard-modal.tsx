"use client"

import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  ChevronLeft,
  AlertCircle,
  HelpCircle,
  Loader2,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { CardBrandBadge } from './card-brand-badge'
import {
  formatCardNumber,
  formatExpiry,
  formatCpf,
  detectCardBrand,
  isValidLuhn,
  isValidCpf,
  CardBrand,
} from '@/lib/mercado-pago-client'

export interface CardWizardModalProps {
  isOpen: boolean
  cardType: 'cartão de crédito' | 'cartão de débito'
  existingCardsCount: number
  addCard: (params: {
    cardNumber: string
    expirationMonth: string
    expirationYear: string
    securityCode: string
    cardholderName: string
    docNumber: string
    cardType: 'cartão de crédito' | 'cartão de débito'
    setAsDefault: boolean
    nickname?: string
  }) => Promise<{ success: boolean; error?: string; card?: any }>
  savingCard: boolean
  onClose: () => void
  onSaved: () => void
}

const BRAND_NAMES: Record<string, string> = {
  visa: 'Visa',
  master: 'Mastercard',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
}

function formatDocument(raw: string): string {
  const d = (raw || '').replace(/\D/g, '').slice(0, 14)
  if (d.length <= 11) {
    return formatCpf(d)
  }
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

async function verifyCardWithApi(bin: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3500)
    const res = await fetch(`https://data.handyapi.com/bin/${bin}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timeout)
    if (!res.ok) {
      return { valid: false, error: 'Cartão não encontrado na base de emissores bancários.' }
    }
    const data = await res.json()
    if (data.Status === 'NOT FOUND') {
      return { valid: false, error: 'Cartão inexistente ou não reconhecido pela rede bancária.' }
    }
    return { valid: true }
  } catch {
    // Timeout ou erro de rede: não bloqueia o usuário
    return { valid: true }
  }
}

function getCardNumberParts(cardNumber: string) {
  const clean = (cardNumber || '').replace(/\D/g, '').slice(0, 16)
  let typed = ''
  let placeholder = ''

  for (let i = 0; i < 16; i++) {
    const space = i > 0 && i % 4 === 0 ? ' ' : ''
    if (i < clean.length) {
      typed += space + clean[i]
    } else {
      const needSpace = (i === clean.length && space) || (i > clean.length && space)
      placeholder += (needSpace ? space : '') + '0'
    }
  }

  return { typed, placeholder }
}

export function CardWizardModal({
  isOpen,
  cardType,
  existingCardsCount,
  addCard,
  savingCard,
  onClose,
  onSaved,
}: CardWizardModalProps) {
  const [step, setStep] = useState<number>(1)
  const [cvvPhase, setCvvPhase] = useState<'expiry' | 'cvv'>('expiry')

  const [cardNumber, setCardNumber] = useState('')
  const [cardholderName, setCardholderName] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [nickname, setNickname] = useState('')

  const [stepError, setStepError] = useState<string | null>(null)
  const [validatingCard, setValidatingCard] = useState(false)
  const [showCvvHelp, setShowCvvHelp] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const detectedBrand = detectCardBrand(cardNumber)
  const typeLabel = cardType === 'cartão de débito' ? 'DÉBITO' : 'CRÉDITO'
  const isFlipped = step === 3 && cvvPhase === 'cvv'
  const isLastStep = step === 5

  // Auto-focus no campo quando muda o step
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [step, cvvPhase, isOpen])

  // Esc listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  function resetForm() {
    setStep(1)
    setCvvPhase('expiry')
    setCardNumber('')
    setCardholderName('')
    setExpiry('')
    setCvv('')
    setDocNumber('')
    setNickname('')
    setStepError(null)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  function handleBack() {
    setStepError(null)
    if (step === 3 && cvvPhase === 'cvv') {
      setCvvPhase('expiry')
      return
    }
    if (step === 1) {
      handleClose()
      return
    }
    setStep((prev) => prev - 1)
  }

  async function handleNext() {
    setStepError(null)

    if (step === 1) {
      const clean = cardNumber.replace(/\D/g, '')
      if (clean.length < 13 || clean.length > 19) {
        return setStepError('Número do cartão inválido. Verifique a quantidade de dígitos.')
      }
      if (/^(\d)\1+$/.test(clean)) {
        return setStepError('Número do cartão inválido.')
      }
      if (!isValidLuhn(clean)) {
        return setStepError('Número do cartão inválido. Verifique os dígitos digitados.')
      }
      if (!detectedBrand) {
        return setStepError('Bandeira do cartão não reconhecida ou não suportada.')
      }

      setValidatingCard(true)
      try {
        const apiCheck = await verifyCardWithApi(clean.slice(0, 6))
        if (!apiCheck.valid) {
          setValidatingCard(false)
          return setStepError(apiCheck.error || 'Cartão não encontrado na base de emissores bancários.')
        }
      } catch {
        // Ignora erro de rede
      } finally {
        setValidatingCard(false)
      }

      setStep(2)
      return
    }

    if (step === 2) {
      if (!cardholderName.trim()) {
        return setStepError('Informe o nome completo impresso no cartão.')
      }
      if (cardholderName.trim().length < 3) {
        return setStepError('O nome impresso deve ter pelo menos 3 caracteres.')
      }
      setStep(3)
      setCvvPhase('expiry')
      return
    }

    if (step === 3 && cvvPhase === 'expiry') {
      const [month, year] = expiry.split('/')
      const monthNum = Number(month)
      const yearNum = Number(year)
      const currentYear = new Date().getFullYear() % 100
      const currentMonth = new Date().getMonth() + 1

      if (!month || !year || month.length !== 2 || year.length !== 2 || monthNum < 1 || monthNum > 12) {
        return setStepError('Validade inválida. Use o formato MM/AA.')
      }

      if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
        return setStepError('Este cartão já está vencido.')
      }

      setCvvPhase('cvv')
      return
    }

    if (step === 3 && cvvPhase === 'cvv') {
      const cleanCvv = cvv.replace(/\D/g, '')
      if (cleanCvv.length < 3 || cleanCvv.length > 4) {
        return setStepError('CVV inválido. Informe os 3 ou 4 dígitos.')
      }
      setStep(4)
      return
    }

    if (step === 4) {
      const cleanDoc = docNumber.replace(/\D/g, '')
      if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
        return setStepError('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.')
      }
      if (cleanDoc.length === 11 && !isValidCpf(cleanDoc)) {
        return setStepError('CPF inválido. Verifique os números digitados.')
      }
      setStep(5)
      return
    }
  }

  async function handleSave() {
    setStepError(null)
    const [month, year] = expiry.split('/')

    const result = await addCard({
      cardNumber: cardNumber.replace(/\D/g, ''),
      expirationMonth: month,
      expirationYear: `20${year}`,
      securityCode: cvv.replace(/\D/g, ''),
      cardholderName: cardholderName.trim(),
      docNumber: docNumber.replace(/\D/g, ''),
      cardType,
      setAsDefault: existingCardsCount === 0,
      nickname: nickname.trim() || undefined,
    })

    if (!result.success) {
      setStepError(result.error || 'Não foi possível salvar o cartão. Tente novamente.')
      return
    }

    resetForm()
    onSaved()
  }

  const { typed, placeholder } = getCardNumberParts(cardNumber)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com Voltar, Título e Fechar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Voltar"
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 active:scale-95 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              {typeLabel}
            </span>
          </div>

          {/* Indicador de passos */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-6 bg-[#E3A008]'
                    : s < step
                    ? 'w-2 bg-[#E3A008]/50'
                    : 'w-2 bg-neutral-200'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 active:scale-95 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Live 3D / stylized interactive Card Preview */}
          <div className="w-full flex justify-center py-1" style={{ perspective: '1000px' }}>
            <div
              className="relative w-full max-w-[340px] aspect-[1.586/1] rounded-2xl shadow-xl transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Frente do Cartão */}
              <div
                className="absolute inset-0 bg-[#F4F4F5] border border-[#E4E4E7] rounded-[20px] p-5 text-[#18181B] flex flex-col justify-between overflow-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                {/* Topo do cartão: Bandeira/Ícone e Tipo */}
                <div className="flex items-center justify-between z-10">
                  {detectedBrand ? (
                    <CardBrandBadge brand={detectedBrand} size="lg" />
                  ) : (
                    <img
                      src="/assets/batatanacaixa.png"
                      alt=""
                      className="w-7 h-7 object-contain"
                    />
                  )}
                  <span className="text-[13px] font-semibold text-[#52525B]">
                    {cardType === 'cartão de débito' ? 'Débito' : 'Crédito'}
                  </span>
                </div>

                {/* Número do Cartão */}
                <div className="z-10 my-1">
                  <p className="font-mono text-lg sm:text-xl tracking-wider font-semibold text-[#18181B] flex items-center">
                    {typed && <span className="text-[#18181B]">{typed}</span>}
                    {placeholder && (
                      <span className="text-[#A1A1AA] font-mono">{placeholder}</span>
                    )}
                  </p>
                </div>

                {/* Rodapé do cartão: Nome e Validade */}
                <div className="flex items-end justify-between z-10">
                  <p className="text-sm text-[#52525B] truncate flex-1 mr-2">
                    {cardholderName.toUpperCase() || 'NOME DO TITULAR'}
                  </p>
                  <p className="text-sm text-[#52525B]">
                    {expiry || 'MM/AA'}
                  </p>
                </div>
              </div>

              {/* Verso do Cartão (Flip 180deg) */}
              <div
                className="absolute inset-0 bg-[#F4F4F5] border border-[#E4E4E7] rounded-[20px] text-[#18181B] flex flex-col justify-start overflow-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                {/* Tarja magnética */}
                <div className="w-full h-11 bg-[#27272A] mt-5" />

                {/* Faixa branca de assinatura e CVV */}
                <div className="px-4 mt-4">
                  <div className="flex items-center justify-end bg-white rounded-md h-[34px] px-3">
                    <span className="font-mono text-sm text-[#18181B] font-semibold">
                      {cvv || '000'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Banner de Erro */}
          {stepError && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm animate-in fade-in duration-150">
              <AlertCircle size={17} className="shrink-0 mt-0.5 text-red-600" />
              <p className="leading-snug">{stepError}</p>
            </div>
          )}

          {/* Campos do Passo Atual */}
          <div className="space-y-4 pt-1">
            {step === 1 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700">
                  Número do cartão
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    className="w-full h-12 px-4 rounded-xl border border-neutral-300 focus:border-[#E3A008] focus:ring-2 focus:ring-[#E3A008]/20 outline-none font-mono text-base tracking-wider text-neutral-900 transition-all placeholder:text-neutral-400 placeholder:font-sans"
                  />
                  {detectedBrand && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CardBrandBadge brand={detectedBrand} size="sm" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-neutral-500">
                  Aceitamos Visa, Mastercard, Elo, Amex e Hipercard.
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700">
                  Nome igual a do cartão
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder="Nome igual a do cartão"
                  className="w-full h-12 px-4 rounded-xl border border-neutral-300 focus:border-[#E3A008] focus:ring-2 focus:ring-[#E3A008]/20 outline-none text-base uppercase text-neutral-900 transition-all placeholder:text-neutral-400 placeholder:normal-case"
                />
                <p className="text-[11px] text-neutral-500">
                  Digite exatamente como está gravado no plástico do cartão.
                </p>
              </div>
            )}

            {step === 3 && cvvPhase === 'expiry' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700">
                  Data de validade
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder="MM/AA"
                  maxLength={5}
                  className="w-full h-12 px-4 rounded-xl border border-neutral-300 focus:border-[#E3A008] focus:ring-2 focus:ring-[#E3A008]/20 outline-none font-mono text-base tracking-widest text-neutral-900 transition-all placeholder:text-neutral-400 placeholder:font-sans"
                />
                <p className="text-[11px] text-neutral-500">
                  Mês e ano de vencimento (2 dígitos cada).
                </p>
              </div>
            )}

            {step === 3 && cvvPhase === 'cvv' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-700">
                    Código de segurança (CVV)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCvvHelp(!showCvvHelp)}
                    className="flex items-center gap-1 text-[11px] text-[#E3A008] font-semibold hover:underline"
                  >
                    <HelpCircle size={13} />
                    O que é isso?
                  </button>
                </div>

                {showCvvHelp && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-neutral-700 text-xs leading-relaxed animate-in fade-in duration-150">
                    O CVV são os 3 ou 4 dígitos localizados no verso do cartão, ao lado da faixa magnética.
                  </div>
                )}

                <input
                  ref={inputRef}
                  type="password"
                  inputMode="numeric"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder="•••"
                  maxLength={4}
                  className="w-full h-12 px-4 rounded-xl border border-neutral-300 focus:border-[#E3A008] focus:ring-2 focus:ring-[#E3A008]/20 outline-none font-mono text-base tracking-widest text-neutral-900 transition-all placeholder:text-neutral-400"
                />
                <p className="text-[11px] text-neutral-500">
                  Código de 3 dígitos (ou 4 para Amex).
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700">
                  CPF/CNPJ do titular do cartão
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={docNumber}
                  onChange={(e) => setDocNumber(formatDocument(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  placeholder="000.000.000-00"
                  maxLength={18}
                  className="w-full h-12 px-4 rounded-xl border border-neutral-300 focus:border-[#E3A008] focus:ring-2 focus:ring-[#E3A008]/20 outline-none font-mono text-base tracking-wider text-neutral-900 transition-all placeholder:text-neutral-400 placeholder:font-sans"
                />
                <p className="text-[11px] text-neutral-500">
                  Necessário para autenticação antifraude da operadora do cartão.
                </p>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700">
                  Apelido do cartão (opcional)
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="Ex: Cartão do trabalho"
                  maxLength={30}
                  className="w-full h-12 px-4 rounded-xl border border-neutral-300 focus:border-[#E3A008] focus:ring-2 focus:ring-[#E3A008]/20 outline-none text-sm text-neutral-900 transition-all placeholder:text-neutral-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 bg-neutral-50/50 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={savingCard || validatingCard}
              className="px-4 py-3 rounded-xl border border-neutral-300 text-neutral-700 text-sm font-semibold hover:bg-neutral-100 active:scale-95 transition-all disabled:opacity-50"
            >
              Anterior
            </button>
          )}

          <button
            type="button"
            onClick={isLastStep ? handleSave : handleNext}
            disabled={savingCard || validatingCard}
            className="flex-1 py-3 px-5 rounded-xl bg-[#E3A008] hover:bg-[#c98d07] active:bg-[#b07b06] text-white text-sm font-bold shadow-md shadow-[#E3A008]/20 flex items-center justify-center gap-2 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {savingCard || validatingCard ? (
              <>
                <Loader2 size={18} className="animate-spin text-white" />
                <span>{validatingCard ? 'Verificando cartão...' : 'Salvando cartão...'}</span>
              </>
            ) : isLastStep ? (
              <>
                <Check size={18} />
                <span>Salvar Cartão</span>
              </>
            ) : (
              <span>Próximo</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CardWizardModal
